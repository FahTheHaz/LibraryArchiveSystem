<?php
/**
 * logout.php
 *
 * Destroys the session and clears the session cookie.
 *
 * POST /logout.php
 *
 * Returns:
 *   200 { "message": "Logged out." }
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

// ─── Destroy Session ──────────────────────────────────────────────────────────
session_set_cookie_params([
    'lifetime' => 3600,
    'path'     => '/',
    'secure'   => false,   // match login.php setting
    'httponly' => true,
    'samesite' => 'Strict'
]);
session_start();
session_unset();
session_destroy();

// Expire the cookie in the browser
setcookie(session_name(), '', [
    'expires'  => time() - 3600,
    'path'     => '/',
    'secure'   => false,
    'httponly' => true,
    'samesite' => 'Strict'
]);

http_response_code(200);
echo json_encode(["message" => "Logged out."]);
