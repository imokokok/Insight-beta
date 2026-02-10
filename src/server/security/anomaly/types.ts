/**
 * Anomaly Detection Types
 * 异常检测类型定义
 */

import type { PriceHistoryRecord } from '@/server/oracle/unifiedPriceService';

export type AnomalyType =
  | 'statistical_outlier'
  | 'trend_break'
  | 'volatility_spike'
  | 'volume_anomaly'
  | 'pattern_deviation'
  | 'correlation_breakdown'
  | 'seasonality_anomaly'
  | 'regime_change';

export type AnomalySeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AnomalyDetection {
  id: string;
  symbol: string;
  type: AnomalyType;
  severity: AnomalySeverity;
  confidence: number;
  timestamp: Date;
  detectedAt: Date;
  metrics: AnomalyMetrics;
  evidence: AnomalyEvidence[];
  relatedData?: PriceHistoryRecord[];
  status: 'active' | 'resolved' | 'false_positive';
}

export interface AnomalyMetrics {
  zScore?: number;
  deviationPercent?: number;
  expectedValue?: number;
  actualValue?: number;
  volatilityChange?: number;
  volumeChange?: number;
  trendSlope?: number;
  correlationCoefficient?: number;
}

export interface AnomalyEvidence {
  type: string;
  description: string;
  value: number;
  threshold: number;
  confidence: number;
}

export interface DetectionConfig {
  // 统计检测配置
  zScoreThreshold: number;
  iqrMultiplier: number;
  minDataPoints: number;

  // 时间序列配置
  windowSize: number;
  trendWindowSize: number;
  volatilityWindowSize: number;

  // 机器学习配置
  isolationForestContamination: number;
  minClusterSize: number;

  // 行为模式配置
  patternHistoryLength: number;
  behaviorChangeThreshold: number;

  // 通用配置
  cooldownPeriodMs: number;
  severityThresholds: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface TimeSeriesPoint {
  timestamp: Date;
  value: number;
  volume?: number;
}
