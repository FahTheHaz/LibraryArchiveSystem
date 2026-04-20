<?php
/**
 * tags/delete.php
 *
 * Permanently deletes a tag and all its filetags associations.
 * Admin only (RoleID = 1).
 *
 * POST /tags/delete.php
 * Body (JSON): { "tagID": 3 }
 *
 * Returns:
 *   200 { "message": "Tag deleted.", "filesAffected": N }
 *   400 missing tagID
 *   401 not authenticated
 *   403 not an admin
 *   404 tag not found
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

// ─── Admin only ───────────────────────────────────────────────────────────────
if ($currentRoleID !== 1) {
    http_response_code(403);
    echo json_encode(["error" => "Admins only."]);
    exit();
}

// ─── DB Connection ────────────────────────────────────────────────────────────
$conn = new mysqli("localhost", "root", "", "las_db");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed."]);
    exit();
}

// ─── Parse & Validate ─────────────────────────────────────────────────────────
$body  = json_decode(file_get_contents("php://input"), true);
$tagID = isset($body['tagID']) ? intval($body['tagID']) : 0;

if ($tagID <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "tagID is required."]);
    exit();
}

// ─── Verify tag exists ────────────────────────────────────────────────────────
$tagStmt = $conn->prepare("SELECT TagContent FROM tags WHERE TagID = ?");
$tagStmt->bind_param("i", $tagID);
$tagStmt->execute();
$tag = $tagStmt->get_result()->fetch_assoc();
$tagStmt->close();

if (!$tag) {
    http_response_code(404);
    echo json_encode(["error" => "Tag not found."]);
    exit();
}

$tagContent = $tag['TagContent'];

// ─── Count affected files before deleting ─────────────────────────────────────
$countStmt = $conn->prepare("SELECT COUNT(*) AS c FROM filetags WHERE TagID = ?");
$countStmt->bind_param("i", $tagID);
$countStmt->execute();
$filesAffected = (int) $countStmt->get_result()->fetch_assoc()['c'];
$countStmt->close();

// ─── Delete (filetags rows cascade if FK is set, otherwise delete manually) ───
$conn->begin_transaction();

try {
    // Remove all file associations first
    $delLinks = $conn->prepare("DELETE FROM filetags WHERE TagID = ?");
    $delLinks->bind_param("i", $tagID);
    $delLinks->execute();
    $delLinks->close();

    // Remove all votes on this tag
    $delVotes = $conn->prepare("DELETE FROM tagvotes WHERE TagID = ?");
    $delVotes->bind_param("i", $tagID);
    $delVotes->execute();
    $delVotes->close();

    // Delete the tag itself
    $delTag = $conn->prepare("DELETE FROM tags WHERE TagID = ?");
    $delTag->bind_param("i", $tagID);
    $delTag->execute();
    $delTag->close();

    $conn->commit();

    logActivity(
        $conn,
        $currentUserID,
        "TAG_DELETE",
        "Deleted tag \"{$tagContent}\" (TagID:{$tagID}) | {$filesAffected} file(s) affected"
    );

    http_response_code(200);
    echo json_encode([
        "message"       => "Tag \"{$tagContent}\" deleted.",
        "filesAffected" => $filesAffected,
    ]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["error" => "Delete failed: " . $e->getMessage()]);
}

$conn->close();