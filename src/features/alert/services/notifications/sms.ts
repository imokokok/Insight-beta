/**
 * SMS Notification Channel
 *
 * 短信通知渠道实现
 */

import { formatPlainText, truncateText } from './utils';

import type { AlertNotification, SMSConfig, NotificationResult } from './types';

/**
 * 发送短信通知
 */
export async function sendSMSNotification(
  notification: AlertNotification,
  config: SMSConfig,
): Promise<NotificationResult> {
  const startTime = Date.now();

  try {
    const message = truncateText(formatPlainText(notification), 160);

    switch (config.provider) {
      case 'twilio':
        return await sendTwilioSMS(config, message, startTime);
      case 'aws_sns':
        return await sendAWSSNS(config, message, startTime);
      case 'aliyun':
        return await sendAliyunSMS(config, message, notification, startTime);
      default:
        throw new Error(`Unsupported SMS provider: ${config.provider}`);
    }
  } catch (error) {
    return {
      success: false,
      channel: 'sms',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
    };
  }
}

/**
 * 使用 Twilio 发送短信
 */
async function sendTwilioSMS(
  config: SMSConfig,
  message: string,
  startTime: number,
): Promise<NotificationResult> {
  const results = await Promise.all(
    config.toNumbers.map(async (toNumber) => {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Authorization: `Basic ${btoa(`${config.accountSid}:${config.authToken}`)}`,
          },
          body: new URLSearchParams({
            From: config.fromNumber,
            To: toNumber,
            Body: message,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Twilio API error: ${response.status}`);
      }

      return response.json();
    }),
  );

  return {
    success: true,
    channel: 'sms',
    messageId: results[0]?.sid,
    timestamp: new Date(),
    durationMs: Date.now() - startTime,
  };
}

/**
 * 使用 AWS SNS 发送短信
 */
async function sendAWSSNS(
  config: SMSConfig,
  message: string,
  startTime: number,
): Promise<NotificationResult> {
  // AWS SNS 实现
  const phoneNumber = config.toNumbers[0];
  if (!phoneNumber) {
    throw new Error('No recipient phone number provided');
  }

  const response = await fetch(`https://sns.${config.region}.amazonaws.com/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      Action: 'Publish',
      Message: message,
      PhoneNumber: phoneNumber,
    }),
  });

  if (!response.ok) {
    throw new Error(`AWS SNS API error: ${response.status}`);
  }

  return {
    success: true,
    channel: 'sms',
    timestamp: new Date(),
    durationMs: Date.now() - startTime,
  };
}

/**
 * 使用阿里云发送短信
 */
async function sendAliyunSMS(
  config: SMSConfig,
  _message: string,
  notification: AlertNotification,
  startTime: number,
): Promise<NotificationResult> {
  // 阿里云短信服务实现
  const response = await fetch('https://dysmsapi.aliyuncs.com/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      PhoneNumbers: config.toNumbers.join(','),
      SignName: 'OracleMonitor',
      TemplateCode: config.templateCode,
      TemplateParam: JSON.stringify({
        severity: notification.severity,
        title: truncateText(notification.title, 20),
      }),
    }),
  });

  if (!response.ok) {
    throw new Error(`Aliyun SMS API error: ${response.status}`);
  }

  return {
    success: true,
    channel: 'sms',
    timestamp: new Date(),
    durationMs: Date.now() - startTime,
  };
}
