<?php
/**
 * verify_email.php
 *
 * Consumes an email verification token and activates the account.
 * Called when the user clicks the link in their registration email.
 *
 * GET /accounts/verify_email.php?token=<hex_token>
 *
 * Returns:
 *   200 { "message": "Email verified. You can now log in." }
 *   400 missing token
 *   410 token expired or already used
 *   405 wrong method
 *
 * Schema required:
 *   ALTER TABLE account
 *     ADD COLUMN IsVerified TINYINT(1) NOT NULL DEFAULT 0,
 *     ADD COLUMN Status ENUM('inactive','active','banned') NOT NULL DEFAULT 'inactive';
 *
 *   CREATE TABLE email_verifications (
 *     VerifyID  INT AUTO_INCREMENT PRIMARY KEY,
 *     UserID    INT         NOT NULL,
 *     Token     VARCHAR(64) NOT NULL UNIQUE,
 *     ExpiresAt DATETIME    NOT NULL,
 *     UsedAt    DATETIME    NULL,
 *     FOREIGN KEY (UserID) REFERENCES account(UserID)
 *   );
 */

// ─── CORS & Headers ───────────────────────────────────────────────────────────
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed. Use GET."]);
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

// ─── Read Token ───────────────────────────────────────────────────────────────
$token = isset($_GET['token']) ? trim($_GET['token']) : '';

if ($token === '') {
    http_response_code(400);
    echo json_encode(["error" => "Verification token is required."]);
    exit();
}

// ─── Look Up Token ────────────────────────────────────────────────────────────
$stmt = $conn->prepare(
    "SELECT VerifyID, UserID
     FROM email_verifications
     WHERE Token = ? AND UsedAt IS NULL AND ExpiresAt > NOW()"
);
$stmt->bind_param("s", $token);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    http_response_code(410);
    echo json_encode(["error" => "This verification link is invalid or has expired. Please register again or request a new link."]);
    exit();
}

$userID   = (int) $row['UserID'];
$verifyID = (int) $row['VerifyID'];

// ─── Activate Account ─────────────────────────────────────────────────────────
$conn->begin_transaction();

try {
    // Mark token as used
    $markUsed = $conn->prepare(
        "UPDATE emailVerifications SET UsedAt = NOW() WHERE VerifyID = ?"
    );
    $markUsed->bind_param("i", $verifyID);
    $markUsed->execute();
    $markUsed->close();

    // Activate the account
    $activate = $conn->prepare(
        "UPDATE account SET IsVerified = 1, Status = 'active' WHERE UserID = ?"
    );
    $activate->bind_param("i", $userID);
    $activate->execute();
    $activate->close();

    $conn->commit();

    logActivity($conn, $userID, "EMAIL_VERIFIED", "Email verified for UserID: {$userID}");

    http_response_code(200);
    echo json_encode(["message" => "Email verified successfully. You can now log in."]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["error" => "Verification failed. Please try again."]);
}

$conn->close();