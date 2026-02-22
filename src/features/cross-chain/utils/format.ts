import {
  formatGas,
  formatInterval,
  formatLatency,
  formatPrice,
  getLatencyColor,
} from '@/shared/utils/format';

export { formatGas, formatInterval, formatLatency, formatPrice, getLatencyColor };

export function formatEth(eth: number): string {
  if (eth >= 1) return `${eth.toFixed(4)} ETH`;
  if (eth >= 0.001) return `${(eth * 1000).toFixed(2)} mETH`;
  return `${(eth * 1000000).toFixed(0)} gwei`;
}

export function formatUsd(usd: number): string {
  if (usd >= 1000000) return `$${(usd / 1000000).toFixed(2)}M`;
  if (usd >= 1000) return `$${(usd / 1000).toFixed(2)}K`;
  return `$${usd.toFixed(2)}`;
}

export function formatDeviation(percent: number): string {
  if (percent < 0.01) return percent.toFixed(6);
  if (percent < 1) return percent.toFixed(4);
  return percent.toFixed(2);
}

export function getDeviationColor(percent: number): string {
  if (percent < 0.1) return 'text-green-500';
  if (percent < 0.5) return 'text-yellow-500';
  return 'text-red-500';
}

export function getDeviationBadgeVariant(percent: number): 'success' | 'warning' | 'destructive' {
  if (percent < 0.1) return 'success';
  if (percent < 0.5) return 'warning';
  return 'destructive';
}
