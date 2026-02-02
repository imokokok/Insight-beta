import { bench, describe } from 'vitest';

// Mock price data for benchmarking
interface PriceData {
  protocol: string;
  price: number;
  timestamp: number;
  confidence: number;
}

const mockPrices: PriceData[] = [
  { protocol: 'CHAINLINK', price: 1000.5, timestamp: Date.now(), confidence: 0.95 },
  { protocol: 'PYTH', price: 1000.3, timestamp: Date.now(), confidence: 0.98 },
  { protocol: 'BAND', price: 1000.7, timestamp: Date.now(), confidence: 0.92 },
  { protocol: 'API3', price: 1000.4, timestamp: Date.now(), confidence: 0.94 },
  { protocol: 'REDSTONE', price: 1000.6, timestamp: Date.now(), confidence: 0.96 },
];

const outlierPrices: PriceData[] = [
  ...mockPrices,
  { protocol: 'UMA', price: 1500.0, timestamp: Date.now(), confidence: 0.5 }, // Outlier
];

describe('Price Aggregation Benchmarks', () => {
  bench('simple average aggregation', () => {
    const sum = mockPrices.reduce((acc, p) => acc + p.price, 0);
    const avg = sum / mockPrices.length;
    // Use avg to avoid unused variable error
    void avg;
  });

  bench('weighted average aggregation', () => {
    const totalWeight = mockPrices.reduce((acc, p) => acc + p.confidence, 0);
    const weightedSum = mockPrices.reduce((acc, p) => acc + (p.price * p.confidence), 0);
    const weightedAvg = weightedSum / totalWeight;
    void weightedAvg;
  });

  bench('median calculation', () => {
    const sorted = [...mockPrices].sort((a, b) => a.price - b.price);
    const median = sorted[Math.floor(sorted.length / 2)]?.price ?? 0;
    void median;
  });

  bench('outlier detection with IQR', () => {
    const prices = outlierPrices.map(p => p.price);
    const sorted = [...prices].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)] ?? 0;
    const q3 = sorted[Math.floor(sorted.length * 0.75)] ?? 0;
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const filtered = prices.filter(p => p >= lowerBound && p <= upperBound);
    void filtered;
  });

  bench('outlier detection with Z-score', () => {
    const prices = outlierPrices.map(p => p.price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / prices.length;
    const stdDev = Math.sqrt(variance);
    const filtered = prices.filter(p => Math.abs((p - mean) / stdDev) < 2);
    void filtered;
  });

  bench('complete aggregation pipeline', () => {
    // Simulate full aggregation pipeline
    const validPrices = mockPrices.filter(p => p.confidence > 0.8);
    const totalWeight = validPrices.reduce((acc, p) => acc + p.confidence, 0);
    const weightedSum = validPrices.reduce((acc, p) => acc + (p.price * p.confidence), 0);
    const aggregated = weightedSum / totalWeight;
    const confidence = Math.min(...validPrices.map(p => p.confidence));
    void aggregated;
    void confidence;
  });
});

describe('Protocol Data Fetching Benchmarks', () => {
  bench('parse 1000 price updates', () => {
    const updates = Array.from({ length: 1000 }, (_, i) => ({
      protocol: 'CHAINLINK',
      pair: 'ETH/USD',
      price: 1000 + Math.random() * 100,
      timestamp: Date.now() - i * 1000,
      confidence: 0.9 + Math.random() * 0.1,
    }));
    
    const parsed = updates.map(u => ({
      ...u,
      price: Math.round(u.price * 100) / 100,
    }));
    void parsed;
  });

  bench('calculate price deviation', () => {
    const prices = Array.from({ length: 100 }, () => 1000 + Math.random() * 10);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const deviations = prices.map(p => Math.abs((p - mean) / mean) * 100);
    const maxDeviation = Math.max(...deviations);
    void maxDeviation;
  });
});
