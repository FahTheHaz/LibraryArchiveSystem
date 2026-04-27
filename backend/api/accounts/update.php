<?php
/**
 * update.php
 * GET  — return current user data for pre-filling the form
 * POST — validate + update only the provided fields
 * POST fields: username, email, password (all optional, only sent if changed)
 * 
 * Responses: 
 * - 200 + { success: true, message: "Account updated." }
 * - 400 Bad Request (invalid JSON, no fields to update)
 * - 422 Unprocessable Entity (validation errors)
 * - 409 Conflict (username/email already taken)
 * - 500 Internal Server Error (DB errors)
 * 
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

require_once __DIR__ . '/../../utils/auth.php';   // starts session, sets $currentUserID

$conn = new mysqli("localhost", "root", "", "las_db");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed."]);
    exit();
}

// ── GET: fetch current user data ──────────────────────────────────────────────

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    // TODO: Add fullname into teh table soon
    $stmt = $conn->prepare("SELECT userID, Username, Email FROM account WHERE UserID = ?");
    $stmt->bind_param("i", $currentUserID);
    $stmt->execute();
    $user = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    if (!$user) {
        http_response_code(404);
        echo json_encode(["error" => "User not found."]);
        exit();
    }

    echo json_encode([
        "studentID" => $user["userID"],
        "username"  => $user["Username"],
        // "fullName"  => $user["FullName"],
        "email"     => $user["Email"],
    ]);
    exit();
}

// ── POST: validate + update ───────────────────────────────────────────────────
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $body = json_decode(file_get_contents("php://input"), true);

    if (!$body) {
        http_response_code(400);
        echo json_encode(["error" => "Invalid JSON body."]);
        exit();
    }

    $fields = [];   // SQL SET fragments
    $params = [];   // values
    $types  = "";   // bind_param type string

    // Username
    if (isset($body['username'])) {
        $username = trim($body['username']);
        if (strlen($username) < 3 || strlen($username) > 50) {
            http_response_code(422);
            echo json_encode(["error" => "Username must be 3–50 characters."]);
            exit();
        }
        // Check uniqueness (excluding current user)
        $chk = $conn->prepare("SELECT UserID FROM account WHERE Username = ? AND UserID != ?");
        $chk->bind_param("si", $username, $currentUserID);
        $chk->execute();
        if ($chk->get_result()->num_rows > 0) {
            http_response_code(409);
            echo json_encode(["error" => "Username already taken."]);
            exit();
        }
        $chk->close();
        $fields[] = "Username = ?";
        $params[]  = $username;
        $types    .= "s";
    }

    // Email
    if (isset($body['email'])) {
        $email = trim($body['email']);
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            http_response_code(422);
            echo json_encode(["error" => "Invalid email address."]);
            exit();
        }
        $chk = $conn->prepare("SELECT UserID FROM account WHERE Email = ? AND UserID != ?");
        $chk->bind_param("si", $email, $currentUserID);
        $chk->execute();
        if ($chk->get_result()->num_rows > 0) {
            http_response_code(409);
            echo json_encode(["error" => "Email already in use."]);
            exit();
        }
        $chk->close();
        $fields[] = "Email = ?";
        $params[]  = $email;
        $types    .= "s";
    }

    // Password
    if (isset($body['password'])) {
        $password = $body['password'];
        if (strlen($password) < 8) {
            http_response_code(422);
            echo json_encode(["error" => "Password must be at least 8 characters."]);
            exit();
        }
        $hashed    = password_hash($password, PASSWORD_DEFAULT);
        $fields[]  = "PassHash = ?";
        $params[]  = $hashed;
        $types    .= "s";
    }

    if (empty($fields)) {
        http_response_code(400);
        echo json_encode(["error" => "No fields provided to update."]);
        exit();
    }

    $sql    = "UPDATE account SET " . implode(", ", $fields) . " WHERE UserID = ?";
    $params[] = $currentUserID;
    $types   .= "i";

    $stmt = $conn->prepare($sql);
    $stmt->bind_param($types, ...$params);

    if (!$stmt->execute()) {
        http_response_code(500);
        echo json_encode(["error" => "Update failed."]);
        exit();
    }
    $stmt->close();

    require_once __DIR__ . '/../../utils/logActivity.php';
    logActivity($conn, $currentUserID, "UPDATED ACCOUNT", "Updated fields: " . implode(", ", array_keys($body)));

    echo json_encode(["success" => true, "message" => "Account updated."]);
    exit();
}

http_response_code(405);
echo json_encode(["error" => "Method not allowed."]);
