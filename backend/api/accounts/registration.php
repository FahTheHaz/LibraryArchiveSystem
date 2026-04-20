<?php
/**
 * registration.php
 *
 * Registers a new user account.
 *
 * POST /registration.php
 * Body (JSON):
 *   Required: studentID, fullName, email, username, password, confirmPassword, captchaToken
 *   Optional: academicYear, course, dob
 *
 * Returns:
 *   201 { "message": "Registration successful.", "userID": N }
 *   400 validation errors
 *   409 duplicate username / email / studentID
 *   422 CAPTCHA failure
 *   429 too many failed attempts
 *   405 wrong method
 *   500 server / DB error
 *
 *  (schema): Ensure the `account` table has these columns:
 *   StudentID   VARCHAR(20)  UNIQUE NOT NULL
 *   FullName    VARCHAR(255) NOT NULL
 *   Email       VARCHAR(255) UNIQUE NOT NULL
 *   AcademicYear VARCHAR(20) NULL
 *   Course      VARCHAR(100) NULL
 *   DOB         DATE         NULL
 *   RoleID      INT          NOT NULL DEFAULT 2   ← 1 = admin, 2 = user
 */

// ─── CORS & Headers ───────────────────────────────────────────────────────────
// TODO: Adjust Access-Control-Allow-Origin to your frontend's actual URL in production. Using '*' is not recommended for credentials-enabled requests.

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

// ─── Parse Body ───────────────────────────────────────────────────────────────
$body = json_decode(file_get_contents("php://input"), true);
if (!is_array($body)) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON body."]);
    exit();
}

// ─── Rate Limiting — Failed Attempts ─────────────────────────────────────────
// Reads from the `activity` table: blocks registration if too many REGISTER_FAIL
// entries originated from the same IP *or* targeted the same username in the
// last 15 minutes.
//
// Thresholds (adjust as needed):
// const FAIL_WINDOW_MINUTES = 15; // Time window to look back for failures
// const FAIL_MAX_BY_IP = 5;       // Max failed attempts from the same IP in the window
// const FAIL_MAX_BY_USERNAME = 5; // Max failed attempts targeting the same username in the window
// define('FAIL_WINDOW_MINUTES', 15);
define('FAIL_MAX_BY_IP',       5);
define('FAIL_MAX_BY_USERNAME', 5);
$FAIL_WINDOW_MINUTES = 15; // Time window to look back for failures
$FAIL_MAX_BY_IP = 10;       // Max failed attempts from the same IP in the window
$FAIL_MAX_BY_USERNAME = 10;

$clientIP   = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
$clientIPBin = inet_pton($clientIP);
$attemptedUsername = isset($body['username']) ? trim($body['username']) : '';

// Count recent failures by IP
$ipFailStmt = $conn->prepare(
    "SELECT COUNT(*) AS cnt
     FROM activity
     WHERE ActionType = 'REGISTER_FAIL'
       AND IPAddress  = ?
       AND ActTime  >= NOW() - INTERVAL ? MINUTE"
);
$ipFailStmt->bind_param("si", $clientIPBin, $FAIL_WINDOW_MINUTES);
$ipFailStmt->execute();
$ipFailCount = (int) $ipFailStmt->get_result()->fetch_assoc()['cnt'];
$ipFailStmt->close();

// if ($ipFailCount >= FAIL_MAX_BY_IP) {
//     http_response_code(429);
//     echo json_encode([
//         "error" => "Too many failed registration attempts from this IP. Please wait " . $FAIL_WINDOW_MINUTES . " minutes."
//     ]);
//     logActivity($conn, null, "REGISTER_FAIL", "IP blocked due to too many failures | IP: {$clientIP}");
//     exit();
// }

// TODO: Uncomment this after test

// Count recent failures by username (catches hammering a specific username slot)
if ($attemptedUsername !== '') {
    $userFailStmt = $conn->prepare(
        "SELECT COUNT(*) AS cnt
         FROM activity
         WHERE ActionType  = 'REGISTER_FAIL'
           AND Describtion LIKE ?
           AND ActTime  >= NOW() - INTERVAL ? MINUTE"
    );
    $usernameLike = '%username:' . $attemptedUsername . '%';
    $userFailStmt->bind_param("si", $usernameLike, $FAIL_WINDOW_MINUTES);
    $userFailStmt->execute();
    $userFailCount = (int) $userFailStmt->get_result()->fetch_assoc()['cnt'];
    $userFailStmt->close();

    if ($userFailCount >= FAIL_MAX_BY_USERNAME) {
        http_response_code(429);
        echo json_encode([
            "error" => "Too many failed registration attempts for this username. Please wait " . $FAIL_WINDOW_MINUTES . " minutes."
        ]);
        logActivity($conn, null, "REGISTER_FAIL", "Username blocked due to too many failures | username: {$attemptedUsername}");

        exit();
    }
}

// ─── CAPTCHA — Cloudflare Turnstile ──────────────────────────────────────────
// TODO: Replace the placeholder below with real Turnstileecret key verification.
//
// $captchaToken  = $body['captchaToken'] ?? '';
// $turnstileSecret = 'YOUR_TURNSTILE_SECRET_KEY';   // ← set in env / config
//
// $verifyResponse = file_get_contents(
//     'https://challenges.cloudflare.com/turnstile/v0/siteverify',
//     false,
//     stream_context_create([
//         'http' => [
//             'method'  => 'POST',
//             'header'  => 'Content-Type: application/x-www-form-urlencoded',
//             'content' => http_build_query([
//                 'secret'   => $turnstileSecret,
//                 'response' => $captchaToken,
//                 'remoteip' => $clientIP,
//             ]),
//         ],
//     ])
// );
// $verifyData = json_decode($verifyResponse, true);
// if (!($verifyData['success'] ?? false)) {
//     logActivity($conn, null, "REGISTER_FAIL", "CAPTCHA failed | username:{$attemptedUsername}");
//     http_response_code(422);
//     echo json_encode(["error" => "CAPTCHA verification failed."]);
//     exit();
// }
//
// CAPTCHA is currently disabled for development — remove this comment and
// uncomment the block above once Turnstile keys are configured.

// ─── Collect & Trim Fields ────────────────────────────────────────────────────
$studentID   = isset($body['studentID'])   ? trim($body['studentID'])   : '';
$fullName    = isset($body['fullName'])    ? trim($body['fullName'])    : '';
$email       = isset($body['email'])       ? trim($body['email'])       : '';
$username    = isset($body['username'])    ? trim($body['username'])    : '';
$password    = $body['password']           ?? '';
$confirmPass = $body['confirmPassword']   ?? '';

// Optional fields
$academicYear = isset($body['academicYear']) ? trim($body['academicYear']) : null;
$course       = isset($body['course'])       ? trim($body['course'])       : null;
$dob          = isset($body['dob'])          ? trim($body['dob'])          : null;

$errors = [];

// ─── Validation ───────────────────────────────────────────────────────────────

// --- Student ID ---
// TODO: Replace the regex with the real student ID format (e.g., /^\d{4}-\d{5}$/ for YYYY-NNNNN).
if ($studentID === '') {
    $errors[] = "Student ID is required.";
} elseif (!preg_match('/^[A-Z0-9\-]{4,20}$/i', $studentID)) {
    $errors[] = "Invalid student ID format."; // placeholder — tighten regex when format is confirmed
}

// --- Full Name ---
if ($fullName === '') {
    $errors[] = "Full name is required.";
} elseif (strlen($fullName) < 2 || strlen($fullName) > 255) {
    $errors[] = "Full name must be between 2 and 255 characters.";
}

// --- Email ---
if ($email === '') {
    $errors[] = "Email is required.";
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors[] = "Invalid email address.";
} else {
    // TODO: Restrict to allowed institutional domains once confirmed.
    // Example: only allow '@school.edu.ph' addresses.
    //   $allowedDomains = ['school.edu.ph'];
    //   $domain = strtolower(substr($email, strpos($email, '@') + 1));
    //   if (!in_array($domain, $allowedDomains)) {
    //       $errors[] = "Email must be from an allowed domain (e.g., school.edu.ph).";
    //   }
}

// --- Username ---
// TODO: Finalise username rules (length, allowed characters, reserved words, etc.).
// Current placeholder: 3–30 chars, letters/digits/underscores/hyphens, no spaces.
if ($username === '') {
    $errors[] = "Username is required.";
} elseif (!preg_match('/^[A-Za-z0-9_\-]{3,30}$/', $username)) {
    $errors[] = "Username must be 3–30 characters and may only contain letters, numbers, underscores, or hyphens.";
}

// --- Password ---
if ($password === '') {
    $errors[] = "Password is required.";
} elseif (strlen($password) < 8) {
    $errors[] = "Password must be at least 8 characters.";
} elseif ($password !== $confirmPass) {
    $errors[] = "Passwords do not match.";
}

// --- Optional: DOB basic sanity check ---
if ($dob !== null && $dob !== '') {
    $dobDate = DateTime::createFromFormat('Y-m-d', $dob);
    if (!$dobDate || $dobDate->format('Y-m-d') !== $dob) {
        $errors[] = "Date of birth must be in YYYY-MM-DD format.";
    }
} else {
    $dob = null;
}

// Nullify blank optionals so they store as NULL
if ($academicYear === '') $academicYear = null;
if ($course === '')       $course       = null;

if (!empty($errors)) {
    logActivity($conn, null, "REGISTER_FAIL", "Validation failed | username:{$username} | " . implode('; ', $errors));
    http_response_code(400);
    echo json_encode(["errors" => $errors]);
    exit();
}

// ─── Duplicate Checks ─────────────────────────────────────────────────────────
$dupChecks = [
    ['field' => 'Username',  'value' => $username,  'label' => 'Username'],
    ['field' => 'Email',     'value' => $email,     'label' => 'Email'],
    ['field' => 'StudentID', 'value' => $studentID, 'label' => 'Student ID'],
];

foreach ($dupChecks as $check) {
    $dupStmt = $conn->prepare("SELECT UserID FROM account WHERE {$check['field']} = ? LIMIT 1");
    $dupStmt->bind_param("s", $check['value']);
    $dupStmt->execute();
    $dupStmt->store_result();
    if ($dupStmt->num_rows > 0) {
        $dupStmt->close();
        logActivity($conn, null, "REGISTER_FAIL", "Duplicate {$check['field']} | username:{$username}");
        http_response_code(409);
        echo json_encode(["error" => "{$check['label']} is already in use."]);
        exit();
    }
    $dupStmt->close();
}

// ─── Hash Password ────────────────────────────────────────────────────────────
$passHash = password_hash($password, PASSWORD_BCRYPT);

// ─── Insert Account ───────────────────────────────────────────────────────────
// Default RoleID = 2 (regular user). RoleID 1 is reserved for admins.
$defaultRoleID = 2;

// IsVerified = 0 and Status = 'inactive' until email is confirmed
$defaultIsVerified = 0;
$defaultStatus     = 'inactive';

$insertStmt = $conn->prepare(
    "INSERT INTO account
        (StudentID, FullName, Email, Username, PassHash, AcademicYear, Course, DOB, RoleID, IsVerified, Status)
     VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
);
$insertStmt->bind_param(
    "ssssssssiis",
    $studentID, $fullName, $email, $username, $passHash,
    $academicYear, $course, $dob, $defaultRoleID,
    $defaultIsVerified, $defaultStatus
);

if (!$insertStmt->execute()) {
    $insertStmt->close();
    logActivity($conn, null, "REGISTER_FAIL", "DB insert failed | username:{$username}");
    http_response_code(500);
    echo json_encode(["error" => "Registration failed. Please try again."]);
    exit();
}

$newUserID = $conn->insert_id;
$insertStmt->close();

// ─── Generate & Store Email Verification Token ────────────────────────────────
$verifyToken = bin2hex(random_bytes(32)); // 64-char hex token

$verifyStmt = $conn->prepare(
    "INSERT INTO email_verifications (UserID, Token, ExpiresAt)
     VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 24 HOUR))"
);
$verifyStmt->bind_param("is", $newUserID, $verifyToken);
$verifyStmt->execute();
$verifyStmt->close();

// ─── Send Verification Email ──────────────────────────────────────────────────
$verifyLink = "http://localhost:5173/verify-email?token={$verifyToken}";
// TODO: Replace localhost:5173 with production URL when deploying.

$emailBody = "
<p>Hi {$fullName},</p>
<p>Thank you for registering with the Library Archive System.</p>
<p>Please click the link below to verify your email address and activate your account:</p>
<p><a href='{$verifyLink}'>{$verifyLink}</a></p>
<p>This link expires in <strong>24 hours</strong>.</p>
<p>If you did not create this account, you can safely ignore this email.</p>
<br>
<p>— LAS System</p>
";

$mailSent = sendMail($email, $fullName, 'Verify your LAS account', $emailBody);

if (!$mailSent) {
    // Non-fatal: account is created, but log the failure so an admin can resend manually
    error_log("Failed to send verification email to {$email} for UserID {$newUserID}");
}

// ─── Log Success ──────────────────────────────────────────────────────────────
logActivity($conn, $newUserID, "REGISTER", "New account registered | username:{$username}");

$conn->close();

http_response_code(201);
echo json_encode([
    "message"    => "Registration successful. Please check your email to verify your account.",
    "userID"     => $newUserID,
    "emailSent"  => $mailSent,
]);


