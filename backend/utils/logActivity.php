<?php

function logActivity($conn, ?int $UserID = null, $actionType = '', $describtion = '') {
    if ($UserID === null) {
        $UserID = isset($_SESSION['userID']) ? (int) $_SESSION['userID'] : null;
    }
    
    $ipRaw = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0'; 
    $ipBinary = inet_pton($ipRaw);

    $logStmt = $conn->prepare(
        "INSERT INTO activity (UserID, IPAddress, ActionType, Describtion) VALUES (?, ?, ?, ?)"
    );
    $logStmt->bind_param("isss", $UserID, $ipBinary, $actionType, $describtion);
    $logStmt->execute();
    $logStmt->close();

    return true; // why return true? just to indicate success, can be modified to return false on failure if needed
}
