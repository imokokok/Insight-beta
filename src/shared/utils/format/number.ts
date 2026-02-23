/**
 * Number Formatting Utilities
 *
 * 数字格式化工具函数
 */

export function formatNumber(value: number, decimals: number = 2): string {
  if (!Number.isFinite(value)) return '—';
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return (value / 1e9).toFixed(decimals) + 'B';
  if (absValue >= 1e6) return (value / 1e6).toFixed(decimals) + 'M';
  if (absValue >= 1e3) return (value / 1e3).toFixed(decimals) + 'K';
  return value.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPrice(price: number): string {
  if (!Number.isFinite(price)) return '—';
  if (price === 0) return '$0.00';
  if (Math.abs(price) < 0.0001) return `$${price.toExponential(2)}`;
  if (Math.abs(price) < 0.01) return `$${price.toFixed(6)}`;
  if (Math.abs(price) < 1) return `$${price.toFixed(4)}`;
  if (Math.abs(price) < 1000) return `$${price.toFixed(2)}`;
  return `$${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatUsdCompact(amount: number, locale: string): string {
  const formatted = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
  return formatted;
}

export function calculatePercentage(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

export function truncateAddress(address: string): string {
  if (!address || address.length < 12) return address || '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
