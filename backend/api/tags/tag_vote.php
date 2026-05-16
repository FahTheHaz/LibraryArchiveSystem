<?php
/**
 * tags/vote.php
 *
 * Vote on a tag's helpfulness. One vote per user per tag.
 * Casting the same vote twice cancels it (toggle).
 *
 * POST /tags/vote.php
 * Body (JSON): { "tagID": 3, "vote": 1 }   ← vote: 1 (up) or -1 (down)
 *
 * Returns:
 *   200 { "message": "...", "helpfulness": N, "yourVote": 1|-1|0 }
 *   400 invalid input
 *   401 not authenticated
 *   404 tag not found
 *   405 wrong method
 *
 *  (schema): Requires a `tagvotes` table:
 *   CREATE TABLE tagvotes (
 *     UserID  INT NOT NULL,
 *     TagID   INT NOT NULL,
 *     Vote    TINYINT NOT NULL,   -- 1 or -1
 *     PRIMARY KEY (UserID, TagID),
 *     FOREIGN KEY (UserID) REFERENCES account(UserID),
 *     FOREIGN KEY (TagID)  REFERENCES tags(TagID)
 *   );
 * of which i already have
 */

// ─── CORS & Headers ───────────────────────────────────────────────────────────
header("Access-Control-Allow-Origin: http://localhost:5173");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Access-Control-Allow-Credentials: true");
header("Content-Type: application/json");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(["error" => "Method not allowed. Use POST."]);
    exit();
}

// ─── Auth Guard ───────────────────────────────────────────────────────────────
require_once __DIR__ . '/../../utils/auth.php';
require_once __DIR__ . '/../../utils/logActivity.php';

// ─── DB Connection ────────────────────────────────────────────────────────────
$conn = new mysqli("localhost", "root", "", "las_db");
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(["error" => "DB connection failed."]);
    exit();
}

// ─── Parse & Validate ─────────────────────────────────────────────────────────
$body = json_decode(file_get_contents("php://input"), true);

$tagID = isset($body['tagID']) ? intval($body['tagID']) : 0;
$vote  = isset($body['vote'])  ? intval($body['vote'])  : 0;

if ($tagID <= 0) {
    http_response_code(400);
    echo json_encode(["error" => "tagID is required."]);
    exit();
}

if (!in_array($vote, [1, -1])) {
    http_response_code(400);
    echo json_encode(["error" => "vote must be 1 (up) or -1 (down)."]);
    exit();
}

// ─── Verify tag exists ────────────────────────────────────────────────────────
$tagCheck = $conn->prepare("SELECT TagID, Helpfulness FROM tags WHERE TagID = ?");
$tagCheck->bind_param("i", $tagID);
$tagCheck->execute();
$tagRow = $tagCheck->get_result()->fetch_assoc();
$tagCheck->close();

if (!$tagRow) {
    http_response_code(404);
    echo json_encode(["error" => "Tag not found."]);
    exit();
}

// ─── Check existing vote ──────────────────────────────────────────────────────
$existingStmt = $conn->prepare(
    "SELECT Vote FROM tagvotes WHERE UserID = ? AND TagID = ?"
);
$existingStmt->bind_param("ii", $currentUserID, $tagID);
$existingStmt->execute();
$existingRow = $existingStmt->get_result()->fetch_assoc();
$existingStmt->close();

$existingVote = $existingRow ? (int) $existingRow['Vote'] : 0;

$conn->begin_transaction();

try {
    if ($existingVote === $vote) {
        // Same vote cast again → cancel (toggle off)
        $del = $conn->prepare("DELETE FROM tagvotes WHERE UserID = ? AND TagID = ?");
        $del->bind_param("ii", $currentUserID, $tagID);
        $del->execute();
        $del->close();

        $delta    = -$vote;   // undo the previous vote
        $yourVote = 0;
        $message  = "Vote removed.";

    } elseif ($existingVote === 0) {
        // No previous vote → insert
        $ins = $conn->prepare(
            "INSERT INTO tagvotes (UserID, TagID, Vote) VALUES (?, ?, ?)"
        );
        $ins->bind_param("iii", $currentUserID, $tagID, $vote);
        $ins->execute();
        $ins->close();

        $delta    = $vote;
        $yourVote = $vote;
        $message  = $vote === 1 ? "Upvoted." : "Downvoted.";

    } else {
        // Switching vote (up → down or down → up) → update
        $upd = $conn->prepare(
            "UPDATE tagvotes SET Vote = ? WHERE UserID = ? AND TagID = ?"
        );
        $upd->bind_param("iii", $vote, $currentUserID, $tagID);
        $upd->execute();
        $upd->close();

        $delta    = $vote - $existingVote;  // e.g. 1 - (-1) = +2
        $yourVote = $vote;
        $message  = $vote === 1 ? "Changed to upvote." : "Changed to downvote.";
    }

    // Apply delta to Helpfulness
    $upd = $conn->prepare("UPDATE tags SET Helpfulness = Helpfulness + ? WHERE TagID = ?");
    $upd->bind_param("ii", $delta, $tagID);
    $upd->execute();
    $upd->close();

    // Fetch updated helpfulness
    $fetch = $conn->prepare("SELECT Helpfulness FROM tags WHERE TagID = ?");
    $fetch->bind_param("i", $tagID);
    $fetch->execute();
    $newHelpfulness = (int) $fetch->get_result()->fetch_assoc()['Helpfulness'];
    $fetch->close();

    $conn->commit();

    logActivity($conn, $currentUserID, "TAG_VOTE", "Vote {$vote} on TagID: {$tagID} | {$message}");

    http_response_code(200);
    echo json_encode([
        "message"     => $message,
        "tagID"       => $tagID,
        "helpfulness" => $newHelpfulness,
        "yourVote"    => $yourVote,
    ]);

} catch (Exception $e) {
    $conn->rollback();
    http_response_code(500);
    echo json_encode(["error" => "Vote failed: " . $e->getMessage()]);
}

$conn->close();