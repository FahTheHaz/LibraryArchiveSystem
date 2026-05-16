<?php
/**
 * pass_forgot.php
 *
 * Step 1 of the password reset flow.
 * Accepts an email, generates a secure token, stores it, and sends a reset link.
 *
 * POST /accounts/pass_forgot.php
 * Body (JSON): { "email": "user@example.com" }
 *
 * Returns:
 *   200 { "message": "If that email exists, a reset link has been sent." }
 *       (same message whether email exists or not — prevents email enumeration)
 *   400 missing / invalid email
 *   405 wrong method
 *   500 DB error
 *
 * Schema required:
 *   CREATE TABLE password_resets (
 *     ResetID   INT AUTO_INCREMENT PRIMARY KEY,
 *     UserID    INT         NOT NULL,
 *     Token     VARCHAR(64) NOT NULL UNIQUE,
 *     ExpiresAt DATETIME    NOT NULL,
 *     UsedAt    DATETIME    NULL,
 *     FOREIGN KEY (UserID) REFERENCES account(UserID)
 *   );
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

// ─── DB Connection ────────────────────────────────────────────────────────────
$conn = new mysqli("localhost", "root", "", "las_db");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed."]);
    exit();
}

require_once __DIR__ . '/../../utils/logActivity.php';
require_once __DIR__ . '/../../utils/mailer.php';

// ─── Parse & Validate 
$body  = json_decode(file_get_contents("php://input"), true);
$email = isset($body['email']) ? trim($body['email']) : '';

if ($email === '') {
    http_response_code(400);
    echo json_encode(["error" => "Email is required."]);
    exit();
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid email format."]);
    exit();
}

// ─── Look Up Account 
$stmt = $conn->prepare("SELECT UserID, FullName FROM account WHERE Email = ? LIMIT 1");
$stmt->bind_param("s", $email);
$stmt->execute();
$user = $stmt->get_result()->fetch_assoc();
$stmt->close();

// Always return 200 prevent email enumeration
if (!$user) {
    http_response_code(200);
    echo json_encode(["message" => "If that email exists, a reset link has been sent."]);
    $conn->close();
    exit();
}

$userID   = (int) $user['UserID'];
$fullName = $user['FullName'];

// ─── Generate Token 
// Generate BEFORE the prepare so $token is populated when bind_param runs
$token = bin2hex(random_bytes(32)); // 64-char hex token, expires in 1 hour
// for password reset link

$stmt = $conn->prepare( 
    "INSERT INTO password_resets (UserID, Token, ExpiresAt)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 1 HOUR))
     ON DUPLICATE KEY UPDATE Token = VALUES(Token), ExpiresAt = VALUES(ExpiresAt), UsedAt = NULL"
);
// Put in db
$stmt->bind_param("is", $userID, $token);

if (!$stmt->execute()) {
    $stmt->close();
    error_log("Failed to store password reset token for UserID {$userID}");
    // Still return 200 — don't reveal the failure
    http_response_code(200);
    echo json_encode(["message" => "If that email exists, a reset link has been sent."]);
    $conn->close();
    exit();
}
$stmt->close();

// ─── Send Reset Email 
$resetLink = "http://localhost:5173/reset-password?token={$token}";
// TODO: Replace localhost:5173 with production URL when deploying.
// TODO: make this lovelier
$emailBody = "
<p>Hi {$fullName},</p>
<p>We received a request to reset your LAS account password.</p>
<p>Click the link below to set a new password:</p>
<p><a href='{$resetLink}'>{$resetLink}</a></p>
<p>This link expires in <strong>1 hour</strong>.</p>
<p>If you did not request a password reset, you can safely ignore this email.</p>
<br>
<p>— LAS System</p>
";

$mailSent = sendMail($email, $fullName, 'LAS Password Reset', $emailBody);

if (!$mailSent) {
    error_log("Failed to send password reset email to {$email} for UserID {$userID}");
}

logActivity($conn, $userID, "FORGOT_PASSWORD", "Password reset requested for email: {$email}");

$conn->close();

http_response_code(200);
echo json_encode(["message" => "If that email exists, a reset link has been sent."]);