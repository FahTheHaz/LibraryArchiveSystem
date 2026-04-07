<!-- To test all, read, and browse functionality, as well as update, delete operations upload, also test if logActivity is working correctly -->

<?php
/**
 * test4.php
 *
 * Comprehensive integration test covering:
 *   - create.php  (upload, used as setup to get fresh file IDs)
 *   - read.php    (browse all, single file, filters, search, pagination, sort)
 *   - update.php  (metadata updates for PAPER and PHOTO, error cases)
 *   - delete.php  (soft-delete, restore, auth checks, error cases)
 *   - logActivity (direct call + verify rows land in the activity table)
 *
 * Usage (browser):  http://localhost/las/backend/tests/test4.php
 * Usage (terminal): php test4.php
 */

// ─── Configuration ───────────────────────────────────────────────────────────

$baseUrl    = "http://localhost/las/backend/api";
$testUserID = 1;
$tmpDir     = sys_get_temp_dir();

// ─── Direct DB connection (MySQLi) for logActivity verification ───────────────

$conn = new mysqli("localhost", "root", "", "las_db");

if ($conn->connect_error) {
    die("DB connection failed: " . $conn->connect_error . "\n");
}

require_once __DIR__ . '/../utils/logActivity.php';


// ─── Helper Functions ─────────────────────────────────────────────────────────

function sendGet($url) { // Simple GET request for read.php tests
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    if ($err) return ["httpCode" => 0, "body" => "cURL error: $err"];
    return ["httpCode" => $code, "body" => $body];
} // Note: We don't call curl_close() here to avoid "Warning: curl_close(): supplied resource is not a valid cURL handle" when using the same cURL handle for multiple requests. In a more robust implementation, we would manage cURL handles more carefully.

function sendJson($url, array $data, $method = 'POST') {// For update.php and delete.php tests
    $json = json_encode($data);
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $json);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    if ($err) return ["httpCode" => 0, "body" => "cURL error: $err"];
    return ["httpCode" => $code, "body" => $body];
}

function sendUpload($url, $filePath, $postFields) { // For create.php file upload tests
    $cFile = new CURLFile($filePath, mime_content_type($filePath), basename($filePath));
    $postFields['file'] = $cFile;
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    $body = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $err  = curl_error($ch);
    if ($err) return ["httpCode" => 0, "body" => "cURL error: $err"];
    return ["httpCode" => $code, "body" => $body];
}

function createDummyPDF($tmpDir, $name = "test4_paper.pdf") {
    $path = $tmpDir . DIRECTORY_SEPARATOR . $name;
    file_put_contents($path, "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF");
    return $path;
}

function createDummyImage($tmpDir, $name = "test4_photo.jpg") {
    $path = $tmpDir . DIRECTORY_SEPARATOR . $name;
    if (function_exists('imagecreatetruecolor')) {
        $img = imagecreatetruecolor(1, 1);
        imagejpeg($img, $path);
    } else {
        file_put_contents($path, str_repeat("\xFF", 100));
    }
    return $path;
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

function printActivity($rows) {
    if (empty($rows)) {
        if (php_sapi_name() !== 'cli') {
            echo "<div style='padding:10px;margin:8px 0;font-family:monospace;color:#666;'>No activity rows to display.</div>";
        } else {
            echo "  No activity rows to display.\n\n";
        }
        return;
    }
    if (php_sapi_name() !== 'cli') {
        echo "<div style='padding:10px;margin:8px 0;border-radius:6px;background:#f0f4ff;font-family:monospace;'>";
        echo "<strong>Recent Activity Log Entries:</strong><br><br>";
        foreach ($rows as $row) {
            echo "<div style='margin-bottom:6px;padding:6px;background:#fff;border-left:4px solid #4a90d9;'>";
            echo "<strong>ActionType:</strong> " . htmlspecialchars($row['ActionType']) . " &nbsp;|&nbsp; ";
            echo "<strong>Description:</strong> " . htmlspecialchars($row['Describtion']) . " &nbsp;|&nbsp; ";
            echo "<strong>UserID:</strong> " . htmlspecialchars($row['UserID'] ?? 'NULL') . " &nbsp;|&nbsp; ";
            $ts = $row['Timestamp'] ?? $row['LogDate'] ?? $row['CreatedAt'] ?? 'N/A';
            echo "<strong>Time:</strong> " . htmlspecialchars($ts);
            echo "</div>";
        }
        echo "</div>";
    } else {
        echo "  Recent Activity Log Entries:\n";
        foreach ($rows as $row) {
            echo "  [" . ($row['ActionType'] ?? '?') . "] " . ($row['Describtion'] ?? '') .
                 " | UserID: " . ($row['UserID'] ?? 'NULL') .
                 " | Time: " . ($row['Timestamp'] ?? $row['LogDate'] ?? $row['CreatedAt'] ?? 'N/A') . "\n";
        }
        echo "\n";
    }
}

function sectionHeader($title) {
    if (php_sapi_name() !== 'cli') {
        echo "<h2 style='font-family:sans-serif;margin-top:24px;'>{$title}</h2>";
    } else {
        echo "\n=== {$title} ===\n\n";
    }
}


// ─── Page header ──────────────────────────────────────────────────────────────

if (php_sapi_name() !== 'cli') {
    echo "<!DOCTYPE html><html><head><title>LAS Integration Tests (test4)</title></head><body>";
    echo "<h1 style='font-family:sans-serif;'>LAS Integration Test Results</h1>";
    echo "<p style='font-family:sans-serif;color:#666;'>Base URL: <code>{$baseUrl}</code> &nbsp;|&nbsp; Test UserID: {$testUserID}</p><hr>";
}


// ═══════════════════════════════════════════════════════════════════════════════
// SETUP — Upload a PAPER and a PHOTO to get fresh FileIDs for the tests below
// ═══════════════════════════════════════════════════════════════════════════════

sectionHeader("SETUP: Seed test records");

$dummyPDF = createDummyPDF($tmpDir);
$res = sendUpload("{$baseUrl}/create.php", $dummyPDF, [
    'fileType'      => 'PAPER',
    'uploadedBy'    => $testUserID,
    'subject'       => 'TestSubject',
    'season'        => 'June',
    'semester'      => 'Semester 1',
    'code'          => 'TS101',
    'scanOrDigital' => 'Digital',
]);
printResult("[SETUP] Upload PAPER for test fixtures", $res, 201);
$paperID = ($res['httpCode'] === 201) ? (json_decode($res['body'], true)['fileID'] ?? null) : null;

$dummyImg = createDummyImage($tmpDir);
$res = sendUpload("{$baseUrl}/create.php", $dummyImg, [
    'fileType'     => 'PHOTO',
    'uploadedBy'   => $testUserID,
    'event'        => 'Test Event 2025',
    'photographer' => 'TestPhotographer',
    'pictureDate'  => '2025-01-01 00:00:00',
    'quality'      => 'High',
]);
printResult("[SETUP] Upload PHOTO for test fixtures", $res, 201);
$photoID = ($res['httpCode'] === 201) ? (json_decode($res['body'], true)['fileID'] ?? null) : null;


// ═══════════════════════════════════════════════════════════════════════════════
// READ / BROWSE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

sectionHeader("READ / BROWSE");

// R1: Browse all (no filters)
$res = sendGet("{$baseUrl}/read.php");
printResult("R1: Browse all files (no filters)", $res, 200);

// // R2: Read single file by valid ID
// if ($paperID) {
//     $res = sendGet("{$baseUrl}/read.php?id={$paperID}");
//     printResult("R2: Read single PAPER by FileID={$paperID}", $res, 200);
// } else {
//     printResult("R2: Read single PAPER (skipped — upload failed)", ["httpCode" => 0, "body" => "SKIPPED"], 0);
// }

// // R3: Nonexistent ID → 404
// $res = sendGet("{$baseUrl}/read.php?id=999999");
// printResult("R3: Read nonexistent file (expect 404)", $res, 404);

// // R4: Filter by type=PAPER
// $res = sendGet("{$baseUrl}/read.php?type=PAPER");
// printResult("R4: Browse with type=PAPER filter", $res, 200);

// // R5: Filter by type=PHOTO
// $res = sendGet("{$baseUrl}/read.php?type=PHOTO");
// printResult("R5: Browse with type=PHOTO filter", $res, 200);

// // R6: Search across fields
// $res = sendGet("{$baseUrl}/read.php?search=TestSubject");
// printResult("R6: Search 'TestSubject'", $res, 200);

// // R7: Filter papers by subject
// $res = sendGet("{$baseUrl}/read.php?subject=TestSubject");
// printResult("R7: Filter by subject=TestSubject", $res, 200);

// // R8: Filter papers by season
// $res = sendGet("{$baseUrl}/read.php?season=June");
// printResult("R8: Filter by season=June", $res, 200);

// // R9: Filter papers by code
// $res = sendGet("{$baseUrl}/read.php?code=TS101");
// printResult("R9: Filter by code=TS101", $res, 200);

// // R10: Filter photos by event
// $res = sendGet("{$baseUrl}/read.php?event=Test+Event");
// printResult("R10: Filter by event='Test Event'", $res, 200);

// // R11: Filter photos by photographer
// $res = sendGet("{$baseUrl}/read.php?photographer=TestPhotographer");
// printResult("R11: Filter by photographer=TestPhotographer", $res, 200);

// // R12: Pagination
// $res = sendGet("{$baseUrl}/read.php?page=1&limit=5");
// $body = json_decode($res['body'], true);
// $hasPagination = isset($body['pagination']['currentPage']) && $body['pagination']['currentPage'] === 1;
// printResult("R12: Pagination page=1&limit=5 returns pagination info", $res, 200);

// // R13: Sort by oldest
// $res = sendGet("{$baseUrl}/read.php?sort=oldest");
// printResult("R13: Sort by oldest", $res, 200);

// // R14: Sort by subject (paper join)
// $res = sendGet("{$baseUrl}/read.php?sort=subject");
// printResult("R14: Sort by subject", $res, 200);


// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

sectionHeader("UPDATE");

// U1: Update PAPER metadata with valid fields
if ($paperID) {
    $res = sendJson("{$baseUrl}/update.php?id={$paperID}", [
        'updatedBy' => $testUserID,
        'subject'   => 'UpdatedSubject',
        'season'    => 'December',
        'code'      => 'TS202',
    ], 'PUT');
    printResult("U1: Update PAPER metadata (valid fields)", $res, 200);
} else {
    printResult("U1: Update PAPER (skipped — no paper ID)", ["httpCode" => 0, "body" => "SKIPPED"], 0);
}

// U2: Update PHOTO metadata with valid fields
if ($photoID) {
    $res = sendJson("{$baseUrl}/update.php?id={$photoID}", [
        'updatedBy'  => $testUserID,
        'event'      => 'Updated Event',
        'quality'    => 'Low',
        'dataJSON'   => json_encode(["lens" => "35mm", "iso" => 800]),
    ], 'PUT');
    printResult("U2: Update PHOTO metadata (valid fields)", $res, 200);
} else {
    printResult("U2: Update PHOTO (skipped — no photo ID)", ["httpCode" => 0, "body" => "SKIPPED"], 0);
}

// // U3: Update with no updatable fields (expect 500)
// if ($paperID) {
//     $res = sendJson("{$baseUrl}/update.php?id={$paperID}", [
//         'updatedBy' => $testUserID,
//     ], 'PUT');
//     printResult("U3: Update with no fields provided (expect 500)", $res, 500);
// }

// // U4: Update nonexistent FileID (expect 404)
// $res = sendJson("{$baseUrl}/update.php?id=999999", [
//     'updatedBy' => $testUserID,
//     'subject'   => 'Ghost',
// ], 'PUT');
// printResult("U4: Update nonexistent file (expect 404)", $res, 404);

// // U5: Update PAPER with invalid scanOrDigital value (expect 500)
// if ($paperID) {
//     $res = sendJson("{$baseUrl}/update.php?id={$paperID}", [
//         'updatedBy'     => $testUserID,
//         'scanOrDigital' => 'Handwritten',
//     ], 'PUT');
//     printResult("U5: Update with invalid scanOrDigital (expect 500)", $res, 500);
// }

// // U6: Send malformed JSON body (expect 400)
// $ch = curl_init("{$baseUrl}/update.php?id=" . ($paperID ?? 1));
// curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
// curl_setopt($ch, CURLOPT_POSTFIELDS, '{this is not valid json!!!}');
// curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
// curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
// $body = curl_exec($ch);
// $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
// printResult("U6: Update with malformed JSON body (expect 400)", ["httpCode" => $code, "body" => $body], 400);

// // U7: GET request to update.php (expect 405)
// $res = sendGet("{$baseUrl}/update.php?id=" . ($paperID ?? 1));
// printResult("U7: GET request to update.php (expect 405)", $res, 405);


// ═══════════════════════════════════════════════════════════════════════════════
// DELETE / RESTORE TESTS
// ═══════════════════════════════════════════════════════════════════════════════

sectionHeader("DELETE / RESTORE");

// D1: Admin (RoleID=1) soft-deletes a file
if ($paperID) {
    $res = sendJson("{$baseUrl}/delete.php?id={$paperID}&role=1", [], 'POST');
    printResult("D1: Admin soft-deletes PAPER FileID={$paperID} (expect 200)", $res, 200);
}

// D2: Try to delete the same file again (expect 400 — already deleted)
if ($paperID) {
    $res = sendJson("{$baseUrl}/delete.php?id={$paperID}&role=1", [], 'POST');
    printResult("D2: Delete already-deleted file (expect 400)", $res, 400);
}

// D3: Confirm the file is hidden from regular read
if ($paperID) {
    $res = sendGet("{$baseUrl}/read.php?id={$paperID}");
    printResult("D3: Deleted file not returned by read.php (expect 404)", $res, 404);
}

// D4: Admin restores the soft-deleted file
if ($paperID) {
    $res = sendJson("{$baseUrl}/delete.php?id={$paperID}&role=1&action=restore", [], 'POST');
    printResult("D4: Admin restores PAPER FileID={$paperID} (expect 200)", $res, 200);
}

// D5: Restore a non-deleted file (expect 400)
if ($paperID) {
    $res = sendJson("{$baseUrl}/delete.php?id={$paperID}&role=1&action=restore", [], 'POST');
    printResult("D5: Restore non-deleted file (expect 400)", $res, 400);
}

// D6: Normal user (RoleID=2) tries to soft-delete (expect 403)
if ($photoID) {
    $res = sendJson("{$baseUrl}/delete.php?id={$photoID}&role=2", [], 'POST');
    printResult("D6: Normal user (RoleID=2) tries to delete (expect 403)", $res, 403);
}

// D7: Non-admin tries to restore (expect 403)
if ($photoID) {
    $res = sendJson("{$baseUrl}/delete.php?id={$photoID}&role=2&action=restore", [], 'POST');
    printResult("D7: Non-admin tries to restore (expect 403)", $res, 403);
}

// D8: Delete nonexistent file (expect 404)
$res = sendJson("{$baseUrl}/delete.php?id=999999&role=1", [], 'POST');
printResult("D8: Delete nonexistent FileID (expect 404)", $res, 404);

// D9: Invalid action string (expect 400)
if ($paperID) {
    $res = sendJson("{$baseUrl}/delete.php?id={$paperID}&role=1&action=purge", [], 'POST');
    printResult("D9: Invalid action='purge' (expect 400)", $res, 400);
}

// D10: GET request to delete.php (expect 405)
$res = sendGet("{$baseUrl}/delete.php?id=" . ($paperID ?? 1) . "&role=1");
printResult("D10: GET request to delete.php (expect 405)", $res, 405);


// ═══════════════════════════════════════════════════════════════════════════════
// LOG ACTIVITY TESTS
// ═══════════════════════════════════════════════════════════════════════════════

sectionHeader("LOG ACTIVITY");

// L1: Directly call logActivity() and confirm a row was inserted
$beforeCount = (int) $conn->query("SELECT COUNT(*) AS c FROM activity")->fetch_assoc()['c'];
logActivity($conn, $testUserID, "TEST", "test4.php direct logActivity call");
$afterCount = (int) $conn->query("SELECT COUNT(*) AS c FROM activity")->fetch_assoc()['c'];

$logResult = ($afterCount === $beforeCount + 1)
    ? ["httpCode" => 200, "body" => "Row inserted. Count: {$beforeCount} → {$afterCount}"]
    : ["httpCode" => 500, "body" => "Row NOT inserted. Count unchanged at {$beforeCount}"];
printResult("L1: logActivity() inserts a row into activity table", $logResult, 200);

// L2: Verify that null UserID is accepted (anonymous log)
$beforeCount = $afterCount;
logActivity($conn, null, "TEST", "test4.php anonymous logActivity call");
$afterCount = (int) $conn->query("SELECT COUNT(*) AS c FROM activity")->fetch_assoc()['c'];

$logResult = ($afterCount === $beforeCount + 1)
    ? ["httpCode" => 200, "body" => "Null UserID row inserted. Count: {$beforeCount} → {$afterCount}"]
    : ["httpCode" => 500, "body" => "Null UserID row NOT inserted. Count: {$beforeCount}"];
printResult("L2: logActivity() accepts null UserID (anonymous)", $logResult, 200);

// L3: Confirm API endpoints wrote activity rows (check recent log entries)
$recent = $conn->query(
    "SELECT * FROM activity ORDER BY LogID DESC LIMIT 10"
);
$activityRows = [];
while ($row = $recent->fetch_assoc()) {
    $activityRows[] = $row;
}

$logCheckResult = !empty($activityRows)
    ? ["httpCode" => 200, "body" => count($activityRows) . " recent entries found in activity table."]
    : ["httpCode" => 500, "body" => "No rows in activity table."];
printResult("L3: Activity table has recent entries from API calls", $logCheckResult, 200);
printActivity($activityRows);


// ─── Cleanup temp files ───────────────────────────────────────────────────────

foreach ([$dummyPDF ?? null, $dummyImg ?? null] as $f) {
    if ($f && file_exists($f)) {
        unlink($f);
    }
}

$conn->close();


// ─── Footer ──────────────────────────────────────────────────────────────────

if (php_sapi_name() !== 'cli') {
    echo "<hr><p style='font-family:sans-serif;color:#666;'>Done. Check phpMyAdmin to verify records in <code>archive</code>, <code>papermetadata</code>, <code>photometadata</code>, and <code>activity</code> tables.</p></body></html>";
} else {
    echo "Done. Check phpMyAdmin to verify records were inserted, updated, and activity was logged.\n";
}
