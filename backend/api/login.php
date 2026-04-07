<?php
/**
 * login.php
 *
 * Authenticates a user and starts a secure session.
 *
 * POST /login.php
 * Body (JSON): { "username": "...", "password": "...", "captchaToken": "..." }
 *
 * Returns:
 *   200 { "message": "Login successful", "roleID": 1 }
 *   400 missing fields
 *   401 invalid credentials
 *   405 wrong method
 */

// ─── CORS & Headers ───────────────────────────────────────────────────────────
header("Access-Control-Allow-Origin: http://localhost:5173"); // Vite dev server
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");            // required for cookies cross-origin
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

// ─── Session Config (must be set before session_start) ────────────────────────
session_set_cookie_params([
    'lifetime' => 3600,
    'path'     => '/',
    'secure'   => false,   // set to true when on HTTPS (production)
    'httponly' => true,    // JS cannot access the cookie
    'samesite' => 'Strict'
]);
session_start();

// ─── DB Connection 
$conn = new mysqli("localhost", "root", "", "las_db");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed."]);
    exit();
}

require_once __DIR__ . '/../utils/logActivity.php';

// ─── Parse Body ───────────────────────────────────────────────────────────────
$body = json_decode(file_get_contents("php://input"), true);

if (!isset($body['username'], $body['password'])) {
    http_response_code(400);
    echo json_encode(["error" => "Username and password are required."]);
    exit();
}

$username = trim($body['username']);
$password = $body['password'];

// ─── CAPTCHA Placeholder ──────────────────────────────────────────────────────
// TODO: replace this block with real reCAPTCHA v3 verification
// $captchaToken = $body['captchaToken'] ?? '';
// if (!verifyCaptcha($captchaToken)) {
//     http_response_code(400);
//     echo json_encode(["error" => "CAPTCHA verification failed."]);
//     exit();
// }

// ─── Fetch User ───────────────────────────────────────────────────────────────
$stmt = $conn->prepare("SELECT UserID, PassHash, RoleID FROM account WHERE Username = ?");
$stmt->bind_param("s", $username);
$stmt->execute();
$result = $stmt->get_result();
$stmt->close();

if ($result->num_rows === 0) {
    // User not found — log as failed login (null UserID since we don't know who)
    logActivity($conn, null, "LOGIN_FAIL", "Failed login attempt for username: {$username}");
    $conn->close();
    http_response_code(401);
    echo json_encode(["error" => "Invalid credentials. Username not found."]);
    exit();
}

$user           = $result->fetch_assoc();
$userID         = $user['UserID'];
$hashedPassword = $user['PassHash'];
$roleID         = $user['RoleID'];

// ─── Verify Password ──────────────────────────────────────────────────────────
// Does not work
if (!password_verify($password, $hashedPassword)) {
    logActivity($conn, $userID, "LOGIN_FAIL", "Wrong password for username: {$username}");
    $conn->close();
    http_response_code(401);
    echo json_encode(["error" => "Invalid credentials. Wrong password."]);
    exit();
}

// ─── Start Session ────────────────────────────────────────────────────────────
session_regenerate_id(true); // prevent session fixation

$_SESSION['userID'] = $userID;
$_SESSION['roleID'] = $roleID;
$_SESSION['username'] = $username;

logActivity($conn, $userID, "LOGIN", "User {$username} logged in.");
$conn->close();

http_response_code(200);
echo json_encode([
    "message" => "Login successful.",
    "roleID"  => $roleID,
]);
