/**
 * Number Formatting Utilities
 *
 * 数字格式化工具函数
 */

export interface FormatNumberOptions {
  decimals?: number;
  locale?: string;
  notation?: 'standard' | 'compact';
}

export function formatNumber(
  value: number,
  decimals: number = 2,
  locale: string = 'en-US',
): string {
  if (!Number.isFinite(value)) return '—';
  const absValue = Math.abs(value);
  if (absValue >= 1e9) return (value / 1e9).toFixed(decimals) + 'B';
  if (absValue >= 1e6) return (value / 1e6).toFixed(decimals) + 'M';
  if (absValue >= 1e3) return (value / 1e3).toFixed(decimals) + 'K';
  return value.toLocaleString(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatNumberIntl(
  value: number,
  locale: string = 'en-US',
  options?: Intl.NumberFormatOptions,
): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale, options).format(value);
}

export function formatCurrencyIntl(
  value: number,
  locale: string = 'en-US',
  currency: string = 'USD',
  options?: Intl.NumberFormatOptions,
): string {
  if (!Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    ...options,
  }).format(value);
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

export function formatUsd(usd: number): string {
  if (!Number.isFinite(usd)) return '—';
  if (usd >= 1000000) return `$${(usd / 1000000).toFixed(2)}M`;
  if (usd >= 1000) return `$${(usd / 1000).toFixed(2)}K`;
  return `$${usd.toFixed(2)}`;
}

export function formatHeatmapPrice(value: number): string {
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}k`;
  }
  if (value >= 1) {
    return `$${value.toFixed(2)}`;
  }
  return `$${value.toFixed(4)}`;
}

export function formatCost(value: number, freeLabel?: string): string {
  if (value === 0) return freeLabel || '免费';
  if (value < 1) return `$${(value * 100).toFixed(0)}¢`;
  if (value < 1000) return `$${value.toFixed(0)}`;
  return `$${(value / 1000).toFixed(1)}k`;
}
