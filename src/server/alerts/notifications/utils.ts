/**
 * Notification Utilities
 *
 * 通知服务工具函数
 */

import type { AlertNotification, AlertSeverity } from './types';

/**
 * 获取严重级别的颜色
 */
export function getSeverityColor(severity: AlertSeverity): string {
  const colors: Record<AlertSeverity, string> = {
    critical: '#dc2626',
    warning: '#f59e0b',
    info: '#3b82f6',
  };
  return colors[severity];
}

/**
 * 获取严重级别的显示文本
 */
export function getSeverityLabel(severity: AlertSeverity): string {
  const labels: Record<AlertSeverity, string> = {
    critical: '严重',
    warning: '警告',
    info: '信息',
  };
  return labels[severity];
}

/**
 * 格式化通知内容为纯文本
 */
export function formatPlainText(notification: AlertNotification): string {
  const lines = [
    `[${notification.severity.toUpperCase()}] ${notification.title}`,
    `时间: ${notification.timestamp.toISOString()}`,
    `消息: ${notification.message}`,
  ];

  if (notification.protocol) {
    lines.push(`协议: ${notification.protocol}`);
  }
  if (notification.chain) {
    lines.push(`链: ${notification.chain}`);
  }
  if (notification.symbol) {
    lines.push(`代币: ${notification.symbol}`);
  }

  return lines.join('\n');
}

/**
 * 格式化通知内容为 Markdown
 */
export function formatMarkdown(notification: AlertNotification): string {
  const severityEmoji = {
    critical: '🚨',
    warning: '⚠️',
    info: 'ℹ️',
  };

  const lines = [
    `${severityEmoji[notification.severity]} **[${notification.severity.toUpperCase()}]** ${notification.title}`,
    '',
    `**时间:** ${notification.timestamp.toISOString()}`,
    '',
    `**消息:**`,
    notification.message,
  ];

  if (notification.protocol || notification.chain || notification.symbol) {
    lines.push('', '**详情:**');
    if (notification.protocol) {
      lines.push(`- 协议: ${notification.protocol}`);
    }
    if (notification.chain) {
      lines.push(`- 链: ${notification.chain}`);
    }
    if (notification.symbol) {
      lines.push(`- 代币: ${notification.symbol}`);
    }
  }

  return lines.join('\n');
}

/**
 * 格式化邮件正文
 */
export function formatEmailBody(notification: AlertNotification): string {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="color: ${getSeverityColor(notification.severity)};">
          ${notification.title}
        </h2>
        <p><strong>严重级别:</strong> ${getSeverityLabel(notification.severity)}</p>
        <p><strong>时间:</strong> ${notification.timestamp.toISOString()}</p>
        <p><strong>消息:</strong></p>
        <p>${notification.message}</p>
        ${notification.protocol ? `<p><strong>协议:</strong> ${notification.protocol}</p>` : ''}
        ${notification.chain ? `<p><strong>链:</strong> ${notification.chain}</p>` : ''}
        ${notification.symbol ? `<p><strong>代币:</strong> ${notification.symbol}</p>` : ''}
        <hr />
        <p style="font-size: 12px; color: #666;">
          此邮件由 Oracle Monitor Platform 自动发送。
        </p>
      </body>
    </html>
  `;
}

/**
 * 截断文本到指定长度
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * 延迟函数
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 带超时控制的 fetch
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const { timeoutMs = 10000, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}
