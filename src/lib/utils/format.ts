/**
 * Format Utilities - 通用格式化工具函数
 */

/**
 * 格式化时间为"多久之前"
 * @param timestamp - ISO 格式时间字符串
 * @returns 格式化后的字符串，如 "5m ago", "2h ago"
 */
export function formatTimeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * 格式化价格显示
 * @param price - 价格数值
 * @param decimals - 小数位数
 * @returns 格式化后的价格字符串
 */
export function formatPrice(price: number, decimals: number = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(price);
}

/**
 * 格式化百分比
 * @param value - 百分比数值 (0-100)
 * @param decimals - 小数位数
 * @returns 格式化后的百分比字符串
 */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * 格式化大数字
 * @param num - 数字
 * @returns 格式化后的字符串，如 "1.2K", "3.4M"
 */
export function formatNumber(num: number): string {
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

/**
 * 截断地址显示
 * @param address - 完整地址
 * @param start - 开头保留字符数
 * @param end - 结尾保留字符数
 * @returns 截断后的地址，如 "0x1234...5678"
 */
export function truncateAddress(address: string, start: number = 6, end: number = 4): string {
  if (address.length <= start + end) return address;
  return `${address.slice(0, start)}...${address.slice(-end)}`;
}
