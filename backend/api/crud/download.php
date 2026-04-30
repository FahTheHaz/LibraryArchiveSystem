<?php
/**
 * crud/download.php
 *
 * Serves an archive file to the authenticated user.
 *
 * GET /crud/download.php?id=5            → force-download
 * GET /crud/download.php?id=5&mode=inline → open in browser (PDFs, images)
 *
 * Returns:
 *   File stream on success
 *   401 not authenticated
 *   403 soft-deleted file (non-admins)
 *   404 file not found
 *   405 wrong method
 *   500 file missing from disk / DB error
 * 
 * 
 */
// TODO: For large files, consider using X-Sendfile with Apache/Nginx for better performance and security. This would require server config changes and is not implemented in this basic version.
// TODO: Make more user roles

// ─── No JSON header here — we're sending a file ───────────────────────────────
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header("Content-Type: application/json");
    echo json_encode(["error" => "Method not allowed. Use GET."]);
    exit();
}

// ─── Auth Guard ───────────────────────────────────────────────────────────────
require_once __DIR__ . '/../../utils/auth.php';
require_once __DIR__ . '/../../utils/logActivity.php';

// ─── DB Connection ────────────────────────────────────────────────────────────
$conn = new mysqli("localhost", "root", "", "las_db");
if ($conn->connect_error) {
    http_response_code(500);
    header("Content-Type: application/json");
    echo json_encode(["error" => "DB connection failed."]);
    exit();
}

// ─── Parameters ───────────────────────────────────────────────────────────────
$fileID = isset($_GET['id'])   ? intval($_GET['id'])        : 0;
$mode   = isset($_GET['mode']) ? trim($_GET['mode'])        : 'download'; // 'download' | 'inline'

if ($fileID <= 0) {
    http_response_code(400);
    header("Content-Type: application/json");
    echo json_encode(["error" => "A valid file ID is required."]);
    exit();
}

// ─── Fetch File Record ────────────────────────────────────────────────────────
$stmt = $conn->prepare(
    "SELECT FileID, FileType, filePath, deletedAt FROM archive WHERE FileID = ?"
);
$stmt->bind_param("i", $fileID);
$stmt->execute();
$file = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$file) {
    http_response_code(404);
    header("Content-Type: application/json");
    echo json_encode(["error" => "File not found."]);
    $conn->close();
    exit();
}

// Soft-deleted: only admins can download
if ($file['deletedAt'] !== null && $currentRoleID !== 1) {
    http_response_code(403);
    header("Content-Type: application/json");
    echo json_encode(["error" => "This file has been removed."]);
    $conn->close();
    exit();
}

// ─── Resolve & Validate Disk Path ─────────────────────────────────────────────
// filePath in DB: /uploads/papers/filename.pdf  (relative to /backend/)
$uploadsRoot = realpath(__DIR__ . '/../../uploads');
$diskPath    = realpath(__DIR__ . '/../..' . $file['filePath']);

// Guard against path traversal — resolved path must be inside uploads root
if ($diskPath === false || $uploadsRoot === false || strpos($diskPath, $uploadsRoot) !== 0) {
    http_response_code(500);
    header("Content-Type: application/json");
    echo json_encode(["error" => "File path is invalid."]);
    $conn->close();
    exit();
}

if (!is_file($diskPath)) {
    http_response_code(500);
    header("Content-Type: application/json");
    echo json_encode(["error" => "File not found on disk. It may have been moved or deleted."]);
    error_log("Download: file missing from disk — FileID {$fileID}, path: {$diskPath}");
    $conn->close();
    exit();
}

// ─── Determine Content-Type ───────────────────────────────────────────────────
$ext = strtolower(pathinfo($diskPath, PATHINFO_EXTENSION));

$mimeMap = [
    'pdf'  => 'application/pdf',
    'doc'  => 'application/msword',
    'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'jpg'  => 'image/jpeg',
    'jpeg' => 'image/jpeg',
    'png'  => 'image/png',
    'gif'  => 'image/gif',
    'webp' => 'image/webp',
    'tiff' => 'image/tiff',
];

$contentType = $mimeMap[$ext] ?? 'application/octet-stream';

// ─── Log Before Serving ───────────────────────────────────────────────────────
logActivity($conn, $currentUserID, "DOWNLOAD", "Downloaded FileID: {$fileID} ({$file['FileType']})");
$conn->close();

// ─── Stream the File ──────────────────────────────────────────────────────────
$filename     = basename($diskPath);
$disposition  = ($mode === 'inline') ? 'inline' : 'attachment';
$fileSize     = filesize($diskPath);

header("Content-Type: {$contentType}");
header("Content-Disposition: {$disposition}; filename=\"{$filename}\"");
header("Content-Length: {$fileSize}");
header("Cache-Control: private, no-cache");
header("X-Content-Type-Options: nosniff");

// Flush any buffered output before streaming
if (ob_get_level()) {
    ob_end_clean();
}

readfile($diskPath);
exit();