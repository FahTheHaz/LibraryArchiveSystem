<?php
/**
 * testing.php
 * 
 * Run this to test create.php without needing the React frontend.
 * 
 * Usage (browser):  http://localhost/las/backend/tests/test2.php
 * Usage (terminal):  php testing.php
 * 
 * Make sure create.php is accessible at the $baseUrl below.
 * Adjust $baseUrl if your folder structure is different.
 */

// ─── Configuration ───

// Change this to match where create.php actually lives on your XAMPP
$baseUrl = "http://localhost/las/backend/api/create.php";

// A valid UserID from your account table (check phpMyAdmin)
$testUserID = 1;

// Where to create temporary test files
$tmpDir = sys_get_temp_dir();


// ─── Helper Functions ───

/**
 * Sends a POST request with file + form data using cURL.
 * Returns an array with 'httpCode' and 'body'.
 */
function sendUpload($url, $filePath, $postFields) {
    $cFile = new CURLFile($filePath, mime_content_type($filePath), basename($filePath));
    $postFields['file'] = $cFile;

    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postFields);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($curlError) {
        return ["httpCode" => 0, "body" => "cURL error: " . $curlError];
    }

    return ["httpCode" => $httpCode, "body" => $response];
}

/**
 * Creates a temporary dummy PDF file for testing.
 * It's not a real PDF internally, just enough to pass the extension check.
 */
function createDummyPDF($tmpDir, $name = "test_paper.pdf") {
    $path = $tmpDir . DIRECTORY_SEPARATOR . $name;
    // Minimal PDF header so it looks legit
    $content = "%PDF-1.4\n1 0 obj\n<< /Type /Catalog >>\nendobj\n%%EOF";
    file_put_contents($path, $content);
    return $path;
}

/**
 * Creates a temporary dummy image file for testing.
 */
function createDummyImage($tmpDir, $name = "test_photo.jpg") {
    $path = $tmpDir . DIRECTORY_SEPARATOR . $name;
    // Create a tiny 1x1 pixel JPEG using GD
    if (function_exists('imagecreate')) {
        $img = imagecreatetruecolor(1, 1);
        imagejpeg($img, $path);
        imagedestroy($img);
    } else {
        // Fallback: just write some bytes
        file_put_contents($path, str_repeat("\xFF", 100));
    }
    return $path;
}

/**
 * Prints the result of a test in a readable format.
 */
function printResult($testName, $result, $expectCode) {
    $passed = ($result['httpCode'] === $expectCode);
    $status = $passed ? "PASS" : "FAIL";
    $colour = $passed ? "32" : "31"; // green or red

    // If running in browser, use HTML. If terminal, use ANSI colours.
    if (php_sapi_name() !== 'cli') {
        $bgColour = $passed ? "#d4edda" : "#f8d7da";
        $textColour = $passed ? "#155724" : "#721c24";
        echo "<div style='padding:10px; margin:8px 0; border-radius:6px; background:{$bgColour}; color:{$textColour}; font-family:monospace;'>";
        echo "<strong>[{$status}] {$testName}</strong><br>";
        echo "Expected HTTP {$expectCode}, got HTTP {$result['httpCode']}<br>";
        echo "Response: <code>" . htmlspecialchars($result['body']) . "</code>";
        echo "</div>";
    } else {
        echo "\033[{$colour}m[{$status}]\033[0m {$testName}\n";
        echo "  Expected: HTTP {$expectCode} | Got: HTTP {$result['httpCode']}\n";
        echo "  Response: {$result['body']}\n\n";
    }
}


// ─── Start Output ───-----------------------------------------------------------------------------------------------------------

if (php_sapi_name() !== 'cli') {
    echo "<!DOCTYPE html><html><head><title>LAS create.php Tests</title></head><body>";
    echo "<h1 style='font-family:sans-serif;'>LAS create.php Test Results</h1>";
    echo "<p style='font-family:sans-serif; color:#666;'>Target: <code>{$baseUrl}</code></p>";
    echo "<p style='font-family:sans-serif; color:#666;'>Test UserID: {$testUserID}</p><hr>";
}

echo (php_sapi_name() === 'cli') ? "Testing create.php at: {$baseUrl}\n\n" : "";


// ═══════════════════════════════════════════════
// TEST 1: Upload a PAPER with full metadata
// ═══════════════════════════════════════════════

$dummyPDF = createDummyPDF($tmpDir); 
// goes to the function and creates that shit


$result = sendUpload($baseUrl, $dummyPDF, [
    'fileType'       => 'PAPER',
    'uploadedBy'     => $testUserID,
    'subject'        => 'Fiqh',
    'monthYear'      => '2024-06-01',
    'season'         => 'June',
    'semester'       => 'Semester 2',
    'code'           => 'FQ201',
    'scanOrDigital'  => 'Digital',
]);

printResult("Upload PAPER with full metadata", $result, 201);


// ═══════════════════════════════════════════════
// TEST 2: Upload a PHOTO with full metadata
// ═══════════════════════════════════════════════

$dummyImg = createDummyImage($tmpDir);

$result = sendUpload($baseUrl, $dummyImg, [
    'fileType'       => 'PHOTO',
    'uploadedBy'     => $testUserID,
    'event'          => 'Graduation Ceremony 2025',
    'photographer'   => 'Ahmad',
    'pictureDate'    => '2025-03-20 10:30:00',
    'quality'        => 'High',
    'dataJSON'       => json_encode([
        "lens"     => "50mm",
        "aperture" => "f/1.8",
        "iso"      => 400
    ]),
]);

printResult("Upload PHOTO with full metadata", $result, 201);


// ═══════════════════════════════════════════════
// TEST 3: Upload PAPER with minimal metadata (only required fields)
// ═══════════════════════════════════════════════

$dummyPDF2 = createDummyPDF($tmpDir, "test_paper_minimal.pdf");

$result = sendUpload($baseUrl, $dummyPDF2, [
    'fileType'   => 'PAPER',
    'uploadedBy' => $testUserID,
]);

printResult("Upload PAPER with minimal metadata", $result, 201);


// ═══════════════════════════════════════════════
// TEST 4: Missing fileType (should fail)
// ═══════════════════════════════════════════════

$dummyPDF3 = createDummyPDF($tmpDir, "test_no_type.pdf");

$result = sendUpload($baseUrl, $dummyPDF3, [
    'uploadedBy' => $testUserID,
]);

printResult("Missing fileType (expect 400)", $result, 400);


// ═══════════════════════════════════════════════
// TEST 5: Invalid fileType (should fail)
// ═══════════════════════════════════════════════

$dummyPDF4 = createDummyPDF($tmpDir, "test_bad_type.pdf");

$result = sendUpload($baseUrl, $dummyPDF4, [
    'fileType'   => 'VIDEO',
    'uploadedBy' => $testUserID,
]);

printResult("Invalid fileType 'VIDEO' (expect 400)", $result, 400);


// ═══════════════════════════════════════════════
// TEST 6: Missing uploadedBy (should fail)
// ═══════════════════════════════════════════════

$dummyPDF5 = createDummyPDF($tmpDir, "test_no_user.pdf");

$result = sendUpload($baseUrl, $dummyPDF5, [
    'fileType' => 'PAPER',
]);

printResult("Missing uploadedBy (expect 400)", $result, 400);


// ═══════════════════════════════════════════════
// TEST 7: Invalid file extension for PAPER (e.g. .exe)
// ═══════════════════════════════════════════════

$badFile = $tmpDir . DIRECTORY_SEPARATOR . "malicious.exe";
file_put_contents($badFile, "not a real exe");

$result = sendUpload($baseUrl, $badFile, [
    'fileType'   => 'PAPER',
    'uploadedBy' => $testUserID,
]);

printResult("Bad file extension .exe for PAPER (expect 400)", $result, 400);


// ═══════════════════════════════════════════════
// TEST 8: Invalid scanOrDigital value (should fail)
// ═══════════════════════════════════════════════

$dummyPDF6 = createDummyPDF($tmpDir, "test_bad_scan.pdf");

$result = sendUpload($baseUrl, $dummyPDF6, [
    'fileType'       => 'PAPER',
    'uploadedBy'     => $testUserID,
    'scanOrDigital'  => 'Handwritten',
]);

printResult("Invalid scanOrDigital value (expect 500)", $result, 500);


// ═══════════════════════════════════════════════
// TEST 9: Invalid JSON in dataJSON for PHOTO (should fail)
// ═══════════════════════════════════════════════

$dummyImg2 = createDummyImage($tmpDir, "test_bad_json.jpg");

$result = sendUpload($baseUrl, $dummyImg2, [
    'fileType'   => 'PHOTO',
    'uploadedBy' => $testUserID,
    'dataJSON'   => '{this is not valid json!!!}',
]);

printResult("Invalid dataJSON for PHOTO (expect 500)", $result, 500);


// ═══════════════════════════════════════════════
// TEST 10: No file attached at all (should fail)
// ═══════════════════════════════════════════════

// Send POST without any file
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $baseUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, [
    'fileType'   => 'PAPER',
    'uploadedBy' => $testUserID,
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

printResult("No file attached (expect 400)", ["httpCode" => $httpCode, "body" => $response], 400);


// ─── Cleanup temp files ───

$tempFiles = [
    $dummyPDF ?? null, $dummyImg ?? null, $dummyPDF2 ?? null,
    $dummyPDF3 ?? null, $dummyPDF4 ?? null, $dummyPDF5 ?? null,
    $dummyPDF6 ?? null, $dummyImg2 ?? null, $badFile ?? null,
];
foreach ($tempFiles as $f) {
    if ($f && file_exists($f)) {
        unlink($f);
    }
}


// ─── Summary ───

if (php_sapi_name() !== 'cli') {
    echo "<hr><p style='font-family:sans-serif; color:#666;'>Done. Check phpMyAdmin to verify that the successful uploads actually appear in the <code>archive</code>, <code>papermetadata</code>, <code>photometadata</code>, and <code>activity</code> tables.</p>";
    echo "</body></html>";
} else {
    echo "Done. Check phpMyAdmin to verify records were inserted.\n";
}