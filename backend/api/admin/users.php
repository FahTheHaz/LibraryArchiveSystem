<?php
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/../../utils/auth.php';

if ($currentRoleID !== 1) {
    http_response_code(403);
    echo json_encode(["error" => "Admins only."]);
    exit();
}

$conn = new mysqli("localhost", "root", "", "las_db");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed."]);
    exit();
}

// ─── GET: list all users ──────────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $result = $conn->query(
        "SELECT UserID, StudentID, FullName, Email, Username, RoleID, status, IsVerified, AcademicYear, Course
         FROM account
         ORDER BY UserID ASC"
    );
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    $conn->close();
    echo json_encode(["users" => $users]);
    exit();
}

// ─── POST: ban or unban a user ────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body     = json_decode(file_get_contents("php://input"), true);
    $targetID = (int)($body['userID'] ?? 0);
    $action   = $body['action'] ?? '';

    if (!$targetID || !in_array($action, ['ban', 'unban'], true)) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid request."]);
        exit();
    }

    if ($targetID === $currentUserID) {
        http_response_code(400);
        echo json_encode(["error" => "You cannot change your own status."]);
        exit();
    }

    $newStatus = $action === 'ban' ? 'inactive' : 'active';
    $stmt = $conn->prepare("UPDATE account SET Status = ? WHERE UserID = ?");
    $stmt->bind_param("si", $newStatus, $targetID);
    $stmt->execute();
    $stmt->close();
    $conn->close();

    echo json_encode(["message" => "User status updated.", "status" => $newStatus]);
    exit();
}

http_response_code(405);
echo json_encode(["error" => "Method not allowed."]);
