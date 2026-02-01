/**
 * Enterprise Alert Notification Service
 *
 * 企业级告警通知服务
 * 支持多渠道通知：邮件、短信、Webhook、Slack、Discord、Telegram
 */

import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

export type NotificationChannel =
  | 'email'
  | 'sms'
  | 'webhook'
  | 'slack'
  | 'discord'
  | 'telegram'
  | 'pagerduty';

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AlertNotification {
  id: string;
  alertId: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  details: Record<string, unknown>;
  timestamp: Date;
  protocol?: string;
  chain?: string;
  symbol?: string;
}

export interface EmailConfig {
  type: 'email';
  smtpHost: string;
  smtpPort: number;
  username: string;
  password: string;
  fromAddress: string;
  toAddresses: string[];
  useTLS: boolean;
}

export interface SMSConfig {
  type: 'sms';
  provider: 'twilio' | 'aws_sns' | 'aliyun';
  accountSid?: string;
  authToken?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  region?: string;
  fromNumber: string;
  toNumbers: string[];
  templateCode?: string; // 阿里云短信模板代码
}

export interface WebhookConfig {
  type: 'webhook';
  url: string;
  method: 'POST' | 'PUT';
  headers: Record<string, string>;
  timeoutMs: number;
  retryCount: number;
}

export interface SlackConfig {
  type: 'slack';
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconEmoji?: string;
}

export interface DiscordConfig {
  type: 'discord';
  webhookUrl: string;
  username?: string;
  avatarUrl?: string;
}

export interface TelegramConfig {
  type: 'telegram';
  botToken: string;
  chatIds: string[];
  parseMode: 'HTML' | 'Markdown';
}

export interface PagerDutyConfig {
  type: 'pagerduty';
  integrationKey: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
}

export type NotificationConfig =
  | EmailConfig
  | SMSConfig
  | WebhookConfig
  | SlackConfig
  | DiscordConfig
  | TelegramConfig
  | PagerDutyConfig;

export interface NotificationResult {
  success: boolean;
  channel: NotificationChannel;
  messageId?: string;
  error?: string;
  timestamp: Date;
  durationMs: number;
}

// ============================================================================
// Email Notification
// ============================================================================

async function sendEmailNotification(
  notification: AlertNotification,
  config: EmailConfig,
): Promise<NotificationResult> {
  const startTime = Date.now();

  try {
    // 这里使用 nodemailer 或其他邮件库
    // 为了演示，使用 fetch 调用邮件服务 API
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

function formatEmailBody(notification: AlertNotification): string {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: ${getSeverityColor(notification.severity)};">
          ${notification.title}
        </h2>
        <p><strong>Severity:</strong> ${notification.severity.toUpperCase()}</p>
        <p><strong>Time:</strong> ${notification.timestamp.toISOString()}</p>
        <p><strong>Message:</strong></p>
        <p>${notification.message}</p>
        ${notification.protocol ? `<p><strong>Protocol:</strong> ${notification.protocol}</p>` : ''}
        ${notification.chain ? `<p><strong>Chain:</strong> ${notification.chain}</p>` : ''}
        ${notification.symbol ? `<p><strong>Symbol:</strong> ${notification.symbol}</p>` : ''}
        <hr />
        <p style="font-size: 12px; color: #666;">
          This is an automated alert from Oracle Monitor Platform.
        </p>
      </body>
    </html>
  `;
}

// ============================================================================
// SMS Notification
// ============================================================================

async function sendSMSNotification(
  notification: AlertNotification,
  config: SMSConfig,
): Promise<NotificationResult> {
  const startTime = Date.now();

  try {
    switch (config.provider) {
      case 'twilio':
        return await sendTwilioSMS(notification, config, startTime);
      case 'aws_sns':
        return await sendAWSSNS(notification, config, startTime);
      case 'aliyun':
        return await sendAliyunSMS(notification, config, startTime);
      default:
        throw new Error(`SMS provider ${config.provider} not implemented`);
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
 * 发送 Twilio SMS
 */
async function sendTwilioSMS(
  notification: AlertNotification,
  config: SMSConfig,
  startTime: number,
): Promise<NotificationResult> {
  const apiUrl = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;
  const auth = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');
  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    Authorization: `Basic ${auth}`,
  };
  const toNumber = config.toNumbers[0];
  if (!toNumber) {
    throw new Error('No recipient phone number provided');
  }

  const body: Record<string, string> = {
    From: config.fromNumber,
    To: toNumber,
    Body: `[${notification.severity.toUpperCase()}] ${notification.title}: ${notification.message.slice(0, 100)}`,
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body: new URLSearchParams(body),
  });

  if (!response.ok) {
    throw new Error(`Twilio API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    success: true,
    channel: 'sms',
    messageId: data.sid,
    timestamp: new Date(),
    durationMs: Date.now() - startTime,
  };
}

/**
 * 发送 AWS SNS SMS
 */
async function sendAWSSNS(
  notification: AlertNotification,
  config: SMSConfig,
  startTime: number,
): Promise<NotificationResult> {
  const region = config.region || 'us-east-1';
  const apiUrl = `https://sns.${region}.amazonaws.com/`;

  const message = `[${notification.severity.toUpperCase()}] ${notification.title}: ${notification.message.slice(0, 100)}`;

  // 构建 AWS Signature V4
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\..*/g, '');
  const dateStamp = amzDate.slice(0, 8);

  const toNumber = config.toNumbers[0];
  if (!toNumber) {
    throw new Error('No recipient phone number provided');
  }

  const payload: Record<string, string> = {
    Action: 'Publish',
    Message: message,
    PhoneNumber: toNumber,
    'MessageAttributes.entry.1.Name': 'AWS.SNS.SMS.SenderID',
    'MessageAttributes.entry.1.Value.DataType': 'String',
    'MessageAttributes.entry.1.Value.StringValue': config.fromNumber,
  };

  const body = new URLSearchParams(payload).toString();

  // 计算签名
  const accessKeyId = config.accessKeyId;
  if (!accessKeyId) {
    throw new Error('AWS access key ID is required');
  }

  const signature = await calculateAWSSignature(
    accessKeyId,
    config.secretAccessKey!,
    region,
    'sns',
    body,
    dateStamp,
    amzDate,
  );

  const headers: Record<string, string> = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'X-Amz-Date': amzDate,
    Authorization: `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${dateStamp}/${region}/sns/aws4_request, SignedHeaders=host;x-amz-date, Signature=${signature}`,
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers,
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`AWS SNS API error: ${response.status} - ${errorText}`);
  }

  const data = await response.text();
  const messageIdMatch = data.match(/<MessageId>(.*?)<\/MessageId>/);

  return {
    success: true,
    channel: 'sms',
    messageId: messageIdMatch?.[1] || 'unknown',
    timestamp: new Date(),
    durationMs: Date.now() - startTime,
  };
}

/**
 * 发送阿里云 SMS
 */
async function sendAliyunSMS(
  notification: AlertNotification,
  config: SMSConfig,
  startTime: number,
): Promise<NotificationResult> {
  const apiUrl = 'https://dysmsapi.aliyuncs.com/';

  const message = `[${notification.severity.toUpperCase()}] ${notification.title}: ${notification.message.slice(0, 100)}`;

  const toNumber = config.toNumbers[0];
  if (!toNumber) {
    throw new Error('No recipient phone number provided');
  }

  const accessKeyId = config.accessKeyId;
  if (!accessKeyId) {
    throw new Error('Aliyun access key ID is required');
  }

  // 构建请求参数
  const params: Record<string, string> = {
    Action: 'SendSms',
    Version: '2017-05-25',
    RegionId: config.region || 'cn-hangzhou',
    PhoneNumbers: toNumber,
    SignName: config.fromNumber,
    TemplateCode: config.templateCode || 'SMS_12345678',
    TemplateParam: JSON.stringify({ message }),
    AccessKeyId: accessKeyId,
    SignatureMethod: 'HMAC-SHA1',
    Timestamp: new Date().toISOString(),
    SignatureVersion: '1.0',
    SignatureNonce: crypto.randomUUID(),
    Format: 'JSON',
  };

  // 计算签名
  const signature = await calculateAliyunSignature(config.secretAccessKey!, params);
  params.Signature = signature;

  const body = new URLSearchParams(params).toString();

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Aliyun SMS API error: ${errorData.Message || response.status}`);
  }

  const data = await response.json();

  if (data.Code !== 'OK') {
    throw new Error(`Aliyun SMS error: ${data.Message}`);
  }

  return {
    success: true,
    channel: 'sms',
    messageId: data.BizId,
    timestamp: new Date(),
    durationMs: Date.now() - startTime,
  };
}

/**
 * 计算 AWS Signature V4
 */
async function calculateAWSSignature(
  _accessKeyId: string,
  secretKey: string,
  region: string,
  service: string,
  payload: string,
  dateStamp: string,
  amzDate: string,
): Promise<string> {
  const algorithm = 'AWS4-HMAC-SHA256';
  const method = 'POST';
  const uri = '/';
  const queryString = '';
  const host = `sns.${region}.amazonaws.com`;

  // 创建规范请求
  const canonicalHeaders = `host:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-date';
  const payloadHash = await sha256(payload);

  const canonicalRequest = `${method}\n${uri}\n${queryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  // 创建待签名字符串
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${await sha256(canonicalRequest)}`;

  // 计算签名
  const signingKey = await getAWSSigningKey(secretKey, dateStamp, region, service);
  const signatureBuffer = await hmacSHA256(signingKey, stringToSign);
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return signature;
}

/**
 * 计算阿里云签名
 */
async function calculateAliyunSignature(
  secretKey: string,
  params: Record<string, string>,
): Promise<string> {
  // 按参数名排序
  const sortedParams = Object.keys(params)
    .sort()
    .reduce<Record<string, string>>((acc, key) => {
      const value = params[key];
      if (value !== undefined) {
        acc[key] = value;
      }
      return acc;
    }, {});

  // 构建规范查询字符串
  const canonicalQueryString = Object.entries(sortedParams)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

  // 构建待签名字符串
  const stringToSign = `POST&${encodeURIComponent('/')}&${encodeURIComponent(canonicalQueryString)}`;

  // 计算签名
  const key = `${secretKey}&`;
  const signature = await hmacSHA1(key, stringToSign);

  return signature;
}

/**
 * 获取 AWS 签名密钥
 */
async function getAWSSigningKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string,
): Promise<ArrayBuffer> {
  const kDate = await hmacSHA256(`AWS4${secretKey}`, dateStamp);
  const kRegion = await hmacSHA256(kDate, region);
  const kService = await hmacSHA256(kRegion, service);
  const kSigning = await hmacSHA256(kService, 'aws4_request');
  return kSigning;
}

/**
 * HMAC-SHA256
 */
async function hmacSHA256(key: string | ArrayBuffer, message: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    typeof key === 'string' ? new TextEncoder().encode(key) : key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
}

/**
 * HMAC-SHA1
 */
async function hmacSHA1(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(key),
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

/**
 * SHA256 哈希
 */
async function sha256(message: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(message));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ============================================================================
// Webhook Notification
// ============================================================================

async function sendWebhookNotification(
  notification: AlertNotification,
  config: WebhookConfig,
): Promise<NotificationResult> {
  const startTime = Date.now();
  let lastError: string | undefined;

  for (let attempt = 0; attempt < config.retryCount; attempt++) {
    try {
      const response = await fetch(config.url, {
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
        body: JSON.stringify({
          id: notification.id,
          alertId: notification.alertId,
          severity: notification.severity,
          title: notification.title,
          message: notification.message,
          details: notification.details,
          timestamp: notification.timestamp.toISOString(),
          protocol: notification.protocol,
          chain: notification.chain,
          symbol: notification.symbol,
        }),
        signal: AbortSignal.timeout(config.timeoutMs),
      });

      if (!response.ok) {
        throw new Error(`Webhook error: ${response.status}`);
      }

      return {
        success: true,
        channel: 'webhook',
        messageId: `webhook-${Date.now()}`,
        timestamp: new Date(),
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
      if (attempt < config.retryCount - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
  }

  return {
    success: false,
    channel: 'webhook',
    error: lastError,
    timestamp: new Date(),
    durationMs: Date.now() - startTime,
  };
}

// ============================================================================
// Slack Notification
// ============================================================================

async function sendSlackNotification(
  notification: AlertNotification,
  config: SlackConfig,
): Promise<NotificationResult> {
  const startTime = Date.now();

  try {
    const color = getSeverityColor(notification.severity);

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: config.channel,
        username: config.username || 'Oracle Monitor',
        icon_emoji: config.iconEmoji || ':warning:',
        attachments: [
          {
            color,
            title: notification.title,
            text: notification.message,
            fields: [
              {
                title: 'Severity',
                value: notification.severity.toUpperCase(),
                short: true,
              },
              {
                title: 'Time',
                value: notification.timestamp.toISOString(),
                short: true,
              },
              ...(notification.protocol
                ? [
                    {
                      title: 'Protocol',
                      value: notification.protocol,
                      short: true,
                    },
                  ]
                : []),
              ...(notification.chain
                ? [
                    {
                      title: 'Chain',
                      value: notification.chain,
                      short: true,
                    },
                  ]
                : []),
              ...(notification.symbol
                ? [
                    {
                      title: 'Symbol',
                      value: notification.symbol,
                      short: true,
                    },
                  ]
                : []),
            ],
            footer: 'Oracle Monitor Platform',
            ts: Math.floor(notification.timestamp.getTime() / 1000),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.status}`);
    }

    return {
      success: true,
      channel: 'slack',
      messageId: `slack-${Date.now()}`,
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      channel: 'slack',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// Discord Notification
// ============================================================================

async function sendDiscordNotification(
  notification: AlertNotification,
  config: DiscordConfig,
): Promise<NotificationResult> {
  const startTime = Date.now();

  try {
    const color = getSeverityColorNumber(notification.severity);

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: config.username || 'Oracle Monitor',
        avatar_url: config.avatarUrl,
        embeds: [
          {
            title: notification.title,
            description: notification.message,
            color,
            fields: [
              {
                name: 'Severity',
                value: notification.severity.toUpperCase(),
                inline: true,
              },
              {
                name: 'Time',
                value: notification.timestamp.toISOString(),
                inline: true,
              },
              ...(notification.protocol
                ? [
                    {
                      name: 'Protocol',
                      value: notification.protocol,
                      inline: true,
                    },
                  ]
                : []),
              ...(notification.chain
                ? [
                    {
                      name: 'Chain',
                      value: notification.chain,
                      inline: true,
                    },
                  ]
                : []),
              ...(notification.symbol
                ? [
                    {
                      name: 'Symbol',
                      value: notification.symbol,
                      inline: true,
                    },
                  ]
                : []),
            ],
            footer: {
              text: 'Oracle Monitor Platform',
            },
            timestamp: notification.timestamp.toISOString(),
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.status}`);
    }

    return {
      success: true,
      channel: 'discord',
      messageId: `discord-${Date.now()}`,
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      channel: 'discord',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// Telegram Notification
// ============================================================================

async function sendTelegramNotification(
  notification: AlertNotification,
  config: TelegramConfig,
): Promise<NotificationResult> {
  const startTime = Date.now();

  try {
    const emoji = getSeverityEmoji(notification.severity);
    const text = formatTelegramMessage(notification, emoji, config.parseMode);

    const results = await Promise.all(
      config.chatIds.map(async (chatId) => {
        const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: config.parseMode,
          }),
        });

        if (!response.ok) {
          throw new Error(`Telegram API error: ${response.status}`);
        }

        return response.json();
      }),
    );

    return {
      success: true,
      channel: 'telegram',
      messageId: `telegram-${results[0]?.result?.message_id}`,
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      channel: 'telegram',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
    };
  }
}

function formatTelegramMessage(
  notification: AlertNotification,
  emoji: string,
  parseMode: 'HTML' | 'Markdown',
): string {
  if (parseMode === 'HTML') {
    return `
<b>${emoji} ${notification.title}</b>

<b>Severity:</b> ${notification.severity.toUpperCase()}
<b>Time:</b> ${notification.timestamp.toISOString()}

${notification.message}

${notification.protocol ? `<b>Protocol:</b> ${notification.protocol}\n` : ''}${
      notification.chain ? `<b>Chain:</b> ${notification.chain}\n` : ''
    }${notification.symbol ? `<b>Symbol:</b> ${notification.symbol}` : ''}
    `.trim();
  }

  return `
*${emoji} ${notification.title}*

*Severity:* ${notification.severity.toUpperCase()}
*Time:* ${notification.timestamp.toISOString()}

${notification.message}

${notification.protocol ? `*Protocol:* ${notification.protocol}\n` : ''}${
    notification.chain ? `*Chain:* ${notification.chain}\n` : ''
  }${notification.symbol ? `*Symbol:* ${notification.symbol}` : ''}
  `.trim();
}

// ============================================================================
// PagerDuty Notification
// ============================================================================

async function sendPagerDutyNotification(
  notification: AlertNotification,
  config: PagerDutyConfig,
): Promise<NotificationResult> {
  const startTime = Date.now();

  try {
    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        routing_key: config.integrationKey,
        event_action: 'trigger',
        dedup_key: notification.alertId,
        payload: {
          summary: notification.title,
          severity: config.severity,
          source: 'oracle-monitor',
          custom_details: {
            message: notification.message,
            ...notification.details,
            protocol: notification.protocol,
            chain: notification.chain,
            symbol: notification.symbol,
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`PagerDuty API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      success: true,
      channel: 'pagerduty',
      messageId: data.dedup_key,
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      channel: 'pagerduty',
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date(),
      durationMs: Date.now() - startTime,
    };
  }
}

// ============================================================================
// Main Notification Service
// ============================================================================

export class NotificationService {
  private configs: Map<string, NotificationConfig> = new Map();

  /**
   * 注册通知渠道配置
   */
  registerChannel(name: string, config: NotificationConfig): void {
    this.configs.set(name, config);
    logger.info(`Registered notification channel: ${name} (${config.type})`);
  }

  /**
   * 发送通知到指定渠道
   */
  async sendNotification(
    channelName: string,
    notification: AlertNotification,
  ): Promise<NotificationResult> {
    const config = this.configs.get(channelName);
    if (!config) {
      return {
        success: false,
        channel: 'email',
        error: `Channel ${channelName} not found`,
        timestamp: new Date(),
        durationMs: 0,
      };
    }

    logger.info(`Sending notification via ${channelName}`, {
      alertId: notification.alertId,
      severity: notification.severity,
    });

    switch (config.type) {
      case 'email':
        return sendEmailNotification(notification, config);
      case 'sms':
        return sendSMSNotification(notification, config);
      case 'webhook':
        return sendWebhookNotification(notification, config);
      case 'slack':
        return sendSlackNotification(notification, config);
      case 'discord':
        return sendDiscordNotification(notification, config);
      case 'telegram':
        return sendTelegramNotification(notification, config);
      case 'pagerduty':
        return sendPagerDutyNotification(notification, config);
      default: {
        const unknownConfig = config as NotificationConfig;
        return {
          success: false,
          channel: unknownConfig.type as NotificationChannel,
          error: `Unknown channel type: ${unknownConfig.type}`,
          timestamp: new Date(),
          durationMs: 0,
        };
      }
    }
  }

  /**
   * 广播通知到所有已注册的渠道
   */
  async broadcastNotification(
    notification: AlertNotification,
    filter?: (config: NotificationConfig) => boolean,
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];

    for (const [name, config] of this.configs) {
      if (filter && !filter(config)) {
        continue;
      }

      const result = await this.sendNotification(name, notification);
      results.push(result);
    }

    return results;
  }

  /**
   * 根据严重性级别发送通知
   */
  async sendBySeverity(
    notification: AlertNotification,
    severityConfig: Record<AlertSeverity, string[]>,
  ): Promise<NotificationResult[]> {
    const channelNames = severityConfig[notification.severity] || [];
    const results: NotificationResult[] = [];

    for (const channelName of channelNames) {
      const result = await this.sendNotification(channelName, notification);
      results.push(result);
    }

    return results;
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

function getSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical':
      return '#dc3545';
    case 'warning':
      return '#ffc107';
    case 'info':
      return '#17a2b8';
    default:
      return '#6c757d';
  }
}

function getSeverityColorNumber(severity: AlertSeverity): number {
  switch (severity) {
    case 'critical':
      return 0xdc3545;
    case 'warning':
      return 0xffc107;
    case 'info':
      return 0x17a2b8;
    default:
      return 0x6c757d;
  }
}

function getSeverityEmoji(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical':
      return '🚨';
    case 'warning':
      return '⚠️';
    case 'info':
      return 'ℹ️';
    default:
      return '📢';
  }
}

// 导出单例实例
export const notificationService = new NotificationService();
