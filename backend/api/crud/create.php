<?php
/**
 * create.php
 * Handles file uploads to the LAS archive.
 * Accepts a file + metadata via POST, inserts into `archive`,
 * then into either `papermetadata` or `photometadata` depending on FileType.
 */

// ─── CORS & Headers ───
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed. Use POST."]);
    exit();
}

// ─── Auth Guard ───
require_once __DIR__ . '/../../utils/auth.php';
// $currentUserID and $currentRoleID are now available

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


// Optional display name — defaults to original uploaded filename if blank
$fileName = trim($_POST['fileName'] ?? '');

// ─── Validate the Upload ───

// Check that a file was actually sent
if (!isset($_FILES['file']) || $_FILES['file']['error'] !== UPLOAD_ERR_OK) {
    http_response_code(400);
    echo json_encode(["error" => "No file uploaded or upload error occurred."]);
    exit();
}

// Required field: FileType (PAPER or PHOTO)
$fileType = isset($_POST['fileType']) ? strtoupper(trim($_POST['fileType'])) : '';

if (!in_array($fileType, ['PAPER', 'PHOTO'])) {
    http_response_code(400);
    echo json_encode(["error" => "Invalid or missing fileType. Must be PAPER or PHOTO."]);
    exit();
}

// UploadedBy comes from the verified session (set by auth.php)
$uploadedBy = $currentUserID;

// Optional: folder to place the file in
$folderID = isset($_POST['folderID']) && intval($_POST['folderID']) > 0 ? intval($_POST['folderID']) : null;

// ─── File Handling ───

$file = $_FILES['file'];
$originalName = basename($file['name']);
if ($fileName === '') $fileName = $originalName;
$fileSize = $file['size'];
$tmpPath = $file['tmp_name'];

// Set max file size (e.g. 50MB)
$maxSize = 50 * 1024 * 1024;
if ($fileSize > $maxSize) {
    http_response_code(400);
    echo json_encode(["error" => "File exceeds the 50MB size limit."]);
    exit();
}

// Allowed extensions per type
$allowedPaper = ['pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg'];
$allowedPhoto = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'tiff'];

$ext = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));

if ($fileType === 'PAPER' && !in_array($ext, $allowedPaper)) {
    http_response_code(400);
    echo json_encode(["error" => "File type not allowed for PAPER. Allowed: " . implode(', ', $allowedPaper)]);
    exit();
}

if ($fileType === 'PHOTO' && !in_array($ext, $allowedPhoto)) {
    http_response_code(400);
    echo json_encode(["error" => "File type not allowed for PHOTO. Allowed: " . implode(', ', $allowedPhoto)]);
    exit();
}

// Build the storage path
// Using static folder approach: uploads/papers/ or uploads/photos/
$subFolder = ($fileType === 'PAPER') ? 'papers' : 'photos';
$uploadDir = __DIR__ . "/../../uploads/{$subFolder}/";

// Create directory if it doesn't exist
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Generate a unique filename to avoid collisions
$uniqueName = time() . '_' . bin2hex(random_bytes(4)) . '.' . $ext;
$destinationPath = $uploadDir . $uniqueName;

// Relative path to store in DB
$dbFilePath = "/uploads/{$subFolder}/{$uniqueName}";

// Move the file from temp to our uploads folder
if (!move_uploaded_file($tmpPath, $destinationPath)) {
    http_response_code(500);
    echo json_encode(["error" => "Failed to save the uploaded file."]);
    exit();
}

// ─── Insert into `archive` Table ───

$conn->begin_transaction();

try {
    $stmt = $conn->prepare(
        "INSERT INTO archive (FileType, UploadedBy, filePath, folderID) VALUES (?, ?, ?, ?)"
    );
    $stmt->bind_param("sisi", $fileType, $uploadedBy, $dbFilePath, $folderID);
    $stmt->execute();

    $fileID = $conn->insert_id;
    $stmt->close();

    // ─── Insert Metadata ───

    if ($fileType === 'PAPER') {
        // Grab paper-specific fields from POST
        $subject      = isset($_POST['subject'])       ? trim($_POST['subject'])       : null;
        $monthYear    = isset($_POST['monthYear'])      ? trim($_POST['monthYear'])     : null;
        $season       = isset($_POST['season'])         ? trim($_POST['season'])        : null;
        $semester     = isset($_POST['semester'])        ? trim($_POST['semester'])      : null;
        $code         = isset($_POST['code'])            ? trim($_POST['code'])          : null;
        $scanOrDigital = isset($_POST['scanOrDigital']) ? trim($_POST['scanOrDigital']) : null;

        // Validate scanOrDigital if provided
        if ($scanOrDigital !== null && !in_array($scanOrDigital, ['Scanned', 'Digital'])) {
            throw new Exception("scanOrDigital must be 'Scanned' or 'Digital'.");
        }

        $metaStmt = $conn->prepare(
            "INSERT INTO papermetadata (FileID, Subject, MonthYear, Season, Semester, Code, ScanOrDigital, fileName)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $metaStmt->bind_param(
            "isssssss",
            $fileID, $subject, $monthYear, $season, $semester, $code, $scanOrDigital, $fileName
        );
        $metaStmt->execute();
        $metaStmt->close();

    } elseif ($fileType === 'PHOTO') {
        // Grab photo-specific fields from POST
        $dataJSON     = isset($_POST['dataJSON'])      ? trim($_POST['dataJSON'])      : null;
        $quality      = isset($_POST['quality'])        ? trim($_POST['quality'])       : null;
        $pictureDate  = isset($_POST['pictureDate'])    ? trim($_POST['pictureDate'])   : null;
        $event        = isset($_POST['event'])          ? trim($_POST['event'])         : null;
        $photographer = isset($_POST['photographer'])   ? trim($_POST['photographer'])  : null;

        // Validate dataJSON is valid JSON if provided
        if ($dataJSON !== null) {
            json_decode($dataJSON);
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception("dataJSON is not valid JSON.");
            }
        }

        // PhotoID needs to be provided or auto-generated
        // Based on your schema, PhotoID is INT PRIMARY KEY but NOT auto_increment
        // So we need to handle this. One option: use FileID as PhotoID for simplicity.
        $photoID = $fileID;

        $metaStmt = $conn->prepare(
            "INSERT INTO photometadata (FileID, PhotoID, DataJSON, Quality, PictureDate, Event, Photographer, fileName)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $metaStmt->bind_param(
            "iissssss",
            $fileID, $photoID, $dataJSON, $quality, $pictureDate, $event, $photographer, $fileName
        );
        $metaStmt->execute();
        $metaStmt->close();
    }

    // ─── Queue for AI Processing ───
    $qStmt = $conn->prepare(
        "INSERT INTO ProcessingQueue (FileID, Status, TargetMethod) VALUES (?, 'pending', 'local')"
    );
    $qStmt->bind_param("i", $fileID);
    $qStmt->execute();
    $qStmt->close();

    // ─── Log the Activity ───
    // In a real application, you would get the user's IP from the request and log it properly. For now, we'll just use a placeholder.
    // 
    // // May need to make logactivity a function to avoid repetition in other endpoints.
    // $ipRaw = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'; // fake ip
    // $ipBinary = inet_pton($ipRaw);
    // $actionType = "UPLOAD";
    // $description = "Uploaded {$fileType}: {$originalName}";

    // $logStmt = $conn->prepare(
    //     "INSERT INTO activity (UserID, IPAddress, ActionType, Describtion) VALUES (?, ?, ?, ?)"
    // );
    // // Note: column is spelled "Describtion" in your DB schema (typo preserved)
    // $logStmt->bind_param("isss", $uploadedBy, $ipBinary, $actionType, $description);
    // $logStmt->execute();
    // $logStmt->close();
    require_once __DIR__ . '/../../utils/logActivity.php';
    logActivity($conn, $uploadedBy, "UPLOAD", "Uploaded {$fileType}: {$originalName}", $fileID);
    
    

    // ─── Commit Everything ───

    $conn->commit();

    http_response_code(201);
    echo json_encode([
        "message" => "File uploaded successfully.",
        "fileID"  => $fileID,
        "filePath" => $dbFilePath
    ]);

} catch (Exception $e) {
    $conn->rollback();

    // If the DB insert failed, clean up the uploaded file
    if (file_exists($destinationPath)) {
        unlink($destinationPath);
    }

    http_response_code(500);
    echo json_encode(["error" => "Upload failed: " . $e->getMessage()]);
}

$conn->close();