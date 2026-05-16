<?php

// admin/users.php - Admin/Staff API for managing user accounts
/*
    GET  ?role=all      — all users
    GET  ?role=student  — students only
    GET  ?role=staff    — staff only
    GET  ?role=pending  — unverified accounts awaiting approval

    POST { userID, action: "ban"|"unban"|"verify"|"reject" }
*/

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }

require_once __DIR__ . '/../../utils/auth.php';
require_once __DIR__ . '/../../utils/logActivity.php';
require_once __DIR__ . '/../../utils/mailer.php';

// Allow admin (1) and staff (3)
if ($currentRoleID !== 1 && $currentRoleID !== 3) {
    http_response_code(403);
    echo json_encode(["error" => "Admins and staff only."]);
    exit();
}

$conn = new mysqli("localhost", "root", "", "las_db");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed."]);
    exit();
}

// ─── GET: list users 
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $role = $_GET['role'] ?? 'all';

    if ($role === 'all') {
        $result = $conn->query(
            "SELECT a.UserID, a.Email, a.Username, a.RoleID, a.Status, a.IsVerified,
                    s.AcademicYear, s.StudentID, st.Dept, st.StaffID
             FROM account a
             LEFT JOIN studentProfile s  ON a.UserID = s.UserID
             LEFT JOIN staffProfile   st ON a.UserID = st.UserID
             ORDER BY a.UserID ASC"
        );
    } elseif ($role === 'student') {
        $result = $conn->query(
            "SELECT a.UserID, a.Username, a.Email, a.RoleID, a.Status, a.IsVerified,
                    s.StudentID, s.AcademicYear
             FROM account a
             INNER JOIN studentProfile s ON a.UserID = s.UserID
             ORDER BY a.UserID ASC"
        );
    } elseif ($role === 'staff') {
        $result = $conn->query(
            "SELECT a.UserID, a.Username, a.Email, a.RoleID, a.Status, a.IsVerified,
                    st.StaffID, st.Dept
             FROM account a
             INNER JOIN staffProfile st ON a.UserID = st.UserID
             ORDER BY a.UserID ASC"
        );
    } elseif ($role === 'pending') {
        $result = $conn->query(
            "SELECT a.UserID, a.Username, a.Email, a.RoleID,
                    a.Status, a.IsVerified,
                    s.StudentID, s.AcademicYear,
                    st.StaffID, st.Dept
             FROM account a
             LEFT JOIN studentProfile s  ON a.UserID = s.UserID
             LEFT JOIN staffProfile   st ON a.UserID = st.UserID
             WHERE a.IsVerified = 0
             ORDER BY a.UserID DESC"
        );
    } else {
        http_response_code(400);
        echo json_encode(["error" => "Invalid role filter."]);
        $conn->close(); exit();
    }

    if ($result === false) {
        http_response_code(500);
        echo json_encode(["error" => "Query failed: " . $conn->error]);
        $conn->close(); exit();
    }

    $users = [];
    while ($row = $result->fetch_assoc()) { $users[] = $row; }
    $conn->close();
    echo json_encode(["users" => $users]);
    exit();
}

// ─── POST: ban / unban / verify / reject ─────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body     = json_decode(file_get_contents("php://input"), true);
    $targetID = (int)($body['userID'] ?? 0);
    $action   = $body['action'] ?? '';

    if (!$targetID || !in_array($action, ['ban', 'unban', 'verify', 'reject'], true)) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid request."]);
        exit();
    }

    if ($targetID === $currentUserID) {
        http_response_code(400);
        echo json_encode(["error" => "You cannot change your own status."]);
        exit();
    }

    // Fetch target user info for email
    $infoStmt = $conn->prepare(
        "SELECT Email, Username FROM account WHERE UserID = ? LIMIT 1"
    );
    $infoStmt->bind_param("i", $targetID);
    $infoStmt->execute();
    $targetUser = $infoStmt->get_result()->fetch_assoc();
    $infoStmt->close();

    if (!$targetUser) {
        http_response_code(404);
        echo json_encode(["error" => "User not found."]);
        $conn->close(); exit();
    }

    if ($action === 'verify') {
        // TODO: mae ke it lawa
        // Approve account: mark verified and set active
        $stmt = $conn->prepare(
            "UPDATE account SET IsVerified = 1, Status = 'active' WHERE UserID = ?"
        );
        $stmt->bind_param("i", $targetID);
        $stmt->execute();
        $stmt->close();

        // Send approval email

        $emailBody = "
<p>Hi {$targetUser['Username']},</p>
<p>Great news! Your <strong>Library Archive System</strong> account has been approved.</p>
<p>You can now log in with your username: <strong>{$targetUser['Username']}</strong></p>
<p><a href='http://localhost:5173/login'>Click here to log in</a></p>
<br>
<p>— LAS System</p>
";
        sendMail($targetUser['Email'], $targetUser['Username'], 'LAS Account Approved', $emailBody);

        logActivity($conn, $currentUserID, "ADMIN:VERIFY", "Approved account for UserID: {$targetID}");
        $conn->close();
        echo json_encode(["success" => true, "message" => "Account approved.", "status" => "active"]);
        exit();
    }

    if ($action === 'reject') {
        // Reject: delete the unverified account entirely
        $del = $conn->prepare("DELETE FROM account WHERE UserID = ? AND IsVerified = 0");
        $del->bind_param("i", $targetID);
        $del->execute();
        $affected = $del->affected_rows;
        $del->close();

        if ($affected === 0) {
            http_response_code(409);
            echo json_encode(["error" => "Account could not be rejected (may already be verified)."]);
            $conn->close(); exit();
        }

        // Notify the applicant
        $emailBody = "
<p>Hi {$targetUser['Username']},</p>
<p>We regret to inform you that your registration request for the <strong>Library Archive System</strong> could not be approved at this time.</p>
<p>If you believe this is an error, please contact the library administration.</p>
<br>
<p>— LAS System</p>
";
        sendMail($targetUser['Email'], $targetUser['Username'], 'LAS Account Registration Update', $emailBody);

        logActivity($conn, $currentUserID, "ADMIN:REJECT", "Rejected and deleted account for UserID: {$targetID}");
        $conn->close();
        echo json_encode(["success" => true, "message" => "Account rejected and removed."]);
        exit();
    }

    // ban / unban
    $newStatus = ($action === 'ban') ? 'banned' : 'active';
    $stmt = $conn->prepare("UPDATE account SET Status = ? WHERE UserID = ?");
    $stmt->bind_param("si", $newStatus, $targetID);

    if ($stmt->execute()) {
        logActivity($conn, $currentUserID, "ADMIN:" . strtoupper($action), strtoupper($action) . " USER " . $targetID);
        $conn->close();
        echo json_encode(["success" => true, "message" => "User is now " . $newStatus, "status" => $newStatus]);
    } else {
        http_response_code(500);
        echo json_encode(["error" => "Database update failed."]);
        $conn->close();
    }
    $stmt->close();
    exit();
}

http_response_code(405);
echo json_encode(["error" => "Method not allowed."]);
