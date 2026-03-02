export function formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
  return value.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    ...options,
  });
}

export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
}

export function formatCurrency(value: number, currency: string = 'USD'): string {
  return value.toLocaleString(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  });
}

export function formatCompact(value: number): string {
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(1)}B`;
  }
  if (value >= 1e6) {
    return `${(value / 1e6).toFixed(1)}M`;
  }
  if (value >= 1e3) {
    return `${(value / 1e3).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

export function formatGas(value: number): string {
  return `${formatNumber(value)} gas`;
}

export function formatTimestamp(timestamp: number | Date): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  return date.toLocaleString();
}
