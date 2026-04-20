<?php
/**
 * tag_create.php
 *
 * Creates a tag and optionally attaches it to a file.
 * Deduplicates by TagContent (case-insensitive) — if the tag already exists,
 * it is reused rather than duplicated.
 *
 * POST /tag_create.php
 * Body (JSON):
 *   Required: tagContent
 *   Optional: fileID  (attach the tag to this archive file)
 *
 * Returns:
 *   201 { "message": "...", "tagID": N, "attached": true|false }
 *   400 missing / invalid fields
 *   401 not authenticated
 *   404 fileID not found
 *   409 tag already attached to that file
 *   405 wrong method
 *   500 server / DB error
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
require_once __DIR__ . '/../utils/auth.php';   // sets $currentUserID, $currentRoleID
require_once __DIR__ . '/../utils/logActivity.php';

// ─── DB Connection ────────────────────────────────────────────────────────────
$conn = new mysqli("localhost", "root", "", "las_db");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed."]);
    exit();
}

// ─── Parse Body ───────────────────────────────────────────────────────────────
$body = json_decode(file_get_contents("php://input"), true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON body."]);
    exit();
}

$tagContent = isset($body['tagContent']) ? trim($body['tagContent']) : '';
$fileID     = isset($body['fileID'])     ? intval($body['fileID'])   : null;

// ─── Validate ─────────────────────────────────────────────────────────────────
if ($tagContent === '') {
    http_response_code(400);
    echo json_encode(["error" => "tagContent is required."]);
    exit();
}

if (strlen($tagContent) > 100) {
    http_response_code(400);
    echo json_encode(["error" => "tagContent must be 100 characters or fewer."]);
    exit();
}

if ($fileID !== null && $fileID <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid fileID."]);
    exit();
}

// ─── Verify fileID exists (if provided) ──────────────────────────────────────
if ($fileID !== null) {
    $fileCheck = $conn->prepare(
        "SELECT FileID FROM archive WHERE FileID = ? AND deletedAt IS NULL"
    );
    $fileCheck->bind_param("i", $fileID);
    $fileCheck->execute();
    $fileCheck->store_result();
    if ($fileCheck->num_rows === 0) {
        $fileCheck->close();
        http_response_code(404);
        echo json_encode(["error" => "File not found."]);
        exit();
    }
    $fileCheck->close();
}

// ─── Deduplicate: check if tag already exists (case-insensitive) ──────────────
$dupStmt = $conn->prepare(
    "SELECT TagID FROM tags WHERE LOWER(TagContent) = LOWER(?)"
);
$dupStmt->bind_param("s", $tagContent);
$dupStmt->execute();
$dupResult = $dupStmt->get_result();
$existingTag = $dupResult->fetch_assoc();
$dupStmt->close();

$conn->begin_transaction();

try {
    if ($existingTag) {
        // Reuse the existing tag
        $tagID    = (int) $existingTag['TagID'];
        $tagIsNew = false;
    } else {
        // Insert new tag — Helpfulness starts at 0
        $insertTag = $conn->prepare(
            "INSERT INTO tags (TagContent, Helpfulness) VALUES (?, 0)"
        );
        $insertTag->bind_param("s", $tagContent);
        $insertTag->execute();
        $tagID    = $conn->insert_id;
        $tagIsNew = true;
        $insertTag->close();
    }

    // ─── Attach to file (if fileID provided) ─────────────────────────────────
    $attached = false;

    if ($fileID !== null) {
        // Check if this tag is already on this file
        $linkCheck = $conn->prepare(
            "SELECT 1 FROM filetags WHERE FileID = ? AND TagID = ?"
        );
        $linkCheck->bind_param("ii", $fileID, $tagID);
        $linkCheck->execute();
        $linkCheck->store_result();
        $alreadyLinked = $linkCheck->num_rows > 0;
        $linkCheck->close();

        if ($alreadyLinked) {
            $conn->rollback();
            http_response_code(409);
            echo json_encode([
                "error"   => "This tag is already attached to that file.",
                "tagID"   => $tagID,
                "fileID"  => $fileID,
            ]);
            exit();
        }

        $linkStmt = $conn->prepare(
            "INSERT INTO filetags (FileID, TagID) VALUES (?, ?)"
        );
        $linkStmt->bind_param("ii", $fileID, $tagID);
        $linkStmt->execute();
        $linkStmt->close();
        $attached = true;
    }

    $conn->commit();

    // ─── Log ─────────────────────────────────────────────────────────────────
    $logDesc = $tagIsNew
        ? "Created tag: \"{$tagContent}\" (TagID: {$tagID})"
        : "Reused existing tag: \"{$tagContent}\" (TagID: {$tagID})";

    if ($attached) {
        $logDesc .= " | Attached to FileID: {$fileID}";
    }

    logActivity($conn, $currentUserID, "TAG_CREATE", $logDesc);

    // ─── Response ─────────────────────────────────────────────────────────────
    http_response_code(201);
    echo json_encode([
        "message"  => $tagIsNew ? "Tag created." : "Existing tag reused.",
        "tagID"    => $tagID,
        "tagContent" => $tagContent,
        "isNew"    => $tagIsNew,
        "attached" => $attached,
        "fileID"   => $fileID,
    ]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["error" => "Tag creation failed: " . $e->getMessage()]);
}

$conn->close();