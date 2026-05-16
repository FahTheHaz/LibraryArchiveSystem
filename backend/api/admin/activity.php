<?php
/**
 * activity.php
 * Returns activity data for the admin dashboard.
 *
 * Modes (mutually exclusive, checked in order):
 *   GET ?top10=1    → top 10 most downloaded files (all-time, no filters)
 *   GET ?chart=1    → daily counts for bar chart
 *   GET ?export=1   → all matching rows as JSON (up to 5000, for CSV export)
 *   GET (default)   → paginated log list
 *
 * Filter params (chart / export / list modes):
 *   userID, role, actionType, search, dateFrom, dateTo,
 *   folderIDs  — comma-separated folder IDs (filters by target file's folder)
 *
 * List-only params: page, limit (default 50)
 *
 * Admin access only (RoleID = 1).
 */

header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(200); exit(); }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed. Use GET."]);
    exit();
}

require_once __DIR__ . '/../../utils/auth.php';

if ($currentRoleID !== 1) {
    http_response_code(403);
    echo json_encode(["error" => "Admin access required."]);
    exit();
}

$conn = new mysqli("localhost", "root", "", "las_db");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "Database connection failed."]);
    exit();
}

// ─── Mode flags ───────────────────────────────────────────────────────────────
$wantTop10  = isset($_GET['top10'])  && $_GET['top10']  === '1';

$wantChart  = isset($_GET['chart'])  && $_GET['chart']  === '1';
$wantExport = isset($_GET['export']) && $_GET['export'] === '1';
// for dashbaord

// ─── Top 10 mode (all-time, no date/folder filters) 
if ($wantTop10) {
    $sql = "
        SELECT a.TargetFileID,
               COUNT(*) AS downloadCount,
               COALESCE(pm.fileName, phm.fileName, SUBSTRING_INDEX(arch.filePath, '/', -1)) AS displayName,
               arch.FileType,
               f2.folderName
        FROM activity a
        LEFT JOIN archive arch ON a.TargetFileID = arch.FileID
        LEFT JOIN papermetadata pm ON arch.FileID  = pm.FileID  AND arch.FileType = 'PAPER'
        LEFT JOIN photometadata phm  ON arch.FileID = phm.FileID AND arch.FileType = 'PHOTO'
        LEFT JOIN Folders f2   ON arch.folderID = f2.folderID
        WHERE a.ActionType = 'DOWNLOAD' AND a.TargetFileID IS NOT NULL
        GROUP BY a.TargetFileID
        ORDER BY downloadCount DESC
        LIMIT 10
    ";
    $stmt = $conn->prepare($sql);
    $stmt->execute();
    $res   = $stmt->get_result();
    $top10 = [];
    while ($row = $res->fetch_assoc()) {
        $top10[] = [
            'fileID'        => (int) $row['TargetFileID'],
            'displayName'   => $row['displayName'],
            'fileType'      => $row['FileType'],
            'folderName'    => $row['folderName'],
            'downloadCount' => (int) $row['downloadCount'],
        ];
    }
    $stmt->close();
    $conn->close();
    echo json_encode(['top10' => $top10]);
    exit();
}

// ─── Parse Filter Params 
$page   = max(1, intval($_GET['page']  ?? 1));
$limit  = min(200, max(1, intval($_GET['limit'] ?? 50)));
$offset = ($page - 1) * $limit;

$filterUser  = isset($_GET['userID'])     && $_GET['userID']     !== '' ? intval($_GET['userID'])  : null;
$filterRole  = isset($_GET['role'])       && $_GET['role']       !== '' ? intval($_GET['role'])     : null;
$filterType  = isset($_GET['actionType']) && $_GET['actionType'] !== '' ? trim($_GET['actionType']) : null;
$search      = isset($_GET['search'])     && $_GET['search']     !== '' ? trim($_GET['search'])     : null;
$dateFrom    = isset($_GET['dateFrom'])   && $_GET['dateFrom']   !== '' ? trim($_GET['dateFrom'])   : null;
$dateTo      = isset($_GET['dateTo'])     && $_GET['dateTo']     !== '' ? trim($_GET['dateTo'])     : null;

$folderIDs = [];
if (isset($_GET['folderIDs']) && $_GET['folderIDs'] !== '') {
    $folderIDs = array_values(array_filter(array_map('intval', explode(',', $_GET['folderIDs']))));
}

// Chart defaults to past 30 days when no range supplied
if ($wantChart && $dateFrom === null && $dateTo === null) {
    $dateFrom = date('Y-m-d', strtotime('-29 days'));
    $dateTo   = date('Y-m-d');
}

// ─── Build WHERE clauses based on filters (for chart/export/list)
// For filter building
$conditions = [];
$params     = [];
$types      = "";

if ($filterUser !== null) {
    $conditions[] = "a.UserID = ?";
    $params[]     = $filterUser;
    $types       .= "i";
}
if ($filterRole !== null) {
    $conditions[] = "acc.RoleID = ?";
    $params[]     = $filterRole;
    $types       .= "i";
}
if ($filterType !== null) {
    $conditions[] = "a.ActionType = ?";
    $params[]     = $filterType;
    $types       .= "s";
}
if ($search !== null) {
    $wild          = "%{$search}%";
    $conditions[]  = "(a.Describtion LIKE ? OR acc.Username LIKE ? OR acc.Email LIKE ?)";
    $params[]      = $wild;
    $params[]      = $wild;
    $params[]      = $wild;
    $types        .= "sss";
}
if ($dateFrom !== null) {
    $conditions[] = "DATE(a.ActTime) >= ?";
    $params[]     = $dateFrom;
    $types       .= "s";
}
if ($dateTo !== null) {
    $conditions[] = "DATE(a.ActTime) <= ?";
    $params[]     = $dateTo;
    $types       .= "s";
}
if (!empty($folderIDs)) {
    $placeholders  = implode(',', array_fill(0, count($folderIDs), '?'));
    $conditions[]  = "tarch.folderID IN ({$placeholders})";
    foreach ($folderIDs as $fid) {
        $params[] = $fid;
        $types   .= "i";
    }
}
// wILL USE SOON I THINK
// if (!empty($FullName)) {
//     $placeholders  = implode(',', array_fill(0, count($folderIDs), '?'));
//     $conditions[]  = "tarch.folderID IN ({$placeholders})";
//     foreach ($folderIDs as $fid) {
//         $params[] = $fid;
//         $types   .= "i";
//     }
// }
// if (!empty($academicYear)) {
//     $placeholders  = implode(',', array_fill(0, count($folderIDs), '?'));
//     $conditions[]  = "tarch.folderID IN ({$placeholders})";
//     foreach ($folderIDs as $fid) {
//         $params[] = $fid;
//         $types   .= "i";
//     }
// }

$where = !empty($conditions) ? "WHERE " . implode(" AND ", $conditions) : "";

// ─── Shared JOINs 
$joins = "
    LEFT JOIN account acc   ON a.UserID        = acc.UserID
    LEFT JOIN archive tarch ON a.TargetFileID  = tarch.FileID
    LEFT JOIN Folders f2    ON tarch.folderID  = f2.folderID
";

// ─── Chart mode 
if ($wantChart) {
    $sql  = "SELECT DATE(a.ActTime) AS day, COUNT(*) AS cnt FROM activity a {$joins} {$where} GROUP BY day ORDER BY day ASC";
    $stmt = $conn->prepare($sql);
    if (!empty($params)) $stmt->bind_param($types, ...$params);
    $stmt->execute();
    $res       = $stmt->get_result();
    $chartData = [];
    while ($row = $res->fetch_assoc()) {
        $chartData[] = ["date" => $row['day'], "count" => (int) $row['cnt']];
    }
    $stmt->close();
    $conn->close();
    echo json_encode(["chartData" => $chartData]);
    exit();
}
// Nah
// if ($wantGraph) {
//     $sql  = "SELECT DATE(a.ActTime) AS day, COUNT(*) AS cnt FROM activity a {$joins} {$where} GROUP BY day ORDER BY day ASC";
//     $stmt = $conn->prepare($sql);
//     if (!empty($params)) $stmt->bind_param($types, ...$params);
//     $stmt->execute();
//     $res       = $stmt->get_result();
//     $graphData = [];
//     while ($row = $res->fetch_assoc()) {
//         $graphData[] = ["date" => $row['day'], "count" => (int) $row['cnt']];
//     }
//     $stmt->close();
//     $conn->close();
//     echo json_encode(["graphData" => $graphData]);
//     exit();
// }

// Pie chart


// ─── Shared row builder (for chart export and list modes)
function buildLogRow(array $row): array {
    return [
        'logID' => $row['LogID'],
        'userID' => $row['UserID'],
        'username' => $row['Username'],
        'email' => $row['Email'],
        'roleID' => $row['RoleID'],
        'actionType' => $row['ActionType'],
        'description' => $row['Describtion'],
        'ip' => $row['IP'],
        'actTime' => $row['ActTime'],
        'targetFileID' => $row['TargetFileID'],
        'targetFolderID' => $row['targetFolderID'],
        'targetFolderName' => $row['targetFolderName'],

    ];
}

// 'targetFileID' => $row['FullName'],
//         'targetFolderName' => $row['AcademicYear'],
//         'targetFolderID' => $row['Dept'],
//     ];
// }




$selectCols = "
    SELECT a.LogID, a.UserID, a.ActionType, a.Describtion,
           INET6_NTOA(a.IPAddress) AS IP,
           a.ActTime, a.TargetFileID,
           acc.Username, acc.Email, acc.RoleID,
           tarch.folderID  AS targetFolderID,
           f2.folderName   AS targetFolderName
    FROM activity a
    {$joins}
    {$where}
";


// ─── Export mode (all rows, no pagination, for CSV) ───────────────────────────
if ($wantExport) {
    $exportSql = $selectCols . " ORDER BY a.LogID DESC LIMIT 5000";
    $es = $conn->prepare($exportSql);
    if (!empty($params)) $es->bind_param($types, ...$params);
    $es->execute();
    $res     = $es->get_result();
    $allLogs = [];
    while ($row = $res->fetch_assoc()) {
        $allLogs[] = buildLogRow($row);
    }
    $es->close();
    $conn->close();
    echo json_encode(["logs" => $allLogs, "total" => count($allLogs)]);
    exit();
}

// ─── List mode — count 
$cs = $conn->prepare("SELECT COUNT(*) AS total FROM activity a {$joins} {$where}");
if (!empty($params)) $cs->bind_param($types, ...$params);
$cs->execute();
$total      = (int) $cs->get_result()->fetch_assoc()['total'];
$totalPages = (int) ceil($total / $limit);
$cs->close();

// ─── List mode — fetch rows 
$ls = $conn->prepare($selectCols . " ORDER BY a.LogID DESC LIMIT ? OFFSET ?");
$ls->bind_param($types . "ii", ...[...$params, $limit, $offset]);
// only variables can be passed by reference
$ls->execute();
$res  = $ls->get_result();
$logs = [];
while ($row = $res->fetch_assoc()) {
    $logs[] = buildLogRow($row);
}
$ls->close();
$conn->close();

http_response_code(200);
// who does not like this
echo json_encode([
    "logs" => $logs,
    "pagination" => [
        "currentPage" => $page,
        "totalPages"=> $totalPages,
        "totalLogs" => $total,
        "limit" => $limit,
    ],
]);
