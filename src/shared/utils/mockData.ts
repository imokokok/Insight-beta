import type { PriceDeviationPoint } from '@/types/analytics/deviation';

export function generateMockData(symbol: string, windowHours: number = 24): PriceDeviationPoint[] {
  const dataPoints: PriceDeviationPoint[] = [];
  const now = new Date();
  const protocols = ['chainlink', 'pyth', 'redstone'];

  const dataPointCount = Math.min(windowHours, 24);

  for (let i = dataPointCount - 1; i >= 0; i--) {
    const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000).toISOString();
    const basePrice = symbol.includes('BTC') ? 65000 : symbol.includes('ETH') ? 3500 : 100;
    const volatility = 0.002;

    const randomDeviation = (Math.random() - 0.5) * volatility;
    const avgPrice = basePrice * (1 + randomDeviation);
    const maxDeviationPercent = Math.abs(randomDeviation) * (1 + Math.random());

    dataPoints.push({
      timestamp,
      symbol,
      protocols,
      prices: {},
      avgPrice,
      medianPrice: avgPrice * (1 + (Math.random() - 0.5) * 0.001),
      maxDeviation: avgPrice * maxDeviationPercent,
      maxDeviationPercent,
      outlierProtocols:
        maxDeviationPercent > 0.005
          ? [protocols[Math.floor(Math.random() * protocols.length)]!]
          : [],
    });
  }

  return dataPoints;
}
