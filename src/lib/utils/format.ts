/**
 * Format Utilities
 *
 * 格式化工具函数
 */

import { logger } from '@/lib/logger';

/**
 * 格式化价格为美元字符串
 *
 * @param price - 价格数值
 * @returns 格式化后的价格字符串
 *
 * @example
 * ```typescript
 * formatPrice(1500.5); // Returns: '$1,500.50'
 * formatPrice(0.001234); // Returns: '$0.001234'
 * ```
 */
export function formatPrice(price: number): string {
  if (price === 0) return '$0.00';
  if (price < 0.01) return `$${price.toFixed(6)}`;
  if (price < 1) return `$${price.toFixed(4)}`;
  if (price < 1000) return `$${price.toFixed(2)}`;
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * 格式化时间为相对时间（多久以前）
 *
 * @param date - ISO 日期字符串或 Date 对象
 * @returns 相对时间字符串，如 '2分钟前', '1小时前', '昨天' 等
 *
 * @example
 * ```typescript
 * formatTimeAgo('2024-01-01T12:00:00Z'); // Returns: '2分钟前'
 * ```
 */
export function formatTimeAgo(date: string | Date): string {
  const now = new Date();
  const then = typeof date === 'string' ? new Date(date) : date;
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 120) return '1 minute ago';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} minutes ago`;
  if (seconds < 7200) return '1 hour ago';
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
  if (seconds < 172800) return 'yesterday';
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  if (seconds < 2592000) return `${Math.floor(seconds / 604800)} weeks ago`;
  if (seconds < 31536000) return `${Math.floor(seconds / 2592000)} months ago`;
  return `${Math.floor(seconds / 31536000)} years ago`;
}

/**
 * 截断地址，显示前6位和后4位
 *
 * @param address - 要截断的地址字符串
 * @returns 截断后的地址，如 '0x1234...5678'
 *
 * @example
 * ```typescript
 * truncateAddress('0x1234567890abcdef1234567890abcdef12345678');
 * // Returns: '0x1234...5678'
 * ```
 */
export function truncateAddress(address: string): string {
  if (!address || address.length < 12) return address || '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * 将数字格式化为紧凑的美元货币格式
 *
 * 使用 Intl.NumberFormat 进行本地化格式化，适用于大数字的简洁显示
 *
 * @param amount - 要格式化的金额
 * @param locale - 区域设置，如 'en-US', 'zh-CN'
 * @returns 格式化后的货币字符串
 *
 * @example
 * ```typescript
 * formatUsdCompact(1234567, 'en-US'); // Returns: '$1.2M'
 * formatUsdCompact(1500, 'en-US');    // Returns: '$1.5K'
 * ```
 */
export function formatUsdCompact(amount: number, locale: string): string {
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
  return formatted;
}

/**
 * 将 ISO 日期字符串格式化为本地化的日期时间格式
 *
 * @param iso - ISO 8601 格式的日期字符串
 * @param locale - 区域设置
 * @returns 格式化后的日期时间字符串，如果输入无效返回 '—'
 *
 * @example
 * ```typescript
 * formatTime('2021-01-01T12:30:00Z', 'en-US');
 * // Returns: 'Jan 1, 12:30 PM'
 * ```
 */
export function formatTime(iso: string | null | undefined, locale: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '—';
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}

/**
 * 计算百分比
 *
 * @param part - 部分值
 * @param total - 总值
 * @returns 百分比整数（0-100），如果 total 为 0 返回 0
 *
 * @example
 * ```typescript
 * calculatePercentage(25, 100); // Returns: 25
 * calculatePercentage(1, 3);    // Returns: 33
 * calculatePercentage(0, 0);    // Returns: 0
 * ```
 */
export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

/**
 * 将分钟数格式化为人类可读的持续时间字符串
 *
 * @param totalMinutes - 总分钟数
 * @returns 格式化后的持续时间，如 '2h 30m' 或 '—' 如果无效
 *
 * @example
 * ```typescript
 * formatDurationMinutes(150);  // Returns: '2h 30m'
 * formatDurationMinutes(45);   // Returns: '45m'
 * formatDurationMinutes(120);  // Returns: '2h'
 * formatDurationMinutes(-1);   // Returns: '—'
 * ```
 */
export function formatDurationMinutes(totalMinutes: number): string {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return '—';
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

/**
 * 将时间戳格式化为本地时间字符串
 *
 * @param timestamp - ISO 日期字符串、Date 对象或 Unix 时间戳（毫秒）
 * @returns 格式化后的本地时间字符串
 *
 * @example
 * ```typescript
 * formatTimestamp('2024-01-01T12:00:00Z'); // Returns: 'Jan 1, 12:00:00 PM'
 * formatTimestamp(1704110400000); // Returns: 'Jan 1, 12:00:00 PM'
 * ```
 */
export function formatTimestamp(timestamp: string | number | Date): string {
  if (!timestamp) return '—';

  let date: Date;
  if (typeof timestamp === 'number') {
    date = new Date(timestamp);
  } else if (typeof timestamp === 'string') {
    date = new Date(timestamp);
  } else {
    date = timestamp;
  }

  if (!Number.isFinite(date.getTime())) return '—';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

/**
 * 将文本复制到剪贴板
 *
 * 优先使用现代 Clipboard API，如果不支持则回退到 document.execCommand
 *
 * @param text - 要复制的文本
 * @returns 复制成功返回 true，失败返回 false
 *
 * @example
 * ```typescript
 * const success = await copyToClipboard('Hello World');
 * if (success) {
 *   console.log('复制成功');
 * }
 * ```
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    logger.warn('Failed to copy to clipboard using navigator.clipboard', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.style.top = '-9999px';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
