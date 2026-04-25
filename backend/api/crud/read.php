<?php
/**
 * read.php
 * Handles reading/fetching archive files with their metadata.
 * 
 * Supports:
 *   GET /read.php                     → all files (paginated)
 *   GET /read.php?id=5                → single file by FileID
 *   GET /read.php?type=PAPER          → filter by type
 *   GET /read.php?type=PHOTO          → filter by type
 *   GET /read.php?subject=Fiqh        → filter papers by subject
 *   GET /read.php?season=June         → filter papers by season
 *   GET /read.php?semester=Semester 2  → filter papers by semester
 *   GET /read.php?code=FQ201          → filter papers by exam code
 *   GET /read.php?event=Graduation    → filter photos by event
 *   GET /read.php?photographer=Ahmad  → filter photos by photographer
 *   GET /read.php?search=fiqh         → search across multiple fields
 *   GET /read.php?page=2&limit=10     → pagination
 *   GET /read.php?sort=newest         → sort order (newest, oldest, subject, event)
 * 
 * Filters can be combined, e.g.:
 *   GET /read.php?type=PAPER&subject=Fiqh&season=June&page=1&limit=20
 */

// ─── CORS & Headers ───
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");
require_once __DIR__ . '/../../utils/logActivity.php';


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed. Use GET."]);
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

// ─── Read Parameters ───
Session_start(); // Start session to get user info for logging

$fileID       = isset($_GET['id'])            ? intval($_GET['id'])             : null;
$fileType     = isset($_GET['type'])          ? strtoupper(trim($_GET['type'])) : null;
$subject      = isset($_GET['subject'])       ? trim($_GET['subject'])          : null;
$season       = isset($_GET['season'])        ? trim($_GET['season'])           : null;
$semester     = isset($_GET['semester'])       ? trim($_GET['semester'])         : null;
$code         = isset($_GET['code'])           ? trim($_GET['code'])            : null;
$scanOrDigital = isset($_GET['scanOrDigital']) ? trim($_GET['scanOrDigital'])   : null;
$event        = isset($_GET['event'])          ? trim($_GET['event'])           : null;
$photographer = isset($_GET['photographer'])   ? trim($_GET['photographer'])   : null;
$search       = isset($_GET['search'])         ? trim($_GET['search'])         : null;
$sort         = isset($_GET['sort'])           ? trim($_GET['sort'])           : 'newest';
$page         = isset($_GET['page'])           ? max(1, intval($_GET['page'])) : 1;
$limit        = isset($_GET['limit'])          ? min(100, max(1, intval($_GET['limit']))) : 20;
$offset       = ($page - 1) * $limit;
$readby = $_SESSION['userID'] ?? null; // For logging purposes, if we have session info available

// ═══════════════════════════════════════════════
// SINGLE FILE: fetch by ID
// ═══════════════════════════════════════════════

if ($fileID !== null) {
    // Grab the archive record first
    $stmt = $conn->prepare(
        "SELECT a.FileID, a.DateUploaded, a.FileType, a.UploadedBy, a.filePath, a.deletedAt,
                acc.Email AS uploaderEmail
         FROM archive a
         LEFT JOIN account acc ON a.UploadedBy = acc.UserID
         WHERE a.FileID = ? AND a.deletedAt IS NULL"
    );
    $stmt->bind_param("i", $fileID);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result->num_rows === 0) {
        http_response_code(404);
        echo json_encode(["error" => "File not found or has been deleted."]);
        $stmt->close();
        $conn->close();
        exit();
    }

    $file = $result->fetch_assoc();
    $stmt->close();

    // Fetch the appropriate metadata
    if ($file['FileType'] === 'PAPER') {
        $metaStmt = $conn->prepare(
            "SELECT PaperID, Subject, MonthYear, Season, Semester, Code, ScanOrDigital
             FROM papermetadata WHERE FileID = ?"
        );
        $metaStmt->bind_param("i", $fileID);
        $metaStmt->execute();
        $metaResult = $metaStmt->get_result();
        $file['metadata'] = $metaResult->fetch_assoc();
        $metaStmt->close();

    } elseif ($file['FileType'] === 'PHOTO') {
        $metaStmt = $conn->prepare(
            "SELECT PhotoID, DataJSON, Quality, PictureDate, Event, Photographer
             FROM photometadata WHERE FileID = ?"
        );
        $metaStmt->bind_param("i", $fileID);
        $metaStmt->execute();
        $metaResult = $metaStmt->get_result();
        $meta = $metaResult->fetch_assoc();
        // Parse the JSON field so it comes back as an object, not a string
        if ($meta && $meta['DataJSON']) {
            $meta['DataJSON'] = json_decode($meta['DataJSON'], true);
        }
        $file['metadata'] = $meta;
        $metaStmt->close();
    }

    // Fetch tags for this file
    $tagStmt = $conn->prepare(
        "SELECT t.TagID, t.TagContent, t.Helpfulness
         FROM tags t
         INNER JOIN filetags ft ON t.TagID = ft.TagID
         WHERE ft.FileID = ?
         ORDER BY t.Helpfulness DESC"
    );
    $tagStmt->bind_param("i", $fileID);
    $tagStmt->execute();
    $tagResult = $tagStmt->get_result();
    $tags = [];
    while ($row = $tagResult->fetch_assoc()) {
        $tags[] = $row;
    }
    $file['tags'] = $tags;
    $tagStmt->close();

    // Log the view
    logActivity($conn, $readby, "VIEW", "Viewed file ID: {$fileID}");

    http_response_code(200);
    echo json_encode(["file" => $file]);
    $conn->close();
    exit();
}


// ═══════════════════════════════════════════════
// MULTIPLE FILES: list with filters
// ═══════════════════════════════════════════════

// Build the query dynamically based on what filters were provided
$conditions = [];
$params = [];
$types = "";

// Always exclude soft-deleted files
$conditions[] = "a.deletedAt IS NULL";

// Filter by type
if ($fileType !== null && in_array($fileType, ['PAPER', 'PHOTO'])) {
    $conditions[] = "a.FileType = ?";
    $params[] = $fileType;
    $types .= "s";
}

// If filtering by paper-specific fields, we need to join papermetadata
$needPaperJoin = ($subject || $season || $semester || $code || $scanOrDigital);
// If filtering by photo-specific fields, we need to join photometadata
$needPhotoJoin = ($event || $photographer);

// Paper filters
if ($subject) {
    $conditions[] = "pm.Subject LIKE ?";
    $params[] = "%{$subject}%";
    $types .= "s";
}
if ($season) {
    $conditions[] = "pm.Season = ?";
    $params[] = $season;
    $types .= "s";
}
if ($semester) {
    $conditions[] = "pm.Semester = ?";
    $params[] = $semester;
    $types .= "s";
}
if ($code) {
    $conditions[] = "pm.Code = ?";
    $params[] = $code;
    $types .= "s";
}
if ($scanOrDigital) {
    $conditions[] = "pm.ScanOrDigital = ?";
    $params[] = $scanOrDigital;
    $types .= "s";
}

// Photo filters
if ($event) {
    $conditions[] = "phm.Event LIKE ?";
    $params[] = "%{$event}%";
    $types .= "s";
}
if ($photographer) {
    $conditions[] = "phm.Photographer LIKE ?";
    $params[] = "%{$photographer}%";
    $types .= "s";
}

// General search across multiple fields
if ($search) {
    $searchWild = "%{$search}%";
    $conditions[] = "(
        pm.Subject LIKE ? OR
        pm.Season LIKE ? OR
        pm.Code LIKE ? OR
        phm.Event LIKE ? OR
        phm.Photographer LIKE ? OR
        a.filePath LIKE ? OR
        EXISTS (
            SELECT 1 FROM filetags ft
            INNER JOIN tags t ON ft.TagID = t.TagID
            WHERE ft.FileID = a.FileID AND t.TagContent LIKE ?
        )
    )";
    // 7 parameters for the search
    for ($i = 0; $i < 7; $i++) {
        $params[] = $searchWild;
        $types .= "s";
    }
    // Force both joins when searching
    $needPaperJoin = true;
    $needPhotoJoin = true;
}

// Sort order
switch ($sort) {
    case 'oldest':
        $orderBy = "a.DateUploaded ASC";
        break;
    case 'subject':
        $orderBy = "pm.Subject ASC, a.DateUploaded DESC";
        $needPaperJoin = true;
        break;
    case 'event':
        $orderBy = "phm.Event ASC, a.DateUploaded DESC";
        $needPhotoJoin = true;
        break;
    case 'newest':
    default:
        $orderBy = "a.DateUploaded DESC";
        break;
}

// Build the SELECT query
$sql = "SELECT a.FileID, a.DateUploaded, a.FileType, a.UploadedBy, a.filePath,
               acc.Email AS uploaderEmail";

// Add paper metadata columns if joining
if ($needPaperJoin) {
    $sql .= ", pm.PaperID, pm.Subject, pm.MonthYear, pm.Season, pm.Semester, pm.Code, pm.ScanOrDigital";
}
if ($needPhotoJoin) {
    $sql .= ", phm.PhotoID, phm.Quality, phm.PictureDate, phm.Event, phm.Photographer";
}

$sql .= " FROM archive a";
$sql .= " LEFT JOIN account acc ON a.UploadedBy = acc.UserID";

if ($needPaperJoin) {
    $sql .= " LEFT JOIN papermetadata pm ON a.FileID = pm.FileID";
}
if ($needPhotoJoin) {
    $sql .= " LEFT JOIN photometadata phm ON a.FileID = phm.FileID";
}

// WHERE clause
if (!empty($conditions)) {
    $sql .= " WHERE " . implode(" AND ", $conditions);
}

// Get total count before pagination (for the frontend to know how many pages there are)
$countSql = "SELECT COUNT(DISTINCT a.FileID) AS total FROM archive a";
if ($needPaperJoin) {
    $countSql .= " LEFT JOIN papermetadata pm ON a.FileID = pm.FileID";
}
if ($needPhotoJoin) {
    $countSql .= " LEFT JOIN photometadata phm ON a.FileID = phm.FileID";
}
if (!empty($conditions)) {
    $countSql .= " WHERE " . implode(" AND ", $conditions);
}

$countStmt = $conn->prepare($countSql);
if (!empty($params)) {
    $countStmt->bind_param($types, ...$params);
}
$countStmt->execute();
$countResult = $countStmt->get_result();
$totalRows = $countResult->fetch_assoc()['total'];
$countStmt->close();

$totalPages = ceil($totalRows / $limit);

// Add GROUP BY, ORDER, LIMIT to main query
$sql .= " GROUP BY a.FileID";
$sql .= " ORDER BY {$orderBy}";
$sql .= " LIMIT ? OFFSET ?";

$params[] = $limit;
$params[] = $offset;
$types .= "ii";

$stmt = $conn->prepare($sql);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();

$files = [];
while ($row = $result->fetch_assoc()) {
    // Structure the metadata neatly rather than dumping flat columns
    $file = [
        'FileID'        => $row['FileID'],
        'DateUploaded'  => $row['DateUploaded'],
        'FileType'      => $row['FileType'],
        'UploadedBy'    => $row['UploadedBy'],
        'uploaderEmail' => $row['uploaderEmail'],
        'filePath'      => $row['filePath'],
    ];

    if ($row['FileType'] === 'PAPER' && $needPaperJoin) {
        $file['metadata'] = [
            'PaperID'       => $row['PaperID'] ?? null,
            'Subject'       => $row['Subject'] ?? null,
            'MonthYear'     => $row['MonthYear'] ?? null,
            'Season'        => $row['Season'] ?? null,
            'Semester'      => $row['Semester'] ?? null,
            'Code'          => $row['Code'] ?? null,
            'ScanOrDigital' => $row['ScanOrDigital'] ?? null,
        ];
    } elseif ($row['FileType'] === 'PHOTO' && $needPhotoJoin) {
        $file['metadata'] = [
            'PhotoID'       => $row['PhotoID'] ?? null,
            'Quality'       => $row['Quality'] ?? null,
            'PictureDate'   => $row['PictureDate'] ?? null,
            'Event'         => $row['Event'] ?? null,
            'Photographer'  => $row['Photographer'] ?? null,
        ];
    }

    $files[] = $file;
}
$stmt->close();

// Log the search/browse
$logDesc = "Browsed archive";
if ($search) {
    $logDesc = "Searched: {$search}";
} elseif ($fileType) {
    $logDesc = "Browsed {$fileType} files";
}
logActivity($conn, $readby, "BROWSE", $logDesc);

// Return the response
http_response_code(200);
echo json_encode([
    "files"      => $files,
    "pagination" => [
        "currentPage" => $page,
        "totalPages"  => $totalPages,
        "totalFiles"  => $totalRows,
        "limit"       => $limit,
    ],
    "filters" => [
        "type"          => $fileType,
        "subject"       => $subject,
        "season"        => $season,
        "semester"      => $semester,
        "code"          => $code,
        "event"         => $event,
        "photographer"  => $photographer,
        "search"        => $search,
        "sort"          => $sort,
    ],
]);

$conn->close();


// ═══════════════════════════════════════════════
// Helper: Log activity
// ═══════════════════════════════════════════════

// function logActivity($conn, $userID, $actionType, $description) {
//     $ipRaw = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
//     $ipBinary = inet_pton($ipRaw);

//     $stmt = $conn->prepare(
//         "INSERT INTO activity (UserID, IPAddress, ActionType, Describtion) VALUES (?, ?, ?, ?)"
//     );
//     $stmt->bind_param("isss", $userID, $ipBinary, $actionType, $description);
//     $stmt->execute();
//     $stmt->close();
// }
