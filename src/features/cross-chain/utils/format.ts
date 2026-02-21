export function formatPrice(price: number): string {
  if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (price >= 1) return `$${price.toFixed(4)}`;
  return `$${price.toFixed(6)}`;
}

export function formatGas(gas: number): string {
  if (gas >= 1000000000) return `${(gas / 1000000000).toFixed(2)}B`;
  if (gas >= 1000000) return `${(gas / 1000000).toFixed(2)}M`;
  if (gas >= 1000) return `${(gas / 1000).toFixed(0)}K`;
  return gas.toFixed(0);
}

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

export function formatInterval(ms: number): string {
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toFixed(1)}m`;
  const hours = minutes / 60;
  return `${hours.toFixed(1)}h`;
}

export function formatLatency(ms: number): string {
  if (ms < 1000) return `${ms.toFixed(0)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
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

export function getLatencyColor(latency: number): string {
  if (latency < 100) return 'text-green-500';
  if (latency < 500) return 'text-yellow-500';
  return 'text-red-500';
}

export function getDeviationBadgeVariant(percent: number): 'success' | 'warning' | 'destructive' {
  if (percent < 0.1) return 'success';
  if (percent < 0.5) return 'warning';
  return 'destructive';
}
