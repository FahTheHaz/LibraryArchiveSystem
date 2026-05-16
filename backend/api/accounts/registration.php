<?php
/**
 * registration.php
 *
 * Registers a new student account.
 * Inserts into `account` then `studentProfile`.
 *
 * POST /registration.php
 * Body (JSON):
 *   Required: studentID, email, username, password, confirmPassword, captchaToken
 *
 * Returns:
 *   201 { "message": "...", "userID": N }
 *   400 validation errors
 *   409 duplicate username / email / studentID
 *   422 CAPTCHA failure
 *   429 too many failed attempts
 *   405 wrong method
 *   500 server / DB error
 */

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed. Use POST."]);
    exit();
}

// ─── DB Connection ────────────────────────────────────────────────────────────
$conn = new mysqli("localhost", "root", "", "las_db");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed: " . $conn->connect_error]);
    exit();
}
$conn->set_charset("utf8mb4");

require_once __DIR__ . '/../../utils/logActivity.php';
require_once __DIR__ . '/../../utils/mailer.php';

// ─── Parse Body ───────────────────────────────────────────────────────────────
$body = json_decode(file_get_contents("php://input"), true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON body."]);
    exit();
}

$clientIP          = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$attemptedUsername = trim($body['username'] ?? '');

// ─── Rate Limiting ────────────────────────────────────────────────────────────
$FAIL_WINDOW_MINUTES = 15;
$FAIL_MAX_BY_USERNAME = 10;

if ($attemptedUsername !== '') {
    $userFailStmt = $conn->prepare(
        "SELECT COUNT(*) AS cnt FROM activity
         WHERE ActionType = 'REGISTER_FAIL'
           AND Describtion LIKE ?
           AND ActTime >= NOW() - INTERVAL ? MINUTE"
    );
    $usernameLike = '%username:' . $attemptedUsername . '%';
    $userFailStmt->bind_param("si", $usernameLike, $FAIL_WINDOW_MINUTES);
    $userFailStmt->execute();
    $userFailCount = (int) $userFailStmt->get_result()->fetch_assoc()['cnt'];
    $userFailStmt->close();

    if ($userFailCount >= $FAIL_MAX_BY_USERNAME) {
        http_response_code(429);
        echo json_encode(["error" => "Too many failed attempts. Please wait {$FAIL_WINDOW_MINUTES} minutes."]);
        exit();
    }
}

// ─── CAPTCHA — Cloudflare Turnstile ──────────────────────────────────────────
// To skip CAPTCHA for testing: comment out from here...
$captchaToken    = $body['captchaToken'] ?? '';
$turnstileSecret = '1x0000000000000000000000000000000AA'; // TODO: replace with real secret from env

if ($captchaToken === '') {
    logActivity($conn, null, "REGISTER_FAIL", "CAPTCHA token missing | username:{$attemptedUsername}");
    http_response_code(422);
    echo json_encode(["error" => "CAPTCHA verification required."]);
    exit();
}

$ch = curl_init('https://challenges.cloudflare.com/turnstile/v0/siteverify');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_TIMEOUT        => 5,
    CURLOPT_SSL_VERIFYPEER => false,
    CURLOPT_POSTFIELDS     => http_build_query([
        'secret'   => $turnstileSecret,
        'response' => $captchaToken,
        'remoteip' => $clientIP,
    ]),
    CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
]);
$verifyResponse = curl_exec($ch);
$verifyData     = $verifyResponse ? json_decode($verifyResponse, true) : null;
if (!($verifyData['success'] ?? false)) { // This code runs if CAPTCHA failed
    logActivity($conn, null, "REGISTER_FAIL", "CAPTCHA failed | username:{$attemptedUsername}");
    http_response_code(422);
    echo json_encode(["error" => "CAPTCHA verification failed. Please try again."]);
    exit();
}
// ...to here.
// 

// ─── Collect & Validate Fields 
$studentID   = trim($body['studentID']       ?? '');
$email       = trim($body['email']           ?? '');
$username    = trim($body['username']        ?? '');
$password    = $body['password']             ?? '';
$confirmPass = $body['confirmPassword']      ?? '';
$academicYear = trim($body['academicYear'] ?? '');
// TODO: Add FUllname and course soon for studenst

$errors = [];

// validation rules
// FOr now unspecified: because...
if ($studentID === '') {
    $errors[] = "Student ID is required.";
} elseif (!preg_match('/^[A-Z0-9\-]{4,20}$/i', $studentID)) {
    $errors[] = "Invalid student ID format.";
}

if ($academicYear === '') {
    $errors[] = "Academic year is required.";
}

if ($email === '') {
    $errors[] = "Email is required.";
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = "Invalid email address.";
}

if ($username === '') {
    $errors[] = "Username is required.";
} elseif (!preg_match('/^[A-Za-z0-9_\-]{3,30}$/', $username)) {
    $errors[] = "Username must be 3–30 characters (letters, numbers, _ or -).";
}

if ($password === '') {
    $errors[] = "Password is required.";
} elseif (strlen($password) < 8) {
    $errors[] = "Password must be at least 8 characters.";
} elseif ($password !== $confirmPass) {
    $errors[] = "Passwords do not match.";
}

if (!empty($errors)) {
    logActivity($conn, null, "REGISTER_FAIL", "Validation failed | username:{$username} | " . implode('; ', $errors));
    http_response_code(400);
    echo json_encode(["errors" => $errors]);
    exit();
}

// ─── Duplicate Checks 
// Username and Email are in account; StudentID is in studentProfile

$accountDups = [
    ['field' => 'Username', 'value' => $username, 'label' => 'Username'],
    ['field' => 'Email',    'value' => $email,    'label' => 'Email'],
];
foreach ($accountDups as $check) {
    $dupStmt = $conn->prepare("SELECT UserID FROM account WHERE {$check['field']} = ? LIMIT 1");
    if (!$dupStmt) {
        http_response_code(500);
        echo json_encode(["error" => "DB prepare failed: " . $conn->error]);
        exit();
    }
    $dupStmt->bind_param("s", $check['value']);
    $dupStmt->execute();
    $dupStmt->store_result();
    $found = $dupStmt->num_rows > 0;
    $dupStmt->close();
    if ($found) { 
        logActivity($conn, null, "REGISTER_FAIL", "Duplicate {$check['field']} | username:{$username}");
        http_response_code(409);
        echo json_encode(["error" => "{$check['label']} is already in use."]);
        exit();
    }
}

// Check StudentID uniqueness in studentProfile
$sidStmt = $conn->prepare("SELECT UserID FROM studentProfile WHERE StudentID = ? LIMIT 1");
if (!$sidStmt) {
    http_response_code(500);
    echo json_encode(["error" => "DB prepare failed: " . $conn->error]);
    exit();
}
$sidStmt->bind_param("s", $studentID);
$sidStmt->execute();
$sidStmt->store_result();
if ($sidStmt->num_rows > 0) {
    $sidStmt->close();
    logActivity($conn, null, "REGISTER_FAIL", "Duplicate StudentID | username:{$username}");
    http_response_code(409);
    echo json_encode(["error" => "Student ID is already in use."]);
    exit();
}
$sidStmt->close();

// ─── Hash Password ────────────────────────────────────────────────────────────
$passHash = password_hash($password, PASSWORD_BCRYPT);

// ─── Insert into account ──────────────────────────────────────────────────────
$conn->begin_transaction();

try { // This code runs if all DB operations succeed; if any fail, we rollback and return an error.
    $insAccount = $conn->prepare(
        "INSERT INTO account (Email, Username, PassHash, RoleID, IsVerified, Status)
         VALUES (?, ?, ?, 2, 0, 'inactive')"
    );
    if (!$insAccount) throw new Exception("Prepare account failed: " . $conn->error);

    $insAccount->bind_param("sss", $email, $username, $passHash);
    if (!$insAccount->execute()) throw new Exception("Insert account failed: " . $insAccount->error);

    $newUserID = $conn->insert_id;
    $insAccount->close();

    // ─── Insert into studentProfile 
    $insProfile = $conn->prepare(
        "INSERT INTO studentProfile (UserID, StudentID, AcademicYear)
         VALUES (?, ?, ?)"
    );
    if (!$insProfile) throw new Exception("Prepare studentProfile failed: " . $conn->error);

    $insProfile->bind_param("iss", $newUserID, $studentID, $academicYear);
    if (!$insProfile->execute()) throw new Exception("Insert studentProfile failed: " . $insProfile->error);

    $insProfile->close();
    $conn->commit();

} catch (Exception $e) {
    $conn->rollback();
    error_log("Registration DB error: " . $e->getMessage());
    logActivity($conn, null, "REGISTER_FAIL", "DB error | username:{$username}");
    http_response_code(500);
    echo json_encode(["error" => "Registration failed: " . $e->getMessage()]);
    exit();
}

// ─── Send Pending Approval Email 
// To skip email for testing: comment out the next line.
$mailSent = sendMail($email, $username, 'LAS Account — Pending Approval', "
<p>Hi {$username},</p>
<p>Your <strong>Library Archive System</strong> account is pending review by library staff.</p>
<p>You will receive another email once your account is approved.</p>
<br><p>— LAS System</p>
");

logActivity($conn, $newUserID, "REGISTER", "New account registered | username:{$username}");
$conn->close();

http_response_code(201);
echo json_encode([
    "message"   => "Registration successful. Your account is pending approval — you will be notified by email once activated.",
    "userID"    => $newUserID,
    "emailSent" => $mailSent ?? false,
]);
