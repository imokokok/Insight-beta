export {
  formatNumber,
  formatCurrencyIntl as formatCurrency,
  formatNumberIntl,
  formatPrice,
  formatUsdCompact,
  formatUsd,
  truncateAddress,
  calculatePercentage,
} from './format/number';

export {
  formatTimeAgo,
  formatTime,
  formatDurationMinutes,
  formatDateIntl,
  formatRelativeTimeIntl,
  formatRelativeTime,
} from './format/date';

export {
  formatGas,
  formatEth,
  formatAddress,
  formatHash,
  formatBlockNumber,
  getGasStatus,
  getGasColor,
} from './format/blockchain';

export function formatPercent(value: number, decimals: number = 2): string {
  return `${value.toFixed(decimals)}%`;
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

export function formatTimestamp(timestamp: number | Date): string {
  const date = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  return date.toLocaleString();
}
