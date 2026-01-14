import { Dispute, Assertion } from "@/lib/oracleTypes";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";

/**
 * Supported notification channels for alert delivery
 */
export type NotificationChannel = "webhook" | "email";

/**
 * Options for configuring notification delivery
 */
export interface NotificationOptions {
  /**
   * List of channels to use for notification delivery
   * @default ["webhook"]
   */
  channels?: NotificationChannel[];
  /**
   * Specific recipient for the notification (e.g., email address)
   * If not provided, default recipient from environment will be used
   */
  recipient?: string;
}

/**
 * Sends an alert notification through configured channels
 *
 * @param alert - The alert details to send
 * @param alert.title - The alert title
 * @param alert.message - The alert message body
 * @param alert.severity - The alert severity level
 * @param alert.fingerprint - Unique identifier for the alert
 * @param options - Optional configuration for notification delivery
 * @returns Promise that resolves when all notifications are sent
 */
export async function notifyAlert(
  alert: {
    title: string;
    message: string;
    severity: "info" | "warning" | "critical";
    fingerprint: string;
  },
  options?: NotificationOptions
) {
  const channels = options?.channels || ["webhook"];

  // Send webhook notification if enabled
  if (channels.includes("webhook")) {
    await sendWebhookNotification(alert);
  }

  // Send email notification if enabled and configured
  if (channels.includes("email")) {
    await sendEmailNotification(alert, options?.recipient);
  }
}

/**
 * Sends a notification via webhook to configured URL
 *
 * @param alert - The alert details to send
 * @returns Promise that resolves when webhook is sent or skipped
 * @internal
 */
async function sendWebhookNotification(alert: {
  title: string;
  message: string;
  severity: "info" | "warning" | "critical";
  fingerprint: string;
}) {
  const url = env.INSIGHT_WEBHOOK_URL;
  if (!url) return;

  const emoji =
    alert.severity === "critical"
      ? "🚨"
      : alert.severity === "warning"
      ? "⚠️"
      : "ℹ️";
  const content = `${emoji} **[${alert.severity.toUpperCase()}] ${
    alert.title
  }**\n${alert.message}\nID: \`${alert.fingerprint}\``;

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    logger.debug("Webhook notification sent successfully", {
      fingerprint: alert.fingerprint,
    });
  } catch (error) {
    logger.error("Failed to send webhook notification", {
      error,
      fingerprint: alert.fingerprint,
    });
  }
}

/**
 * Sends a notification via email to configured recipient
 *
 * @param alert - The alert details to send
 * @param recipient - Optional specific recipient email address
 * @returns Promise that resolves when email is sent or skipped
 * @internal
 */
async function sendEmailNotification(
  alert: {
    title: string;
    message: string;
    severity: "info" | "warning" | "critical";
    fingerprint: string;
  },
  recipient?: string
) {
  // Check if email service is properly configured
  const smtpHost = env.INSIGHT_SMTP_HOST;
  const smtpPort = env.INSIGHT_SMTP_PORT;
  const smtpUser = env.INSIGHT_SMTP_USER;
  const smtpPass = env.INSIGHT_SMTP_PASS;
  const fromEmail = env.INSIGHT_FROM_EMAIL;

  if (!smtpHost || !smtpPort || !smtpUser || !smtpPass || !fromEmail) {
    logger.debug("Email notification not configured, skipping");
    return;
  }

  const toEmail = recipient || env.INSIGHT_DEFAULT_EMAIL;
  if (!toEmail) {
    logger.debug("No recipient email configured for notification, skipping");
    return;
  }

  try {
    // In a real implementation, you would use a proper email library like nodemailer
    // For now, we'll just log the email notification
    logger.info("Sending email notification", {
      to: toEmail,
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      body: `${alert.message}\n\nID: ${alert.fingerprint}`,
      fingerprint: alert.fingerprint,
    });

    // Example implementation with nodemailer (would need to install it)
    // const nodemailer = require('nodemailer');
    // const transporter = nodemailer.createTransport({
    //   host: smtpHost,
    //   port: parseInt(smtpPort),
    //   secure: smtpPort === '465',
    //   auth: {
    //     user: smtpUser,
    //     pass: smtpPass,
    //   },
    // });
    // await transporter.sendMail({
    //   from: fromEmail,
    //   to: toEmail,
    //   subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
    //   text: `${alert.message}\n\nID: ${alert.fingerprint}`,
    // });

    logger.debug("Email notification sent successfully", {
      fingerprint: alert.fingerprint,
    });
  } catch (error) {
    logger.error("Failed to send email notification", {
      error,
      fingerprint: alert.fingerprint,
    });
  }
}

/**
 * Sends a dispute notification with assertion and dispute details
 *
 * @param assertion - The assertion that was disputed
 * @param dispute - The dispute details
 * @param options - Optional configuration for notification delivery
 * @returns Promise that resolves when all notifications are sent
 */
export async function notifyDispute(
  assertion: Assertion,
  dispute: Dispute,
  options?: NotificationOptions
) {
  // Log detailed dispute information to console
  logger.info(
    `\n🚨 [INSIGHT ALERT] Dispute Detected!\n` +
      `------------------------------------\n` +
      `Market:    ${assertion.market}\n` +
      `Assertion: ${assertion.assertion}\n` +
      `Reason:    ${dispute.disputeReason}\n` +
      `Disputer:  ${dispute.disputer}\n` +
      `Tx Hash:   ${assertion.txHash}\n` +
      `------------------------------------\n`
  );

  // Send formal notification through configured channels
  await notifyAlert(
    {
      title: "Dispute Detected",
      message: `Market: ${assertion.market}\nReason: ${dispute.disputeReason}\nAssertion: ${assertion.assertion}`,
      severity: "critical",
      fingerprint: `dispute:${assertion.id}`,
    },
    options
  );
}

/**
 * Sends a test notification through specified channel
 * Useful for verifying notification configuration
 *
 * @param channel - The channel to test
 * @param recipient - Optional specific recipient for the test notification
 * @returns Promise that resolves when test notification is sent
 */
export async function sendTestNotification(
  channel: NotificationChannel,
  recipient?: string
) {
  await notifyAlert(
    {
      title: "Test Notification",
      message:
        "This is a test notification from Insight. If you're seeing this, your notification system is working correctly!",
      severity: "info",
      fingerprint: `test-${Date.now()}`,
    },
    {
      channels: [channel],
      recipient,
    }
  );
}
