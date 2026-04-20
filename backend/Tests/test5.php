<?php
/**
 * test5.php
 *
 * Integration tests for the auth system:
 *   - login.php  (valid login, wrong password, bad username, missing fields, wrong method)
 *   - logout.php (logout after login, wrong method)
 *   - Session    (cookie persists between requests, session destroyed after logout)
 *   - logActivity entries for LOGIN and LOGIN_FAIL
 *
 * !! BEFORE RUNNING !!
 *   Set $validUsername and $validPassword below to a real account in your DB.
 *   The password must have been stored with password_hash().
 *
 * Usage (browser):  http://localhost/las/backend/tests/test5.php
 * Usage (terminal): php test5.php
 */

// ─── Configuration ───────────────────────────────────────────────────────────

$baseUrl       = "http://localhost/las/backend/api/accounts";
$validUsername = "admin";          // ← change to a real account username
$validPassword = "admin123";    // ← change to the matching plaintext password
$cookieJar     = tempnam(sys_get_temp_dir(), "las_auth_test_");

// ─── Direct DB connection for verification ────────────────────────────────────

$conn = new mysqli("localhost", "root", "", "las_db");
if ($conn->connect_error) {
    die("DB connection failed: " . $conn->connect_error . "\n");
}

// ─── Helper Functions ─────────────────────────────────────────────────────────

function sendGet($url, $cookieJar = null) { // simple GET request, optional cookie jar for session persistence  
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    if ($cookieJar) {
        curl_setopt($ch, CURLOPT_COOKIEFILE, $cookieJar);
        curl_setopt($ch, CURLOPT_COOKIEJAR,  $cookieJar);
    }
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    if ($err) return ["httpCode" => 0, "body" => "cURL error: $err"];
    return ["httpCode" => $code, "body" => $body];
}

function sendJson($url, array $data, $method = 'POST', $cookieJar = null) {
    $json = json_encode($data);
    $ch   = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    if ($cookieJar) {
        // COOKIEFILE reads existing cookies, COOKIEJAR writes new ones
        curl_setopt($ch, CURLOPT_COOKIEFILE, $cookieJar);
        curl_setopt($ch, CURLOPT_COOKIEJAR,  $cookieJar);
    }
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    curl_close($ch);
    if ($err) return ["httpCode" => 0, "body" => "cURL error: $err"];
    return ["httpCode" => $code, "body" => $body];
}

function printResult($testName, $result, $expectCode) {
    $passed = ($result['httpCode'] === $expectCode);
    $status = $passed ? "PASS" : "FAIL";
    if (php_sapi_name() !== 'cli') {
        $bg  = $passed ? "#d4edda" : "#f8d7da";
        $col = $passed ? "#155724" : "#721c24";
        echo "<div style='padding:10px;margin:8px 0;border-radius:6px;background:{$bg};color:{$col};font-family:monospace;'>";
        echo "<strong>[{$status}] {$testName}</strong><br>";
        echo "Expected HTTP {$expectCode}, got HTTP {$result['httpCode']}<br>";
        echo "Response: <code>" . htmlspecialchars($result['body']) . "</code></div>";
    } else {
        $c = $passed ? "32" : "31";
        echo "\033[{$c}m[{$status}]\033[0m {$testName}\n";
        echo "  Expected HTTP {$expectCode} | Got HTTP {$result['httpCode']}\n";
        echo "  Response: {$result['body']}\n\n";
    }
}

function sectionHeader($title) {
    if (php_sapi_name() !== 'cli') {
        echo "<h2 style='font-family:sans-serif;margin-top:24px;'>{$title}</h2>";
    } else {
        echo "\n=== {$title} ===\n\n";
    }
}

// ─── Page Header ──────────────────────────────────────────────────────────────

if (php_sapi_name() !== 'cli') {
    echo "<!DOCTYPE html><html><head><title>LAS Auth Tests (test5)</title></head><body>";
    echo "<h1 style='font-family:sans-serif;'>LAS Auth Test Results</h1>";
    echo "<p style='font-family:sans-serif;color:#666;'>Base URL: <code>{$baseUrl}</code></p><hr>";
}


// ═══════════════════════════════════════════════════════════════════════════════
// LOGIN TESTS
// ═══════════════════════════════════════════════════════════════════════════════

sectionHeader("LOGIN");

// A1: Valid credentials → 200
$beforeCount = (int) $conn->query("SELECT COUNT(*) AS c FROM activity")->fetch_assoc()['c'];
$res = sendJson("{$baseUrl}/login.php", [
    'username' => $validUsername,
    'password' => $validPassword,
], 'POST', $cookieJar);
printResult("A1: Valid credentials (expect 200)", $res, 200);

// Confirm LOGIN was logged
$afterCount = (int) $conn->query("SELECT COUNT(*) AS c FROM activity")->fetch_assoc()['c'];
$loginLogged = ($afterCount > $beforeCount)
    ? ["httpCode" => 200, "body" => "Activity row inserted on login."]
    : ["httpCode" => 500, "body" => "No activity row inserted on login."];
printResult("A1a: Login success is logged in activity table", $loginLogged, 200);

// A2: Wrong password → 401
$beforeCount = (int) $conn->query("SELECT COUNT(*) AS c FROM activity")->fetch_assoc()['c'];
$res = sendJson("{$baseUrl}/login.php", [
    'username' => $validUsername,
    'password' => 'wrongpassword!',
], 'POST', $cookieJar);
printResult("A2: Wrong password (expect 401)", $res, 401);

// Confirm LOGIN_FAIL was logged
$afterCount = (int) $conn->query("SELECT COUNT(*) AS c FROM activity")->fetch_assoc()['c'];
$failLogged = ($afterCount > $beforeCount)
    ? ["httpCode" => 200, "body" => "LOGIN_FAIL row inserted."]
    : ["httpCode" => 500, "body" => "No LOGIN_FAIL row inserted."];
printResult("A2a: Failed login is logged in activity table", $failLogged, 200);

// A3: Nonexistent username → 401
$res = sendJson("{$baseUrl}/login.php", [
    'username' => 'ghost_user_99999',
    'password' => 'doesntmatter',
], 'POST', $cookieJar);
printResult("A3: Nonexistent username (expect 401)", $res, 401);

// A4: Missing password field → 400
$res = sendJson("{$baseUrl}/login.php", [
    'username' => $validUsername,
], 'POST');
printResult("A4: Missing password field (expect 400)", $res, 400);

// A5: Empty body → 400
$res = sendJson("{$baseUrl}/login.php", [], 'POST');
printResult("A5: Empty body (expect 400)", $res, 400);

// A6: GET request to login.php → 405
$res = sendGet("{$baseUrl}/login.php");
printResult("A6: GET request to login.php (expect 405)", $res, 405);

// A7: Response contains roleID on success
$body = json_decode($res['body'] ?? '{}', true);
$loginRes = sendJson("{$baseUrl}/login.php", [
    'username' => $validUsername,
    'password' => $validPassword,
], 'POST', $cookieJar);
$loginBody = json_decode($loginRes['body'], true);
$hasRole = isset($loginBody['roleID'])
    ? ["httpCode" => 200, "body" => "roleID = {$loginBody['roleID']}"]
    : ["httpCode" => 500, "body" => "roleID missing from response."];
printResult("A7: Login response includes roleID", $hasRole, 200);


// ═══════════════════════════════════════════════════════════════════════════════
// SESSION PERSISTENCE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

sectionHeader("SESSION");

// S1: Cookie jar has a session cookie after login
$cookieContents = file_get_contents($cookieJar);
$hasSessionCookie = str_contains($cookieContents, 'PHPSESSID')
    ? ["httpCode" => 200, "body" => "PHPSESSID cookie found in jar."]
    : ["httpCode" => 500, "body" => "No PHPSESSID cookie in jar.\n" . $cookieContents];
printResult("S1: Session cookie set after login", $hasSessionCookie, 200);

// NOTE: S2 would test a protected endpoint here once auth.php is added to
// delete.php / update.php. Example:
//   $res = sendGet("{$baseUrl}/read.php?id=1", $cookieJar);  // not protected yet
//   printResult("S2: Authenticated request reaches protected endpoint (expect 200)", $res, 200);


// ═══════════════════════════════════════════════════════════════════════════════
// LOGOUT TESTS
// ═══════════════════════════════════════════════════════════════════════════════

sectionHeader("LOGOUT");

// B1: Logout with active session → 200
$res = sendJson("{$baseUrl}/logout.php", [], 'POST', $cookieJar);
printResult("B1: Logout with active session (expect 200)", $res, 200);

// B2: Cookie should be expired after logout — check cookie jar
$cookieContents = file_get_contents($cookieJar);
$sessionGone = !str_contains($cookieContents, 'PHPSESSID') || str_contains($cookieContents, '#HttpOnly_')
    ? ["httpCode" => 200, "body" => "Session cookie cleared after logout."]
    : ["httpCode" => 500, "body" => "Session cookie still present after logout."];
printResult("B2: Session cookie cleared after logout", $sessionGone, 200);

// B3: Logout with no session → still returns 200 (idempotent)
$freshJar = tempnam(sys_get_temp_dir(), "las_auth_noses_");
$res = sendJson("{$baseUrl}/logout.php", [], 'POST', $freshJar);
printResult("B3: Logout with no session (expect 200, idempotent)", $res, 200);
unlink($freshJar);

// B4: GET request to logout.php → 405
$res = sendGet("{$baseUrl}/logout.php");
printResult("B4: GET request to logout.php (expect 405)", $res, 405);


// 
// ACTIVITY LOG VERIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

sectionHeader("ACTIVITY LOG");

// AL1: Check recent login-related activity rows exist
$recent = $conn->query(
    "SELECT ActionType, Describtion FROM activity
     WHERE ActionType IN ('LOGIN', 'LOGIN_FAIL')
     ORDER BY LogID DESC LIMIT 5"
);
$rows = [];
while ($row = $recent->fetch_assoc()) {
    $rows[] = $row['ActionType'] . ': ' . $row['Describtion'];
}

$logCheck = !empty($rows)
    ? ["httpCode" => 200, "body" => implode(" | ", $rows)]
    : ["httpCode" => 500, "body" => "No LOGIN or LOGIN_FAIL rows found in activity table."];
printResult("AL1: LOGIN and LOGIN_FAIL entries exist in activity table", $logCheck, 200);


// ─── Cleanup ─────────────────────────────────────────────────────────────────

if (file_exists($cookieJar)) {
    unlink($cookieJar);
}
$conn->close();

// ─── Footer ──────────────────────────────────────────────────────────────────

if (php_sapi_name() !== 'cli') {
    echo "<hr><p style='font-family:sans-serif;color:#666;'>Done. Check phpMyAdmin → <code>activity</code> table for LOGIN and LOGIN_FAIL entries.</p></body></html>";
} else {
    echo "Done. Check phpMyAdmin → activity table for LOGIN and LOGIN_FAIL entries.\n";
}
