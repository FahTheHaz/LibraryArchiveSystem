<?php

$servername = getenv('DB_HOST')     ?: "localhost";
$username   = getenv('DB_USER')     ?: "root";
$password   = getenv('DB_PASSWORD') ?: "";
$database   = getenv('DB_NAME')     ?: "las_db";

// CORS origin — override via DB_CORS_ORIGIN env var when hosting
define('CORS_ORIGIN', getenv('DB_CORS_ORIGIN') ?: 'http://localhost:5173');

try{
    $conn = new PDO("mysql:host=$servername;dbname=$database;charset=utf8", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
}
catch(PDOException $e){
    error_log("DB connection failed: " . $e->getMessage());
    http_response_code(503);
    header("Content-Type: application/json");
    die(json_encode(["error" => "Service temporarily unavailable."]));
}



