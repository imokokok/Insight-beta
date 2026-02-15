/**
 * Analytics Core Types - 分析核心类型定义
 *
 * 提供偏离检测、价格比较等功能的通用类型定义
 */

import type { OracleProtocol } from '@/types/oracle';

export type DeviationSeverity = 'low' | 'medium' | 'high' | 'critical';

export type TrendDirection = 'increasing' | 'decreasing' | 'stable';

export interface DeviationThresholds {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export const DEFAULT_DEVIATION_THRESHOLDS: DeviationThresholds = {
  low: 0.005,
  medium: 0.01,
  high: 0.02,
  critical: 0.05,
};

export interface PricePoint {
  timestamp: string;
  price: number;
}

export interface ProtocolPrice {
  protocol: OracleProtocol;
  price: number;
  timestamp: string;
}

export interface PriceDeviationData {
  symbol: string;
  timestamp: string;
  protocolPrices: ProtocolPrice[];
  consensusPrice: number;
  maxDeviation: number;
  maxDeviationPercent: number;
  outlierProtocols: OracleProtocol[];
}

export interface TrendAnalysis {
  direction: TrendDirection;
  strength: number;
  slope: number;
  volatility: number;
  intercept: number;
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  score: number;
  method: 'threshold' | 'iqr' | 'zscore';
}

export interface DeviationConfig {
  analysisWindowHours: number;
  minDataPoints: number;
  thresholds: DeviationThresholds;
  outlierDetection: OutlierDetectionConfig;
  refreshIntervalMs: number;
}

export interface OutlierDetectionConfig {
  method: 'threshold' | 'iqr' | 'zscore' | 'both';
  threshold: number;
  iqrMultiplier: number;
  zscoreThreshold: number;
  minDataPoints: number;
}

export const DEFAULT_DEVIATION_CONFIG: DeviationConfig = {
  analysisWindowHours: 24,
  minDataPoints: 10,
  thresholds: DEFAULT_DEVIATION_THRESHOLDS,
  outlierDetection: {
    method: 'both',
    threshold: 0.01,
    iqrMultiplier: 1.5,
    zscoreThreshold: 3,
    minDataPoints: 4,
  },
  refreshIntervalMs: 60000,
};

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheOptions {
  ttlMs: number;
  maxSize?: number;
}

export interface ComparisonMetric {
  symbol: string;
  deviation: number;
  volatility: number;
  anomalyScore: number;
  rank: number;
}

export interface PerformanceMetrics {
  totalTimeMs: number;
  symbolCount: number;
  avgTimePerSymbolMs: number;
  cacheHitRate: number;
  databaseQueryTimeMs: number;
}
