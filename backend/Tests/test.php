<?php
require_once __DIR__ . 'db.php';

var_dump($pdo);

echo "Testing database connection...<br> Balls";

$sql = "
SELECT 
    a.FileID,
    a.FilePath,
    a.FileType,
    COALESCE(pm.describtion, phm.Event) AS Details,
    GROUP_CONCAT(t.TagContent SEPARATOR ', ') AS Tags
FROM Archive a
LEFT JOIN FileTag ft ON a.FileID = ft.FileID
LEFT JOIN Tags t ON ft.TagID = t.TagID
LEFT JOIN papermetadata pm ON a.FileID = pm.FileID
LEFT JOIN photometadata phm ON a.FileID = phm.FileID
GROUP BY a.FileID
ORDER BY a.FileID
";

$stmt = $pdo->query($sql);
$files = $stmt->fetchAll(PDO::FETCH_ASSOC);
?>
<!-- C:\xampp\htdocs\LAS\backend\config\index.php
 http://localhost/LAS/backend/config/test.php -->

<!DOCTYPE html>
<html>
<head>
    <title>LAS Archive</title>
</head>
    <body>

    <h2>Library Archive</h2>

    <table border="1" cellpadding="10">
        <tr>
            <th>ID</th>
            <th>File Path</th>
            <th>Type</th>
            <th>Details</th>
            <th>Tags</th>
        </tr>

        <?php foreach ($files as $file): ?>
            <tr>
                <td><?= $file['FileID'] ?></td>
                <td><?= $file['FilePath'] ?></td>
                <td><?= $file['FileType'] ?></td>
                <td><?= $file['Details'] ?></td>
                <td><?= $file['Tags'] ?></td>
            </tr>
        <?php endforeach; ?>

    </table>

    </body>
</html>
<!-- http://localhost/LAS/backend/config/test.php -->