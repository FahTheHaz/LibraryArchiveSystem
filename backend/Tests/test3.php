<?php
// Simple testing to test only for delete.php without needing the React frontend.
// Usage (browser):  http://localhost/las/backend/tests/test3.php
// Make sure delete.php is accessible at the $url below.

$url = "http://localhost/las/backend/api/delete.php?";

$fileIDToDelete = 11; // Replace with the actual file ID you want to test

// ─── Role simulation ───────────────────────────────────────────────────────
// Change $currentRole to switch between users:
//   1 = Admin
//   2 = Normal User
$currentRole = 1; // <-- change this to roleplay as a different user
// ──────────────────────────────────────────────────────────────────────────

echo "=== Testing as " . ($currentRole === 1 ? "Admin (RoleID=1)" : "Normal User (RoleID=2)") . " ===\n\n";

// Test: soft-delete a file
$response = file_get_contents($url . "id={$fileIDToDelete}&role={$currentRole}");
echo "Delete file ID {$fileIDToDelete}: " . $response . "\n";

// Test: restore a file (only admins should be allowed)
$response = file_get_contents($url . "id={$fileIDToDelete}&role={$currentRole}&action=restore");
echo "Restore file ID {$fileIDToDelete}: " . $response . "\n";







