<?php
/**
* Soft-Delete files
* Deletes a file only form the veiw of normal users
* Admins can still see the file and restore it if needed
*/

session_start();

// ─── Database Connection ───

header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: PUT, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if (!in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'POST'])) {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed. Use PUT or POST."]);
    exit();
}
$host = "localhost";
$dbname = "las_db";
$dbuser = "root";
$dbpass = "";

$conn = new mysqli($host, $dbuser, $dbpass, $dbname);
require_once __DIR__ . '/../../utils/logActivity.php';


if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed."]);
    exit();
}

$fileID = isset($_GET['id']) ? intval($_GET['id']) : 0;
// $RoleID = isset($_GET['role']) ? intval($_GET['role']) : 0; 
// For testing, pass role in query string (1 for admin, 2 for normal user)

$action = $_GET['action'] ?? 'delete';
$userID = $_SESSION['userID'] ?? null; // For logging purposes, if we have session info available
$RoleID = isset($_SESSION['roleID']) ? intval($_SESSION['roleID']) : (isset($_GET['role']) ? intval($_GET['role']) : null); // Session preferred; query param fallback for testing

// if ($fileID <= 0) {
//     http_response_code(400);
//     echo json_encode(["error" => "Invalid file ID."]);
//     exit();
// }

$checkStmt = $conn->prepare("SELECT FileID, DeletedAt FROM Archive WHERE FileID = ?");
$checkStmt->bind_param("i", $fileID);
$checkStmt->execute();
$result = $checkStmt->get_result();
$row = $result->fetch_assoc();

if ($row === null) {
    http_response_code(404);
    echo json_encode(["error" => "File not found."]);
    $checkStmt->close();
    $conn->close();
    exit();

}
$deleted = $row['DeletedAt'] !== null; // Check if the file is already soft-deleted
//elseif ($deleted) {
//     http_response_code(400);
//     echo json_encode(["error" => "File is already deleted."]);
//     $checkStmt->close();
//     $conn->close();
//     exit();
// }
$checkStmt->close();


$conn->begin_transaction();

if ($action === 'restore') {
    // Reverse the soft delete (restore a file) - only for admins
    if ($RoleID !== 1) {
        http_response_code(403);
        echo json_encode(["error" => "Unauthorized. Only admins can restore files."]);
        exit();
    } elseif (!$deleted) {
        http_response_code(400);
        echo json_encode(["error" => "File is not deleted, cannot restore."]);
        exit();
    }

    $stmt = $conn->prepare("UPDATE Archive SET DeletedAt = NULL WHERE FileID = ?");
    $stmt->bind_param("i", $fileID);
    if ($stmt->execute()) {
        echo json_encode(["message" => "File restored successfully."]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to restore file."]);
    }

    logActivity($conn, $userID, "FILE_RESTORE", "File restored: {$fileID}");

    $stmt->close();
    $conn->commit();
} elseif ($action === 'delete') { // action is either 'restore' or 'delete' (default) or perma-delete (not now)
    // Soft delete: set DeletedAt timestamp - normal users only
    if ($RoleID === 2) {
        http_response_code(403); 
        echo json_encode(["error" => "Unauthorized. Admins cannot soft-delete files."]);
        exit();
    } elseif ($RoleID === 1 && $deleted) { // when already deleted
        http_response_code(400);
        echo json_encode(["error" => "File is already deleted."]);
        exit();
    }
    if($deleted) {
        http_response_code(400);
        echo json_encode(["error" => "File is already deleted."]);
        exit();
    }

    $stmt = $conn->prepare("UPDATE Archive SET DeletedAt = NOW() WHERE FileID = ?");
    $stmt->bind_param("i", $fileID);
    if ($stmt->execute()) {
        echo json_encode(["message" => "File soft-deleted successfully."]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Failed to delete file."]);
    }
    // TODO: log activity (who deleted what file and when) for audit purposes
    logActivity($conn, $userID, "FILE_DELETE", "File deleted: {$fileID}");
    $stmt->close();
    $conn->commit();
} else{
    http_response_code(400);
    echo json_encode(["error" => "Invalid action. Must be 'delete' or 'restore'."]);
    exit();
}
// perma delete (optional, only for admins, not implemented here)

$conn->close();

