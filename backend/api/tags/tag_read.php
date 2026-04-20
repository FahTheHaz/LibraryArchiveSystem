<?php
/**
 * tags/read.php
 *
 * Read tags — two modes:
 *
 *   GET /tags/read.php                → all tags (paginated, sortable)
 *   GET /tags/read.php?fileID=5       → tags attached to a specific file
 *   GET /tags/read.php?search=math    → search tag content
 *   GET /tags/read.php?sort=popular   → sort by helpfulness (popular | az | za | newest)
 *   GET /tags/read.php?page=2&limit=50
 *
 * Returns:
 *   200 { "tags": [...], "pagination": {...} }
 *   404 fileID not found
 *   405 wrong method
 */

// ─── CORS & Headers ───────────────────────────────────────────────────────────
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed. Use GET."]);
    exit();
}

// ─── DB Connection ────────────────────────────────────────────────────────────
$conn = new mysqli("localhost", "root", "", "las_db");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed."]);
    exit();
}

// ─── Parameters ───────────────────────────────────────────────────────────────
$fileID = isset($_GET['fileID']) ? intval($_GET['fileID']) : null;
$search = isset($_GET['search']) ? trim($_GET['search'])   : null;
$sort   = isset($_GET['sort'])   ? trim($_GET['sort'])     : 'popular';
$page   = isset($_GET['page'])   ? max(1, intval($_GET['page']))                  : 1;
$limit  = isset($_GET['limit'])  ? min(200, max(1, intval($_GET['limit'])))       : 50;
$offset = ($page - 1) * $limit;

// ─── Mode A: tags for a specific file ─────────────────────────────────────────
if ($fileID !== null) {
    // Verify file exists
    $fileCheck = $conn->prepare(
        "SELECT FileID FROM archive WHERE FileID = ? AND deletedAt IS NULL"
    );
    $fileCheck->bind_param("i", $fileID);
    $fileCheck->execute();
    $fileCheck->store_result();
    if ($fileCheck->num_rows === 0) {
        $fileCheck->close();
        $conn->close();
        http_response_code(404);
        echo json_encode(["error" => "File not found."]);
        exit();
    }
    $fileCheck->close();

    $stmt = $conn->prepare(
        "SELECT t.TagID, t.TagContent, t.Helpfulness
         FROM tags t
         INNER JOIN filetags ft ON t.TagID = ft.TagID
         WHERE ft.FileID = ?
         ORDER BY t.Helpfulness DESC, t.TagContent ASC"
    );
    $stmt->bind_param("i", $fileID);
    $stmt->execute();
    $result = $stmt->get_result();
    $tags = [];
    while ($row = $result->fetch_assoc()) {
        $tags[] = $row;
    }
    $stmt->close();
    $conn->close();

    http_response_code(200);
    echo json_encode(["fileID" => $fileID, "tags" => $tags]);
    exit();
}

// ─── Mode B: all tags (with optional search + sort + pagination) ───────────────
$conditions = [];
$params     = [];
$types      = "";

if ($search !== null && $search !== '') {
    $conditions[] = "t.TagContent LIKE ?";
    $params[]     = "%{$search}%";
    $types       .= "s";
}

$orderBy = match ($sort) {
    'az'      => "t.TagContent ASC",
    'za'      => "t.TagContent DESC",
    'newest'  => "t.TagID DESC",
    default   => "t.Helpfulness DESC, t.TagContent ASC",  // popular
};

$where = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

// Total count
$countStmt = $conn->prepare("SELECT COUNT(*) AS total FROM tags t {$where}");
if (!empty($params)) {
    $countStmt->bind_param($types, ...$params);
}
$countStmt->execute();
$total = (int) $countStmt->get_result()->fetch_assoc()['total'];
$countStmt->close();

// Paginated fetch — also include how many files each tag is on
$sql = "SELECT t.TagID, t.TagContent, t.Helpfulness,
               COUNT(ft.FileID) AS fileCount
        FROM tags t
        LEFT JOIN filetags ft ON t.TagID = ft.TagID
        {$where}
        GROUP BY t.TagID
        ORDER BY {$orderBy}
        LIMIT ? OFFSET ?";

$params[] = $limit;
$params[] = $offset;
$types   .= "ii";

$stmt = $conn->prepare($sql);
if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}
$stmt->execute();
$result = $stmt->get_result();

$tags = [];
while ($row = $result->fetch_assoc()) {
    $tags[] = $row;
}
$stmt->close();
$conn->close();

http_response_code(200);
echo json_encode([
    "tags" => $tags,
    "pagination" => [
        "currentPage" => $page,
        "totalPages"  => (int) ceil($total / $limit),
        "totalTags"   => $total,
        "limit"       => $limit,
    ],
    "filters" => [
        "search" => $search,
        "sort"   => $sort,
    ],
]);