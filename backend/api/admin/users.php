<?php

// admin/users.php - Admin API for managing user accounts (list, ban/unban)
/*
    GET /api/admin/users.php
    - Returns a list of all users with their details.

    POST /api/admin/users.php
    - Body: { "userID": 123, "action": "ban" } or { "userID": 123, "action": "unban" }
    - Bans or unbans the specified user by updating their status.
*/
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/../../utils/auth.php';
require_once __DIR__ . '/../../utils/logActivity.php';

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
// if ($_SERVER['REQUEST_METHOD'] === 'GET') {
//     $result = $conn->query(
//         "SELECT UserID, Email, Username, RoleID, Status, IsVerified
//          FROM account
//          ORDER BY UserID ASC"
//     );
//     $users = [];
//     while ($row = $result->fetch_assoc()) {
//         $users[] = $row;
//     }
//     $conn->close();
//     echo json_encode(["users" => $users]);
//     exit();
// }

// GET all students/staff/admin

$role = isset($_GET['role']) ? $_GET['role'] : 'all';

if ($_SERVER['REQUEST_METHOD'] === 'GET' && $role === 'all') {
    $result = $conn->query(
        "SELECT 
        a.UserID, 
        a.Email, 
        a.Username, 
        a.RoleID, 
        a.Status, 
        a.IsVerified,
        s.AcademicYear,
        s.StudentID,
        st.Dept,
        st.StaffID
        FROM account a
        LEFT JOIN studentProfile s ON a.UserID = s.UserID
        LEFT JOIN staffProfile st ON a.UserID = st.UserID
        ORDER BY a.UserID ASC;"
    );
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    $conn->close();
    echo json_encode(["users" => $users]);
    exit();
}

// Get all students
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $role === 'student') {
    $result = $conn->query(
        "SELECT a.UserID, a.FullName, a.Username, a.Email, a.RoleID, a.Status, a.IsVerified,
                s.StudentID, s.AcademicYear, s.Course
         FROM account a
         INNER JOIN studentProfile s ON a.UserID = s.UserID
         ORDER BY a.UserID ASC"
    );
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    $conn->close();
    echo json_encode(["users" => $users]);
    exit();
}

// Get all staff
if ($_SERVER['REQUEST_METHOD'] === 'GET' && $role === 'staff') {
    $result = $conn->query(
        "SELECT a.UserID, a.FullName, a.Username, a.Email, a.RoleID, a.Status, a.IsVerified,
                st.StaffID, st.Dept
         FROM account a
         INNER JOIN staffProfile st ON a.UserID = st.UserID
         ORDER BY a.UserID ASC"
    );
    $users = [];
    while ($row = $result->fetch_assoc()) {
        $users[] = $row;
    }
    $conn->close();
    echo json_encode(["users" => $users]);
    exit();
}


// // ─── POST: ban or unban a user ────────────────────────────────────────────────
// if ($_SERVER['REQUEST_METHOD'] === 'POST') {
//     $body     = json_decode(file_get_contents("php://input"), true);
//     $targetID = (int)($body['userID'] ?? 0);
//     $action   = $body['action'] ?? '';

//     if (!$targetID || !in_array($action, ['ban', 'unban'], true)) {
//         http_response_code(400);
//         echo json_encode(["error" => "Invalid request."]);
//         exit();
//     }

//     if ($targetID === $currentUserID) {
//         http_response_code(400);
//         echo json_encode(["error" => "You cannot change your own status."]);
//         exit();
//     }

//     $newStatus = $action === 'ban' ? 'inactive' : 'active';
    
//     $stmt = $conn->prepare("UPDATE account SET Status = ? WHERE UserID = ?");
//     $stmt->bind_param("si", $newStatus, $targetID);
//     $stmt->execute();
//     $stmt->close();
//     $conn->close();
//     echo json_encode(["message" => "User status updated.", "status" => $newStatus]);
//     logActivity($conn, $currentUserID, "ADMIN:BAN" ,"BANNED USER" . $targetID);
//     exit();
// }

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body     = json_decode(file_get_contents("php://input"), true);
    $targetID = (int)($body['userID'] ?? 0);
    $action   = $body['action'] ?? ''; 
    // From button click ('ban' or 'unban')

    // 1. Validation
    if (!$targetID || !in_array($action, ['ban', 'unban'], true)) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid request."]);
        exit();
    }

    // Prevent self-sabotage lmfao
    if ($targetID === $currentUserID) {
        http_response_code(400);
        echo json_encode(["error" => "You cannot change your own status."]);
        exit();
    }

    /* logic:
       If action is 'ban', we set status to 'ban'.
       If action is 'unban', we set status to 'active'.
    */
    $newStatus = ($action === 'ban') ? 'ban' : 'active';

    // if ($action === 'ban') {
    //     $newStatus = 'ban';
    //  } else if ($action === 'unban') {
    //     $newStatus = 'active';


    
    // update db
    $stmt = $conn->prepare("UPDATE account SET Status = ? WHERE UserID = ?");
    $stmt->bind_param("si", $newStatus, $targetID);
    
    if ($stmt->execute()) {
        echo json_encode([
            "success" => true,
            "message" => "User is now " . $newStatus, 
            "status" => $newStatus
        ]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Database update failed."]);
    }

    $stmt->close();
    logActivity($conn, $currentUserID, "ADMIN:" . strtoupper($action), strtoupper($action) . " USER " . $targetID);
    //  strtoupper - capitalises words - format reasons
    

    $conn->close();


    exit();

    

}

http_response_code(405);
echo json_encode(["error" => "Method not allowed."]);

logActivity($conn, $currentUserID, "Accessed admin users API with method " . $_SERVER['REQUEST_METHOD']);
