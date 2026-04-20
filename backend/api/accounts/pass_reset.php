<?php
/**
 * pass_reset.php
 *
 * Step 2 of the password reset flow.
 * Validates the token and updates the account password.
 *
 * POST /accounts/pass_reset.php
 * Body (JSON): { "token": "...", "password": "...", "confirmPassword": "..." }
 *
 * Returns:
 *   200 { "message": "Password reset successfully." }
 *   400 missing fields / passwords don't match / too short
 *   410 token invalid, expired, or already used
 *   405 wrong method
 *   500 DB error
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

// ─── Parse & Validate ─────────────────────────────────────────────────────────
$body            = json_decode(file_get_contents("php://input"), true);
$token           = isset($body['token'])           ? trim($body['token'])   : '';
$newPassword     = $body['password']               ?? '';
$confirmPassword = $body['confirmPassword']        ?? '';

if ($token === '' || $newPassword === '' || $confirmPassword === '') {
    http_response_code(400);
    echo json_encode(["error" => "Token, password, and confirmPassword are required."]);
    exit();
}

if ($newPassword !== $confirmPassword) {
    http_response_code(400);
    echo json_encode(["error" => "Passwords do not match."]);
    exit();
}

if (strlen($newPassword) < 8) {
    http_response_code(400);
    echo json_encode(["error" => "Password must be at least 8 characters."]);
    exit();
}

// ─── Validate Token ───────────────────────────────────────────────────────────
$stmt = $conn->prepare(
    "SELECT ResetID, UserID
     FROM password_resets
     WHERE Token = ? AND UsedAt IS NULL AND ExpiresAt > NOW()"
);
$stmt->bind_param("s", $token);
$stmt->execute();
$row = $stmt->get_result()->fetch_assoc();
$stmt->close();

if (!$row) {
    http_response_code(410);
    echo json_encode(["error" => "This reset link is invalid or has expired. Please request a new one."]);
    exit();
}

$userID  = (int) $row['UserID'];
$resetID = (int) $row['ResetID'];

// ─── Update Password & Mark Token Used ───────────────────────────────────────
$conn->begin_transaction();

try {
    $passHash = password_hash($newPassword, PASSWORD_BCRYPT);

    $upd = $conn->prepare("UPDATE account SET PassHash = ? WHERE UserID = ?");
    $upd->bind_param("si", $passHash, $userID);
    $upd->execute();
    $upd->close();

    $mark = $conn->prepare("UPDATE password_resets SET UsedAt = NOW() WHERE ResetID = ?");
    $mark->bind_param("i", $resetID);
    $mark->execute();
    $mark->close();

    $conn->commit();

    logActivity($conn, $userID, "PASSWORD_RESET", "Password reset successfully for UserID: {$userID}");

    http_response_code(200);
    echo json_encode(["message" => "Password reset successfully. You can now log in."]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["error" => "Password reset failed. Please try again."]);
}

$conn->close();