export function formatMarketVolume(volume: number): string {
  if (volume >= 1e9) return `${(volume / 1e9).toFixed(2)}B`;
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(2)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(2)}K`;
  return volume.toFixed(2);
}

export function calculateTrendScore(change24h: number): 'up' | 'down' | 'neutral' {
  if (change24h > 5) return 'up';
  if (change24h < -5) return 'down';
  return 'neutral';
}
