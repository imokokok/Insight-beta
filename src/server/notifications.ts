import { Dispute, Assertion } from "@/lib/oracleTypes";
import { logger } from "@/lib/logger";
import { env } from "@/lib/env";
import type { Transporter } from "nodemailer";

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
  options?: NotificationOptions,
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

let smtpTransport: Transporter | null = null;

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
  if (!url) {
    logger.debug("Webhook notification not configured, skipping", {
      fingerprint: alert.fingerprint,
    });
    return;
  }

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
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.error("Webhook notification failed", {
        status: res.status,
        fingerprint: alert.fingerprint,
        response: body.slice(0, 500),
      });
      return;
    }
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
  recipient?: string,
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
    const port = Number(smtpPort);
    const resolvedPort = Number.isFinite(port) ? port : 587;
    if (!smtpTransport) {
      const nodemailer = await import("nodemailer");
      smtpTransport = nodemailer.createTransport({
        host: smtpHost,
        port: resolvedPort,
        secure: resolvedPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });
    }

    const subject = `[${alert.severity.toUpperCase()}] ${alert.title}`;
    const text = `${alert.message}\n\nID: ${alert.fingerprint}`;
    const html = `<div style="font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;line-height:1.5">
<div style="font-size:14px;margin-bottom:12px"><strong>${subject}</strong></div>
<pre style="white-space:pre-wrap;background:#f6f7f9;padding:12px;border-radius:8px;border:1px solid #eceef2;font-size:13px">${escapeHtml(
      alert.message,
    )}</pre>
<div style="font-size:12px;color:#6b7280;margin-top:10px">ID: <code>${escapeHtml(
      alert.fingerprint,
    )}</code></div>
</div>`;

    await smtpTransport.sendMail({
      from: fromEmail,
      to: toEmail,
      subject,
      text,
      html,
    });
  } catch (error) {
    logger.error("Failed to send email notification", {
      error,
      fingerprint: alert.fingerprint,
    });
  }
}

function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  options?: NotificationOptions,
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
      `------------------------------------\n`,
  );

  // Send formal notification through configured channels
  await notifyAlert(
    {
      title: "Dispute Detected",
      message: `Market: ${assertion.market}\nReason: ${dispute.disputeReason}\nAssertion: ${assertion.assertion}`,
      severity: "critical",
      fingerprint: `dispute:${assertion.id}`,
    },
    options,
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
  recipient?: string,
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
    },
  );
}
