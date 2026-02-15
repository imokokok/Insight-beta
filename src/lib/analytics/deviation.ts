/**
 * Deviation Analytics Utilities - 偏离分析工具库
 *
 * 提供偏离检测、异常值分析、趋势计算等通用算法
 */

import { robustTrendAnalysis } from '@/shared/utils/robustTrendAnalysis';
import type {
  DeviationThresholds,
  TrendDirection,
  TrendAnalysis,
  OutlierDetectionConfig,
  PricePoint,
  CacheEntry,
} from '@/types/analytics/deviation';

export function classifyDeviation(
  deviationPercent: number,
  thresholds: DeviationThresholds = { low: 0.005, medium: 0.01, high: 0.02, critical: 0.05 },
): 'low' | 'medium' | 'high' | 'critical' {
  if (deviationPercent >= thresholds.critical) return 'critical';
  if (deviationPercent >= thresholds.high) return 'high';
  if (deviationPercent >= thresholds.medium) return 'medium';
  return 'low';
}

export function calculateDeviationPercent(price: number, referencePrice: number): number {
  if (referencePrice === 0) return 0;
  return Math.abs((price - referencePrice) / referencePrice);
}

export function calculateConsensusPrice(
  prices: number[],
  method: 'median' | 'mean' | 'weighted' = 'median',
  weights?: number[],
): number {
  if (prices.length === 0) return 0;
  if (prices.length === 1) return prices[0]!;

  switch (method) {
    case 'median': {
      const sorted = [...prices].sort((a, b) => a - b);
      const mid = Math.floor(sorted.length / 2);
      if (sorted.length % 2 !== 0) {
        return sorted[mid] ?? 0;
      }
      const left = sorted[mid - 1];
      const right = sorted[mid];
      return ((left ?? 0) + (right ?? 0)) / 2;
    }

    case 'mean':
      return prices.reduce((sum, p) => sum + p, 0) / prices.length;

    case 'weighted': {
      if (!weights || weights.length !== prices.length) {
        return calculateConsensusPrice(prices, 'mean');
      }
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      if (totalWeight === 0) return calculateConsensusPrice(prices, 'mean');
      let weightedSum = 0;
      for (let i = 0; i < prices.length; i++) {
        const price = prices[i];
        const weight = weights[i];
        if (price !== undefined && weight !== undefined) {
          weightedSum += price * weight;
        }
      }
      return weightedSum / totalWeight;
    }

    default:
      return prices[0] ?? 0;
  }
}

export function detectAnomaliesWithThreshold(
  deviations: number[],
  threshold: number,
): number[] {
  return deviations
    .map((d, i) => ({ deviation: d, index: i }))
    .filter((d) => d.deviation > threshold)
    .map((d) => d.index);
}

export function detectAnomaliesWithIQR(
  deviations: number[],
  multiplier: number = 1.5,
): number[] {
  if (deviations.length < 4) return [];

  const sorted = [...deviations].sort((a, b) => a - b);
  const q1Index = Math.floor(sorted.length * 0.25);
  const q3Index = Math.floor(sorted.length * 0.75);
  const q1 = sorted[q1Index] ?? 0;
  const q3 = sorted[q3Index] ?? 0;
  const iqr = q3 - q1;

  const lowerBound = q1 - multiplier * iqr;
  const upperBound = q3 + multiplier * iqr;

  return deviations
    .map((d, i) => ({ deviation: d, index: i }))
    .filter((d) => d.deviation < lowerBound || d.deviation > upperBound)
    .map((d) => d.index);
}

export function detectAnomaliesWithZScore(
  deviations: number[],
  zscoreThreshold: number = 3,
): number[] {
  if (deviations.length < 4) return [];

  const mean = deviations.reduce((sum, d) => sum + d, 0) / deviations.length;
  const variance = deviations.reduce((sum, d) => sum + Math.pow(d - mean, 2), 0) / deviations.length;
  const std = Math.sqrt(variance);

  if (std === 0) return [];

  return deviations
    .map((d, i) => ({ deviation: d, index: i, zscore: Math.abs((d - mean) / std) }))
    .filter((d) => d.zscore > zscoreThreshold)
    .map((d) => d.index);
}

export function detectOutliers(
  deviations: number[],
  config: OutlierDetectionConfig,
): number[] {
  const { method, threshold, iqrMultiplier, zscoreThreshold, minDataPoints } = config;

  if (deviations.length < minDataPoints) {
    return method === 'threshold' ? detectAnomaliesWithThreshold(deviations, threshold) : [];
  }

  const thresholdIndices = method === 'threshold' || method === 'both'
    ? detectAnomaliesWithThreshold(deviations, threshold)
    : [];

  const iqrIndices = method === 'iqr' || method === 'both'
    ? detectAnomaliesWithIQR(deviations, iqrMultiplier)
    : [];

  const zscoreIndices = method === 'zscore'
    ? detectAnomaliesWithZScore(deviations, zscoreThreshold)
    : [];

  const allIndices = new Set([...thresholdIndices, ...iqrIndices, ...zscoreIndices]);
  return Array.from(allIndices).sort((a, b) => a - b);
}

export function analyzeTrend(deviations: number[]): TrendAnalysis {
  if (deviations.length < 2) {
    return {
      direction: 'stable',
      strength: 0,
      slope: 0,
      volatility: 0,
      intercept: deviations[0] ?? 0,
    };
  }

  const result = robustTrendAnalysis(deviations, 0.05);

  return {
    direction: result.direction,
    strength: result.strength,
    slope: result.slope,
    volatility: result.volatility,
    intercept: result.intercept,
  };
}

export function calculateAnomalyScore(
  deviations: number[],
  outlierIndices: number[],
  threshold: number,
): number {
  if (deviations.length === 0) return 0;

  const outlierRatio = outlierIndices.length / deviations.length;
  const highDeviationRatio = deviations.filter(d => d > threshold).length / deviations.length;

  return Math.min((outlierRatio + highDeviationRatio) / 2, 1);
}

export function generateRecommendation(
  direction: TrendDirection,
  strength: number,
  avgDeviation: number,
  anomalyScore: number,
  thresholds: DeviationThresholds,
): string {
  const parts: string[] = [];

  if (anomalyScore > 0.7) {
    parts.push('High anomaly detected. Investigate data sources immediately.');
  } else if (anomalyScore > 0.4) {
    parts.push('Moderate anomalies observed. Monitor closely.');
  }

  if (direction === 'increasing' && strength > 0.5) {
    parts.push('Deviation trend is increasing significantly.');
  }

  if (avgDeviation > thresholds.critical) {
    parts.push(`Average deviation is critical (${(avgDeviation * 100).toFixed(1)}%).`);
  } else if (avgDeviation > thresholds.high) {
    parts.push(`Average deviation is high (${(avgDeviation * 100).toFixed(1)}%).`);
  } else if (avgDeviation > thresholds.medium) {
    parts.push(`Average deviation is elevated (${(avgDeviation * 100).toFixed(1)}%).`);
  }

  if (parts.length === 0) {
    return 'Price deviation is within normal ranges.';
  }

  return parts.join(' ');
}

const defaultCache = new Map<string, CacheEntry<unknown>>();

export function getCached<T>(key: string, cache: Map<string, CacheEntry<unknown>> = defaultCache): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache<T>(
  key: string,
  data: T,
  ttlMs: number,
  cache: Map<string, CacheEntry<unknown>> = defaultCache,
): void {
  const now = Date.now();
  cache.set(key, {
    data,
    timestamp: now,
    expiresAt: now + ttlMs,
  });
}

export function clearCache(cache: Map<string, CacheEntry<unknown>> = defaultCache): void {
  cache.clear();
}

export function cleanExpiredCache(cache: Map<string, CacheEntry<unknown>> = defaultCache): number {
  const now = Date.now();
  let cleaned = 0;
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) {
      cache.delete(key);
      cleaned++;
    }
  }
  return cleaned;
}

export function calculateVolatility(prices: PricePoint[]): number {
  if (prices.length < 2) return 0;
  
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prevPrice = prices[i - 1]?.price;
    const currPrice = prices[i]?.price;
    if (prevPrice && currPrice && prevPrice > 0) {
      returns.push(Math.log(currPrice / prevPrice));
    }
  }
  
  if (returns.length === 0) return 0;
  
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
  
  return Math.sqrt(variance);
}

export function calculateMaxDeviation(
  protocolPrices: { protocol: string; price: number }[],
  consensusPrice: number,
): { protocol: string; deviation: number; deviationPercent: number } | null {
  if (protocolPrices.length === 0 || consensusPrice === 0) return null;

  let maxDev = { protocol: '', deviation: 0, deviationPercent: 0 };

  for (const { protocol, price } of protocolPrices) {
    const deviation = Math.abs(price - consensusPrice);
    const deviationPercent = deviation / consensusPrice;

    if (deviationPercent > maxDev.deviationPercent) {
      maxDev = { protocol, deviation, deviationPercent };
    }
  }

  return maxDev;
}
