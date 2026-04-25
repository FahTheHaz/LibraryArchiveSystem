<?php
/**
 * update.php
 * Handles updating metadata for existing archive files.
 * 
 * Accepts PUT or POST with JSON body.
 * Requires: id (FileID) in the query string or JSON body.
 * 
 * Example usage:
 *   PUT /update.php?id=5
 *   Body: { "subject": "Tawhid", "season": "December", "code": "TW301" }
 * 
 * Can update:
 *   - Paper metadata: subject, monthYear, season, semester, code, scanOrDigital
 *   - Photo metadata: dataJSON, quality, pictureDate, event, photographer
 *   - File type cannot be changed after upload.
 */

// ─── CORS & Headers ───
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: PUT, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if (!in_array($_SERVER['REQUEST_METHOD'], ['PUT', 'POST'])) {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed. Use PUT or POST."]);
    exit();
}

// ─── Database Connection ───
$host = "localhost";
$dbname = "las_db";
$dbuser = "root";
$dbpass = "";

$conn = new mysqli($host, $dbuser, $dbpass, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed."]);
    exit();
}

// ─── Parse Input ───

// Read the JSON body
$rawInput = file_get_contents("php://input");
$data = json_decode($rawInput, true);

if ($data === null && json_last_error() !== JSON_ERROR_NONE) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid JSON in request body."]);
    $conn->close();
    exit();
}

// FileID can come from query string or JSON body
$fileID = isset($_GET['id']) ? intval($_GET['id']) : (isset($data['id']) ? intval($data['id']) : 0);

if ($fileID <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "Missing or invalid file ID."]);
    $conn->close();
    exit();
}

session_start();


// Optional: who is performing the update (for activity logging)
require_once __DIR__ . '/../../utils/logActivity.php';
$userID = $_SESSION['userID'] ?? null; // For logging purposes, if we have session info available
$updatedBy = isset($data['updatedBy']) ? intval($data['updatedBy']) : null;

// ─── Check the File Exists and Get Its Type ───

$checkStmt = $conn->prepare(
    "SELECT FileID, FileType FROM archive WHERE FileID = ? AND deletedAt IS NULL"
);
$checkStmt->bind_param("i", $fileID);
$checkStmt->execute();
$checkResult = $checkStmt->get_result();

if ($checkResult->num_rows === 0) {
    http_response_code(404);
    echo json_encode(["error" => "File not found or has been deleted."]);
    $checkStmt->close();
    $conn->close();
    exit();
}

$fileRecord = $checkResult->fetch_assoc();
// what does this do?
// ans: It fetches the next row from the result set as an associative array, where the keys are the column names. In this case, it will give us an array with 'FileID' and 'FileType' for the file we are trying to update.
$fileType = $fileRecord['FileType'];

$checkStmt->close();

// ─── Build the Update ───

$conn->begin_transaction();

try {
    $updatedFields = [];

    if ($fileType === 'PAPER') {
        // Collect only the fields that were actually sent
        $paperFields = [];
        $paperParams = [];
        $paperTypes = "";

        if (array_key_exists('subject', $data)) {
            $paperFields[] = "Subject = ?";
            $paperParams[] = $data['subject'];
            $paperTypes .= "s";
            $updatedFields[] = "Subject";
        }
        if (array_key_exists('monthYear', $data)) {
            $paperFields[] = "MonthYear = ?";
            $paperParams[] = $data['monthYear'];
            $paperTypes .= "s";
            $updatedFields[] = "MonthYear";
        }
        if (array_key_exists('season', $data)) {
            $paperFields[] = "Season = ?";
            $paperParams[] = $data['season'];
            $paperTypes .= "s";
            $updatedFields[] = "Season";
        }
        if (array_key_exists('semester', $data)) {
            $paperFields[] = "Semester = ?";
            $paperParams[] = $data['semester'];
            $paperTypes .= "s";
            $updatedFields[] = "Semester";
        }
        if (array_key_exists('code', $data)) {
            $paperFields[] = "Code = ?";
            $paperParams[] = $data['code'];
            $paperTypes .= "s";
            $updatedFields[] = "Code";
        }
        if (array_key_exists('scanOrDigital', $data)) {
            $val = $data['scanOrDigital'];
            if ($val !== null && !in_array($val, ['Scanned', 'Digital'])) {
                throw new Exception("scanOrDigital must be 'Scanned', 'Digital', or null.");
            }
            $paperFields[] = "ScanOrDigital = ?";
            $paperParams[] = $val;
            $paperTypes .= "s";
            $updatedFields[] = "ScanOrDigital";
        }

        if (empty($paperFields)) {
            throw new Exception("No valid fields provided to update.");
        }

        $sql = "UPDATE papermetadata SET " . implode(", ", $paperFields) . " WHERE FileID = ?";
        $paperParams[] = $fileID;
        $paperTypes .= "i";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param($paperTypes, ...$paperParams);
        $stmt->execute();

        if ($stmt->affected_rows === 0 && $stmt->errno !== 0) {
            throw new Exception("Failed to update paper metadata.");
        }
        $stmt->close();

    } elseif ($fileType === 'PHOTO') {
        $photoFields = [];
        $photoParams = [];
        $photoTypes = "";

        if (array_key_exists('dataJSON', $data)) {
            $val = $data['dataJSON'];
            // Accept either a JSON string or an object/array
            if ($val !== null) {
                if (is_array($val)) {
                    $val = json_encode($val);
                } else {
                    // Validate it's proper JSON if passed as string
                    json_decode($val);
                    if (json_last_error() !== JSON_ERROR_NONE) {
                        throw new Exception("dataJSON is not valid JSON.");
                    }
                }
            }
            $photoFields[] = "DataJSON = ?";
            $photoParams[] = $val;
            $photoTypes .= "s";
            $updatedFields[] = "DataJSON";
        }
        if (array_key_exists('quality', $data)) {
            $photoFields[] = "Quality = ?";
            $photoParams[] = $data['quality'];
            $photoTypes .= "s";
            $updatedFields[] = "Quality";
        }
        if (array_key_exists('pictureDate', $data)) {
            $photoFields[] = "PictureDate = ?";
            $photoParams[] = $data['pictureDate'];
            $photoTypes .= "s";
            $updatedFields[] = "PictureDate";
        }
        if (array_key_exists('event', $data)) {
            $photoFields[] = "Event = ?";
            $photoParams[] = $data['event'];
            $photoTypes .= "s";
            $updatedFields[] = "Event";
        }
        if (array_key_exists('photographer', $data)) {
            $photoFields[] = "Photographer = ?";
            $photoParams[] = $data['photographer'];
            $photoTypes .= "s";
            $updatedFields[] = "Photographer";
        }

        if (empty($photoFields)) {
            throw new Exception("No valid fields provided to update.");
        }

        $sql = "UPDATE photometadata SET " . implode(", ", $photoFields) . " WHERE FileID = ?";
        $photoParams[] = $fileID;
        $photoTypes .= "i";

        $stmt = $conn->prepare($sql);
        $stmt->bind_param($photoTypes, ...$photoParams);
        $stmt->execute();

        if ($stmt->affected_rows === 0 && $stmt->errno !== 0) {
            throw new Exception("Failed to update photo metadata.");
        }
        $stmt->close();
    }

    // ─── Log the Activity ───

    // $ipRaw = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    // $ipBinary = inet_pton($ipRaw);
    // $actionType = "UPDATE";
    // $fieldsStr = implode(", ", $updatedFields);
    // $description = "Updated FileID {$fileID}: {$fieldsStr}";

    // $logStmt = $conn->prepare(
    //     "INSERT INTO activity (UserID, IPAddress, ActionType, Describtion) VALUES (?, ?, ?, ?)"
    // );
    // $logStmt->bind_param("isss", $updatedBy, $ipBinary, $actionType, $description);
    // $logStmt->execute();
    // $logStmt->close();

    require_once __DIR__ . '/../../utils/logActivity.php';
    logActivity($conn, $updatedBy, "UPDATE", "Updated FileID {$fileID}: " . implode(", ", $updatedFields));
    

    $conn->commit();

    http_response_code(200);
    echo json_encode([
        "message"       => "File metadata updated successfully.",
        "fileID"        => $fileID,
        "updatedFields" => $updatedFields,
    ]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["error" => "Update failed: " . $e->getMessage()]);
}

$conn->close();
