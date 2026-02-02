/**
 * Email Notification Channel
 *
 * 邮件通知渠道实现
 */

import type { AlertNotification, EmailConfig, NotificationResult } from './types';
import { formatEmailBody } from './utils';

/**
 * 发送邮件通知
 */
export async function sendEmailNotification(
  notification: AlertNotification,
  config: EmailConfig,
): Promise<NotificationResult> {
  const startTime = Date.now();

  try {
    // 使用 SendGrid API 发送邮件
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.password}`,
      },
      body: JSON.stringify({
        personalizations: [
          {
            to: config.toAddresses.map((email) => ({ email })),
          },
        ],
        from: { email: config.fromAddress },
        subject: `[${notification.severity.toUpperCase()}] ${notification.title}`,
        content: [
          {
            type: 'text/html',
            value: formatEmailBody(notification),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Email API error: ${response.status}`);
    }

    return {
      success: true,
      channel: 'email',
      messageId: `email-${Date.now()}`,
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      channel: 'email',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
    };
  }
}
