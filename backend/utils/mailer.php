<?php
/**
 * mailer.php
 *
 * Central PHPMailer wrapper. Call sendMail() from any endpoint.
 * Credentials are configured once here.
 *
 * TODO (production): Move SMTP credentials out of this file into
 * environment variables or a gitignored config file, e.g.:
 *   $_ENV['SMTP_USER'] loaded from a .env file via vlucas/phpdotenv
 *
 * Usage:
 *   require_once __DIR__ . '/mailer.php';
 *   $ok = sendMail('user@example.com', 'Full Name', 'Subject', '<p>Body</p>');
 */

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception as MailException;

require_once __DIR__ . '/../vendor/autoload.php';

// ─── SMTP Configuration ───────────────────────────────────────────────────────
// Swap these values for your real provider in production (SendGrid, Mailgun, etc.)
// For local dev, use Mailtrap: https://mailtrap.io → SMTP credentials tab
define('SMTP_HOST',     'smtp.gmail.com');           // or 'sandbox.smtp.mailtrap.io' for Mailtrap
define('SMTP_PORT',     587);
define('SMTP_USER',     'fahimhaziq1@gmail.com');    // TODO: move to env
define('SMTP_PASS',     'gjoo lqge liad qnww');      // TODO: move to env — App Password, not account password
define('SMTP_FROM',     'fahimhaziq1@gmail.com');
define('SMTP_FROM_NAME','LAS System');

/**
 * Send an email.
 *
 * @param string $toAddress  Recipient email
 * @param string $toName     Recipient display name
 * @param string $subject    Email subject
 * @param string $body       HTML body (plain text also accepted)
 * @return bool              true on success, false on failure (error logged)
 */
function sendMail(string $toAddress, string $toName, string $subject, string $body): bool {
    $mail = new PHPMailer(true);

    try {
        $mail->isSMTP();
        $mail->Host       = SMTP_HOST;
        $mail->SMTPAuth   = true;
        $mail->Username   = SMTP_USER;
        $mail->Password   = SMTP_PASS;
        $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
        $mail->Port       = SMTP_PORT;

        $mail->setFrom(SMTP_FROM, SMTP_FROM_NAME);
        $mail->addAddress($toAddress, $toName);

        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body    = $body;
        // Plain-text fallback for email clients that don't render HTML
        $mail->AltBody = strip_tags($body);

        $mail->send();
        return true;

    } catch (MailException $e) {
        error_log("sendMail failed to {$toAddress}: " . $mail->ErrorInfo);
        return false;
    }
}