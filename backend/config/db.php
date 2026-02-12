<?php

$servername = "localhost";
$username = "root";
$password = "";
$database = "library_archive";

$conn = new mysqli($servername, $username, $password, $database);

if ($conn->connect_error) {
    die("connection failed");
}

?>
