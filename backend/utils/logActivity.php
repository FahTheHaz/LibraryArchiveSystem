<?php

function logActivity($conn, ?int $UserID = null, $actionType = '', $describtion = '', ?int $targetFileID = null) {
    if ($UserID === null) {
        $UserID = isset($_SESSION['userID']) ? (int) $_SESSION['userID'] : null;
    }

    $ipRaw    = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    $ipBinary = inet_pton($ipRaw);

    $logStmt = $conn->prepare(
        "INSERT INTO activity (UserID, IPAddress, ActionType, Describtion, TargetFileID) VALUES (?, ?, ?, ?, ?)"
    );
    $logStmt->bind_param("isssi", $UserID, $ipBinary, $actionType, $describtion, $targetFileID);
    $logStmt->execute();
    $logStmt->close();

    return true;
}
