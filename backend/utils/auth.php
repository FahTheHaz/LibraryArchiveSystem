<?php
/**
 * auth.php
 *
 * Session guard — require_once this at the top of any protected endpoint.
 *
 * Usage:
 *   require_once __DIR__ . '/../utils/auth.php';
 *   // $currentUserID and $currentRoleID are available after this point
 * how to use:
 * * For endpoints that require authentication, include this file at the top. It will:
 *  - Start a session (if not already started)
 * - Check if the user is logged in by verifying if `$_SESSION['userID']` is set
 * - If not logged in, it will return a 401 Unauthorized response and exit
 * - If logged in, it will set `$currentUserID` and `$currentRoleID
 * for use in the endpoint logic
 * 
 *
 * To restrict to admins only:
 *   if ($currentRoleID !== 1) {
 *       http_response_code(403);
 *       echo json_encode(["error" => "Admins only."]);
 *       exit();
 *   }
 * 
 * 
 * 
 * 
 * 
 * 
 * 
 */

session_set_cookie_params([
    'lifetime' => 3600,
    'path'     => '/',
    'secure'   => false,   // match login.php
    'httponly' => true,
    'samesite' => 'Strict'
]);
session_start();

if (empty($_SESSION['userID'])) {
    http_response_code(401);
    echo json_encode(["error" => "Unauthorized. Please log in."]);
    exit();
}

$currentUserID = (int) $_SESSION['userID'];
$currentRoleID = (int) $_SESSION['roleID'];
