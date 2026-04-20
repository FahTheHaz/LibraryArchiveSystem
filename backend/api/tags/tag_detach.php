<?php
/**
 * tags/detach.php
 *
 * Removes a tag from a file (deletes the filetags row).
 * Does NOT delete the tag itself from the tags table.
 *
 * Only the uploader of the file or an admin (RoleID = 1) may detach.
 *
 * POST /tags/detach.php
 * Body (JSON): { "tagID": 3, "fileID": 7 }
 *
 * Returns:
 *   200 { "message": "Tag detached." }
 *   400 missing fields
 *   401 not authenticated
 *   403 not the file owner or admin
 *   404 tag–file link not found
 *   405 wrong method
 */

// ─── CORS & Headers ───────────────────────────────────────────────────────────
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

// ─── Auth Guard ───────────────────────────────────────────────────────────────
require_once __DIR__ . '/../../utils/auth.php';
require_once __DIR__ . '/../../utils/logActivity.php';

// ─── DB Connection ────────────────────────────────────────────────────────────
$conn = new mysqli("localhost", "root", "", "las_db");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed."]);
    exit();
}

// ─── Parse & Validate ─────────────────────────────────────────────────────────
$body   = json_decode(file_get_contents("php://input"), true);
$tagID  = isset($body['tagID'])  ? intval($body['tagID'])  : 0;
$fileID = isset($body['fileID']) ? intval($body['fileID']) : 0;

if ($tagID <= 0 || $fileID <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "tagID and fileID are required."]);
    exit();
}

// ─── Verify the tag–file link exists ─────────────────────────────────────────
$linkStmt = $conn->prepare(
    "SELECT ft.TagID, a.UploadedBy, t.TagContent
     FROM filetags ft
     INNER JOIN archive a ON ft.FileID = a.FileID
     INNER JOIN tags t    ON ft.TagID  = t.TagID
     WHERE ft.FileID = ? AND ft.TagID = ?"
);
$linkStmt->bind_param("ii", $fileID, $tagID);
$linkStmt->execute();
$link = $linkStmt->get_result()->fetch_assoc();
$linkStmt->close();

if (!$link) {
    http_response_code(404);
    echo json_encode(["error" => "Tag is not attached to that file."]);
    exit();
}

// ─── Ownership / admin check ──────────────────────────────────────────────────
$isAdmin   = $currentRoleID === 1;
$isOwner   = (int) $link['UploadedBy'] === $currentUserID;

if (!$isAdmin && !$isOwner) {
    http_response_code(403);
    echo json_encode(["error" => "You can only detach tags from your own files."]);
    exit();
}

// ─── Detach ───────────────────────────────────────────────────────────────────
$del = $conn->prepare("DELETE FROM filetags WHERE FileID = ? AND TagID = ?");
$del->bind_param("ii", $fileID, $tagID);
$del->execute();
$del->close();

logActivity(
    $conn,
    $currentUserID,
    "TAG_DETACH",
    "Detached tag \"{$link['TagContent']}\" (TagID:{$tagID}) from FileID:{$fileID}"
);

$conn->close();

http_response_code(200);
echo json_encode(["message" => "Tag detached."]);