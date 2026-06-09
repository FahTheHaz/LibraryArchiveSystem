<?php
/**
 * auth_guest.php
 *
 * Session guard that allows unauthenticated (guest) access.
 * Unlike auth.php, this does NOT return 401 for missing sessions.
 * Sets $currentUserID = null and $currentRoleID = 0 for guests.
 *
 * Use this for endpoints that should be publicly readable but still
 * benefit from knowing who the caller is when they are logged in.
 */

session_set_cookie_params([
    'lifetime' => 3600,
    'path'     => '/',
    'secure'   => false,
    'httponly' => true,
    'samesite' => 'Strict'
]);
session_start();

$currentUserID = isset($_SESSION['userID']) ? (int) $_SESSION['userID'] : null;
$currentRoleID = isset($_SESSION['roleID']) ? (int) $_SESSION['roleID'] : 0;
