export interface PricePoint {
  timestamp: string;
  oraclePrice: number;
  referencePrice: number;
  deviation: number;
}

/**
 * Simulates fetching a reference price from a trusted source (CEX).
 * In a real production environment, this would call Binance/Coinbase APIs.
 * For this demo, we generate a realistic looking price curve with some noise.
 */
export async function fetchReferencePriceHistory(
  symbol: string = "ETH",
  days: number = 30,
): Promise<PricePoint[]> {
  const points: PricePoint[] = [];
  const now = Date.now();
  const msPerDay = 24 * 60 * 60 * 1000;

  // Base price for simulation
  const basePrice = symbol === "BTC" ? 65000 : symbol === "ETH" ? 3500 : 100;

  for (let i = days; i >= 0; i--) {
    const time = now - i * msPerDay;
    const date = new Date(time).toISOString();

    // Add some trend (sine wave)
    const trend = Math.sin(time / (msPerDay * 7)) * (basePrice * 0.1);

    // Reference price (True market price)
    const noise = (Math.random() - 0.5) * (basePrice * 0.02);
    const refPrice = basePrice + trend + noise;

    // Oracle price (On-chain price)
    // Oracle usually lags slightly and has less noise due to aggregation,
    // but sometimes has "outliers" or larger deviation.
    const oracleNoise = (Math.random() - 0.5) * (basePrice * 0.01);
    // Simulate a small lag or deviation
    const deviationEvent = Math.random() > 0.95 ? basePrice * 0.05 : 0; // 5% chance of 5% deviation
    const oraclePrice = refPrice + oracleNoise + deviationEvent;

    const deviation = Math.abs(oraclePrice - refPrice) / refPrice;

    points.push({
      timestamp: date,
      oraclePrice: Number(oraclePrice.toFixed(2)),
      referencePrice: Number(refPrice.toFixed(2)),
      deviation: Number(deviation.toFixed(4)),
    });
  }

  return points;
}

/**
 * Fetches the current reference price and oracle price (simulated).
 * Used for real-time monitoring and alerting.
 */
export async function fetchCurrentPrice(
  symbol: string = "ETH",
): Promise<{ referencePrice: number; oraclePrice: number }> {
  // Reuse the logic but for "now"
  const basePrice = symbol === "BTC" ? 65000 : symbol === "ETH" ? 3500 : 100;
  const time = Date.now();
  const trend = Math.sin(time / (24 * 60 * 60 * 1000 * 7)) * (basePrice * 0.1);
  const noise = (Math.random() - 0.5) * (basePrice * 0.02);
  const refPrice = basePrice + trend + noise;

  // Simulate occasional deviation for testing alerts
  // 10% chance of deviation
  const deviationEvent = Math.random() > 0.9 ? basePrice * 0.03 : 0;
  const oraclePrice =
    refPrice + (Math.random() - 0.5) * (basePrice * 0.01) + deviationEvent;

  return {
    referencePrice: Number(refPrice.toFixed(2)),
    oraclePrice: Number(oraclePrice.toFixed(2)),
  };
}

export function calculateHealthScore(points: PricePoint[]): number {
  if (points.length === 0) return 100;

  // Calculate average deviation
  const avgDeviation =
    points.reduce((sum, p) => sum + p.deviation, 0) / points.length;

  // Score formula: Start at 100.
  // Deduct 1 point for every 0.1% average deviation.
  // So 1% avg deviation = -10 points.
  const deviationPenalty = avgDeviation * 1000 * 1;

  // Cap penalty
  const score = Math.max(0, Math.min(100, 100 - deviationPenalty));

  return Math.round(score);
}
