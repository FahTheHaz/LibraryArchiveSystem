<?php
require_once __DIR__ . '/config/db.php';

echo "Testing database connection...<br> Balls";

// var_dump($conn);
// $stmt = $conn->query("SELECT * FROM account");
// $sql = "SELECT * FROM account";
// $stmt = $conn->query($sql);
// $results = $stmt->fetchAll(PDO::FETCH_ASSOC);
// var_dump($results);


// $sql = "SELECT FileID, FilePath FROM Archive";
// $stmt = $conn->query($sql);
// $files = $stmt->fetchAll(PDO::FETCH_ASSOC);

// echo "<pre>";
// print_r($files);
// echo "</pre>";



$page = $_GET['page'] ?? 'home';
?>

<nav>
    <a href="index.php?page=home">Home</a>
    <a href="index.php?page=files">Files</a>
</nav>

<?php
if ($page === 'files') {
    require 'backend/files/list.php';
} else {
    echo "Welcome to LAS";
}

?>

<!-- C:\xampp\htdocs\LAS\backend\config\index.php
 http://localhost/LAS/index.php -->

