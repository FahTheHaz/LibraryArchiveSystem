<?php
/**
 * bulk_upload.php
 * Accepts multiple files in one POST request with optional shared metadata.
 * Admin or Staff only.
 *
 * POST multipart/form-data:
 *   files[]      — one or more file inputs
 *   fileType     — PAPER | PHOTO
 *   folderID?    — optional folder placement
 *
 * Shared PAPER metadata (all optional):
 *   subject, monthYear, season, semester, code, scanOrDigital
 *
 * Shared PHOTO metadata (all optional):
 *   dataJSON, quality, pictureDate, event, photographer
 *
 * Returns: { uploaded: [...], errors: [...] }
 */

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed. Use POST."]);
    exit();
}

require_once __DIR__ . '/../../utils/auth.php';
require_once __DIR__ . '/../../utils/logActivity.php';

if (!in_array($currentRoleID, [1, 3])) {
    http_response_code(403);
    echo json_encode(["error" => "Only admins and staff can bulk upload."]);
    exit();
}

$conn = new mysqli("localhost", "root", "", "las_db");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed."]);
    exit();
}

$fileType = isset($_POST['fileType']) ? strtoupper(trim($_POST['fileType'])) : '';
if (!in_array($fileType, ['PAPER', 'PHOTO'])) {
    http_response_code(400);
    echo json_encode(["error" => "fileType must be PAPER or PHOTO."]);
    $conn->close();
    exit();
}

$folderID = isset($_POST['folderID']) && intval($_POST['folderID']) > 0 ? intval($_POST['folderID']) : null;
$targetMethod = isset($_POST['targetMethod']) && $_POST['targetMethod'] === 'cloud' ? 'cloud' : 'local';

// Shared metadata
$sharedMeta = [];
if ($fileType === 'PAPER') {
    $sharedMeta = [
        'subject'       => trim($_POST['subject'] ?? ''),
        'monthYear'     => trim($_POST['monthYear'] ?? ''),
        'season'        => trim($_POST['season'] ?? ''),
        'semester'      => trim($_POST['semester'] ?? ''),
        'code'          => trim($_POST['code'] ?? ''),
        'scanOrDigital' => trim($_POST['scanOrDigital'] ?? ''),
    ];
    foreach ($sharedMeta as $k => $v) {
        $sharedMeta[$k] = $v === '' ? null : $v;
    }
    if ($sharedMeta['scanOrDigital'] !== null && !in_array($sharedMeta['scanOrDigital'], ['Scanned', 'Digital'])) {
        http_response_code(400);
        echo json_encode(["error" => "scanOrDigital must be 'Scanned' or 'Digital'."]);
        $conn->close();
        exit();
    }
} else {
    $dataJSONRaw = trim($_POST['dataJSON'] ?? '');
    if ($dataJSONRaw !== '') {
        json_decode($dataJSONRaw);
        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            echo json_encode(["error" => "dataJSON is not valid JSON."]);
            $conn->close();
            exit();
        }
    }
    $sharedMeta = [
        'dataJSON'     => $dataJSONRaw === '' ? null : $dataJSONRaw,
        'quality'      => trim($_POST['quality'] ?? '') ?: null,
        'pictureDate'  => trim($_POST['pictureDate'] ?? '') ?: null,
        'event'        => trim($_POST['event'] ?? '') ?: null,
        'photographer' => trim($_POST['photographer'] ?? '') ?: null,
    ];
}

// Normalise the $_FILES['files'] array (PHP's multifile structure)
if (!isset($_FILES['files'])) {
    http_response_code(400);
    echo json_encode(["error" => "No files received. Use field name 'files[]'."]);
    $conn->close();
    exit();
}

$rawFiles = $_FILES['files'];
$fileCount = is_array($rawFiles['name']) ? count($rawFiles['name']) : 1;

$files = [];
if (is_array($rawFiles['name'])) {
    for ($i = 0; $i < $fileCount; $i++) {
        $files[] = [
            'name'     => $rawFiles['name'][$i],
            'tmp_name' => $rawFiles['tmp_name'][$i],
            'error'    => $rawFiles['error'][$i],
            'size'     => $rawFiles['size'][$i],
        ];
    }
} else {
    $files[] = [
        'name'     => $rawFiles['name'],
        'tmp_name' => $rawFiles['tmp_name'],
        'error'    => $rawFiles['error'],
        'size'     => $rawFiles['size'],
    ];
}

$allowedPaper = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];
$allowedPhoto = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff'];
$maxSize      = 50 * 1024 * 1024;
$subFolder    = $fileType === 'PAPER' ? 'papers' : 'photos';
$uploadDir    = __DIR__ . "/../../uploads/{$subFolder}/";

if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

$uploaded = [];
$errors   = [];

foreach ($files as $idx => $f) {
    $label = $f['name'] ?: "file[{$idx}]";

    if ($f['error'] !== UPLOAD_ERR_OK) {
        $errors[] = ["file" => $label, "error" => "Upload error code {$f['error']}."];
        continue;
    }
    if ($f['size'] > $maxSize) {
        $errors[] = ["file" => $label, "error" => "Exceeds 50 MB limit."];
        continue;
    }

    $ext = strtolower(pathinfo($f['name'], PATHINFO_EXTENSION));
    $allowed = $fileType === 'PAPER' ? $allowedPaper : $allowedPhoto;
    if (!in_array($ext, $allowed)) {
        $errors[] = ["file" => $label, "error" => "Extension '.{$ext}' not allowed for {$fileType}."];
        continue;
    }

    $uniqueName = time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
    $destPath   = $uploadDir . $uniqueName;
    $dbPath     = "/uploads/{$subFolder}/{$uniqueName}";

    if (!move_uploaded_file($f['tmp_name'], $destPath)) {
        $errors[] = ["file" => $label, "error" => "Failed to save file to disk."];
        continue;
    }

    $conn->begin_transaction();
    try {
        $ins = $conn->prepare(
            "INSERT INTO archive (FileType, UploadedBy, filePath, folderID) VALUES (?, ?, ?, ?)"
        );
        $ins->bind_param("sisi", $fileType, $currentUserID, $dbPath, $folderID);
        $ins->execute();
        $fileID = $conn->insert_id;
        $ins->close();

        $fileName = $f['name'];  // each file gets its own original name
        if ($fileType === 'PAPER') {
            $m = $sharedMeta;
            $ms = $conn->prepare(
                "INSERT INTO papermetadata (FileID, Subject, MonthYear, Season, Semester, Code, ScanOrDigital, fileName)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $ms->bind_param("isssssss",
                $fileID, $m['subject'], $m['monthYear'], $m['season'],
                $m['semester'], $m['code'], $m['scanOrDigital'], $fileName
            );
            $ms->execute();
            $ms->close();
        } else {
            $m = $sharedMeta;
            $photoID = $fileID;
            $ms = $conn->prepare(
                "INSERT INTO photometadata (FileID, PhotoID, DataJSON, Quality, PictureDate, Event, Photographer, fileName)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
            );
            $ms->bind_param("iissssss",
                $fileID, $photoID, $m['dataJSON'], $m['quality'],
                $m['pictureDate'], $m['event'], $m['photographer'], $fileName
            );
            $ms->execute();
            $ms->close();
        }

        $qStmt = $conn->prepare(
            "INSERT INTO ProcessingQueue (FileID, Status, TargetMethod) VALUES (?, 'pending', ?)"
        );
        $qStmt->bind_param("is", $fileID, $targetMethod);
        $qStmt->execute();
        $qStmt->close();

        logActivity($conn, $currentUserID, "BULK_UPLOAD", "Bulk uploaded {$fileType}: {$f['name']}", $fileID);
        $conn->commit();
        $uploaded[] = ["file" => $label, "fileID" => $fileID, "filePath" => $dbPath];
    } catch (Exception $e) {
        $conn->rollback();
        if (file_exists($destPath)) unlink($destPath);
        $errors[] = ["file" => $label, "error" => "DB error: " . $e->getMessage()];
    }
}

$code = count($uploaded) > 0 ? 200 : 400;
http_response_code($code);
echo json_encode(["uploaded" => $uploaded, "errors" => $errors]);
$conn->close();
