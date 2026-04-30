<?php
/**
 * folders.php
 * Virtual folder tree CRUD using ID-based materialised paths.
 *
 * GET  /folders.php              → full flat list (frontend builds the tree)
 * GET  /folders.php?id=X         → single folder with its children
 * POST action=create  { folderName, parentID? }
 * POST action=rename  { folderID, newName }
 * POST action=move    { folderID, newParentID }   newParentID=0 → move to root
 * POST action=delete  { folderID }                folder must be empty
 *
 * Permissions:
 *   GET    → all authenticated users
 *   create/rename/move/delete → Admin (1) or Staff (3) only
 */

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../../utils/auth.php';
require_once __DIR__ . '/../../utils/logActivity.php';

$conn = new mysqli("localhost", "root", "", "las_db");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed."]);
    exit();
}

// ─── GET: return all folders as a flat list ────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (isset($_GET['id'])) {
        $id = intval($_GET['id']);
        $stmt = $conn->prepare(
            "SELECT folderID, folderName, pathIDString, parentID FROM Folders WHERE folderID = ?"
        );
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $folder = $stmt->get_result()->fetch_assoc();
        $stmt->close();
        if (!$folder) {
            http_response_code(404);
            echo json_encode(["error" => "Folder not found."]);
        } else {
            echo json_encode(["folder" => $folder]);
        }
    } else {
        $result = $conn->query(
            "SELECT folderID, folderName, pathIDString, parentID FROM Folders ORDER BY pathIDString"
        );
        $folders = [];
        while ($row = $result->fetch_assoc()) {
            $folders[] = $row;
        }
        echo json_encode(["folders" => $folders]);
    }
    $conn->close();
    exit();
}

// ─── POST: mutations (Admin or Staff only) ─────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed."]);
    $conn->close();
    exit();
}

if (!in_array($currentRoleID, [1, 3])) {
    http_response_code(403);
    echo json_encode(["error" => "Only admins and staff can manage folders."]);
    $conn->close();
    exit();
}

$body   = json_decode(file_get_contents("php://input"), true) ?? [];
$action = $body['action'] ?? ($_GET['action'] ?? '');

// ── Helper: fetch a folder's pathIDString ──────────────────────────────────
function getFolderPath(mysqli $conn, int $folderID): ?string {
    $s = $conn->prepare("SELECT pathIDString FROM Folders WHERE folderID = ?");
    $s->bind_param("i", $folderID);
    $s->execute();
    $row = $s->get_result()->fetch_assoc();
    $s->close();
    return $row ? $row['pathIDString'] : null;
}

// ─── CREATE ────────────────────────────────────────────────────────────────
if ($action === 'create') {
    $folderName = trim($body['folderName'] ?? '');
    $parentID   = isset($body['parentID']) && $body['parentID'] !== '' && $body['parentID'] !== null
                  ? intval($body['parentID']) : null;

    if ($folderName === '') {
        http_response_code(400);
        echo json_encode(["error" => "folderName is required."]);
        $conn->close();
        exit();
    }

    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare(
            "INSERT INTO Folders (folderName, pathIDString, parentID) VALUES (?, '', ?)"
        );
        $stmt->bind_param("si", $folderName, $parentID);
        $stmt->execute();
        $newID = $conn->insert_id;
        $stmt->close();

        // Build pathIDString now that we have the ID
        if ($parentID === null) {
            $path = "{$newID}/";
        } else {
            $parentPath = getFolderPath($conn, $parentID);
            if ($parentPath === null) {
                throw new Exception("Parent folder not found.");
            }
            $path = "{$parentPath}{$newID}/";
        }

        $upd = $conn->prepare("UPDATE Folders SET pathIDString = ? WHERE folderID = ?");
        $upd->bind_param("si", $path, $newID);
        $upd->execute();
        $upd->close();

        logActivity($conn, $currentUserID, "FOLDER_CREATE", "Created folder '{$folderName}' (ID:{$newID})");
        $conn->commit();

        http_response_code(201);
        echo json_encode([
            "message"      => "Folder created.",
            "folderID"     => $newID,
            "pathIDString" => $path,
        ]);
    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode(["error" => "Create failed: " . $e->getMessage()]);
    }
    $conn->close();
    exit();
}

// ─── RENAME ────────────────────────────────────────────────────────────────
if ($action === 'rename') {
    $folderID = intval($body['folderID'] ?? 0);
    $newName  = trim($body['newName'] ?? '');

    if ($folderID <= 0 || $newName === '') {
        http_response_code(400);
        echo json_encode(["error" => "folderID and newName are required."]);
        $conn->close();
        exit();
    }

    $conn->begin_transaction();
    try {
        $stmt = $conn->prepare("UPDATE Folders SET folderName = ? WHERE folderID = ?");
        $stmt->bind_param("si", $newName, $folderID);
        $stmt->execute();
        if ($stmt->affected_rows === 0) {
            throw new Exception("Folder not found.");
        }
        $stmt->close();

        logActivity($conn, $currentUserID, "FOLDER_RENAME", "Renamed folder ID:{$folderID} to '{$newName}'");
        $conn->commit();
        echo json_encode(["message" => "Folder renamed."]);
    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode(["error" => "Rename failed: " . $e->getMessage()]);
    }
    $conn->close();
    exit();
}

// ─── MOVE ──────────────────────────────────────────────────────────────────
if ($action === 'move') {
    $folderID    = intval($body['folderID'] ?? 0);
    $newParentID = isset($body['newParentID']) && $body['newParentID'] !== '' && intval($body['newParentID']) > 0
                   ? intval($body['newParentID']) : null;

    if ($folderID <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "folderID is required."]);
        $conn->close();
        exit();
    }
    if ($newParentID === $folderID) {
        http_response_code(400);
        echo json_encode(["error" => "Cannot move a folder into itself."]);
        $conn->close();
        exit();
    }

    $conn->begin_transaction();
    try {
        $oldPath = getFolderPath($conn, $folderID);
        if ($oldPath === null) {
            throw new Exception("Folder not found.");
        }

        // Guard: newParentID must not be a descendant of folderID
        if ($newParentID !== null) {
            $newParentPath = getFolderPath($conn, $newParentID);
            if ($newParentPath === null) {
                throw new Exception("Target parent folder not found.");
            }
            if (strpos($newParentPath, $oldPath) === 0) {
                throw new Exception("Cannot move a folder into one of its own descendants.");
            }
            $newPath = "{$newParentPath}{$folderID}/";
        } else {
            $newParentPath = null;
            $newPath = "{$folderID}/";
        }

        // Update the folder itself
        $stmt = $conn->prepare(
            "UPDATE Folders SET pathIDString = ?, parentID = ? WHERE folderID = ?"
        );
        $stmt->bind_param("sii", $newPath, $newParentID, $folderID);
        $stmt->execute();
        $stmt->close();

        // Update all descendants: replace the old path prefix with the new one
        $oldLen = strlen($oldPath);
        $descStmt = $conn->prepare(
            "SELECT folderID, pathIDString FROM Folders WHERE pathIDString LIKE ? AND folderID != ?"
        );
        $likePattern = $oldPath . '%';
        $descStmt->bind_param("si", $likePattern, $folderID);
        $descStmt->execute();
        $descendants = $descStmt->get_result()->fetch_all(MYSQLI_ASSOC);
        $descStmt->close();

        foreach ($descendants as $desc) {
            $suffix    = substr($desc['pathIDString'], $oldLen);
            $updPath   = $newPath . $suffix;
            $updStmt   = $conn->prepare("UPDATE Folders SET pathIDString = ? WHERE folderID = ?");
            $updStmt->bind_param("si", $updPath, $desc['folderID']);
            $updStmt->execute();
            $updStmt->close();
        }

        logActivity($conn, $currentUserID, "FOLDER_MOVE", "Moved folder ID:{$folderID} from '{$oldPath}' to '{$newPath}'");
        $conn->commit();
        echo json_encode(["message" => "Folder moved.", "newPath" => $newPath]);
    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(500);
        echo json_encode(["error" => "Move failed: " . $e->getMessage()]);
    }
    $conn->close();
    exit();
}

// ─── DELETE ────────────────────────────────────────────────────────────────
if ($action === 'delete') {
    $folderID = intval($body['folderID'] ?? 0);
    if ($folderID <= 0) {
        http_response_code(400);
        echo json_encode(["error" => "folderID is required."]);
        $conn->close();
        exit();
    }

    $conn->begin_transaction();
    try {
        $path = getFolderPath($conn, $folderID);
        if ($path === null) {
            throw new Exception("Folder not found.");
        }

        // Block deletion if any files (including soft-deleted) are in this folder or sub-folders
        $chkFiles = $conn->prepare(
            "SELECT COUNT(*) AS cnt FROM archive a
             JOIN Folders f ON a.folderID = f.folderID
             WHERE f.pathIDString = ? OR f.pathIDString LIKE ?"
        );
        $like = $path . '%';
        $chkFiles->bind_param("ss", $path, $like);
        $chkFiles->execute();
        $fileCount = $chkFiles->get_result()->fetch_assoc()['cnt'];
        $chkFiles->close();

        if ($fileCount > 0) {
            throw new Exception("Cannot delete: folder contains {$fileCount} file(s). Move or delete files first.");
        }

        // Block if sub-folders exist
        $chkSub = $conn->prepare(
            "SELECT COUNT(*) AS cnt FROM Folders WHERE pathIDString LIKE ? AND folderID != ?"
        );
        $chkSub->bind_param("si", $like, $folderID);
        $chkSub->execute();
        $subCount = $chkSub->get_result()->fetch_assoc()['cnt'];
        $chkSub->close();

        if ($subCount > 0) {
            throw new Exception("Cannot delete: folder has {$subCount} sub-folder(s). Remove them first.");
        }

        $del = $conn->prepare("DELETE FROM Folders WHERE folderID = ?");
        $del->bind_param("i", $folderID);
        $del->execute();
        $del->close();

        logActivity($conn, $currentUserID, "FOLDER_DELETE", "Deleted folder ID:{$folderID} path:'{$path}'");
        $conn->commit();
        echo json_encode(["message" => "Folder deleted."]);
    } catch (Exception $e) {
        $conn->rollback();
        http_response_code(409);
        echo json_encode(["error" => $e->getMessage()]);
    }
    $conn->close();
    exit();
}

http_response_code(400);
echo json_encode(["error" => "Unknown action. Use: create, rename, move, delete."]);
$conn->close();
