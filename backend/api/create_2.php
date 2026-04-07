<!-- Ignore this -->
<?php
require_once __DIR__ . '/../../config/db.php';

// $sql = "SELECT FileID, FilePath FROM Archive";
// $stmt = $conn->query($sql);
// $files = $stmt->fetchAll(PDO::FETCH_ASSOC);

/**
 * create.php
 * Handles file uploads and stores file information in a database.
 * Assumes you have a db.php file that creates a PDO connection ($pdo).
 * 
 * Two storage methods are shown:
 * 1. Store file on filesystem and save path in database (recommended).
 * 2. Store file content as BLOB in database (alternative, commented out).
 * 
 * Adjust the database table structure and configuration as needed.
 */

// Include database connection

// Configuration
$uploadDir = __DIR__ . '/uploads/'; // Directory to store uploaded files (outside webroot for security)
$allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain']; // Allowed MIME types
$maxFileSize = 5 * 1024 * 1024; // 5 MB

// Ensure upload directory exists and is writable
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Initialize message variable
$message = '';

// Handle form submission
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['file'])) {

    // Check for upload errors
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $message = 'Upload failed with error code: ' . $file['error'];
    } else {
        // Validate file size
        if ($file['size'] > $maxFileSize) {
            $message = 'File is too large. Maximum size is ' . ($maxFileSize / 1024 / 1024) . ' MB.';
        }
        // Validate file type
        elseif (!in_array($file['type'], $allowedTypes)) {
            $message = 'File type not allowed. Allowed types: ' . implode(', ', $allowedTypes);
        } else {
            // Generate a unique filename to avoid collisions
            $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
            $filename = uniqid() . '_' . bin2hex(random_bytes(8)) . '.' . $extension;
            $destination = $uploadDir . $filename;

            // Move uploaded file to destination
            if (move_uploaded_file($file['tmp_name'], $destination)) {
                // Option 1: Store file metadata in database (file path)
                try {
                    $sql = "INSERT INTO files (original_name, stored_name, file_path, mime_type, size, uploaded_at) 
                            VALUES (:original_name, :stored_name, :file_path, :mime_type, :size, NOW())";
                    $stmt = $pdo->prepare($sql);
                    $stmt->execute([
                        ':original_name' => $file['name'],
                        ':stored_name'   => $filename,
                        ':file_path'     => $destination,
                        ':mime_type'     => $file['type'],
                        ':size'          => $file['size']
                    ]);
                    $message = 'File uploaded and stored successfully.';
                } catch (PDOException $e) {
                    // If database insert fails, delete the uploaded file
                    unlink($destination);
                    $message = 'Database error: ' . $e->getMessage();
                }

                /* 
                // Option 2: Store file content as BLOB in database (uncomment and adjust table)
                // Table would need a BLOB column (e.g., file_content LONGBLOB)
                $fileContent = file_get_contents($file['tmp_name']);
                try {
                    $sql = "INSERT INTO files (original_name, mime_type, size, file_content, uploaded_at) 
                            VALUES (:original_name, :mime_type, :size, :file_content, NOW())";
                    $stmt = $pdo->prepare($sql);
                    $stmt->bindParam(':original_name', $file['name']);
                    $stmt->bindParam(':mime_type', $file['type']);
                    $stmt->bindParam(':size', $file['size']);
                    $stmt->bindParam(':file_content', $fileContent, PDO::PARAM_LOB);
                    $stmt->execute();
                    $message = 'File uploaded and stored in database successfully.';
                } catch (PDOException $e) {
                    $message = 'Database error: ' . $e->getMessage();
                }
                */
            } else {
                $message = 'Failed to move uploaded file.';
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Upload File</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .message { padding: 10px; border-radius: 4px; margin-bottom: 20px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        form { max-width: 400px; }
        input[type="file"] { margin: 10px 0; }
        button { padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
    </style>
</head>
<body>
    <h1>Upload a File</h1>

    <?php if ($message): ?>
        <div class="message <?php echo strpos($message, 'successfully') !== false ? 'success' : 'error'; ?>">
            <?php echo htmlspecialchars($message); ?>
        </div>
    <?php endif; ?>

    <form action="" method="post" enctype="multipart/form-data">
        <label for="file">Choose file:</label>
        <input type="file" name="file" id="file" required>
        <br>
        <button type="submit">Upload</button>
    </form>

    <p><small>Allowed types: <?php echo implode(', ', $allowedTypes); ?>. Max size: <?php echo $maxFileSize / 1024 / 1024; ?> MB.</small></p>
</body>
</html>