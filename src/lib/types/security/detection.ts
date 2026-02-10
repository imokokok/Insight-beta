/**
 * Price Manipulation Detection Types
 *
 * Types matching the API response format
 */

export type ManipulationType =
  | 'flash_loan_attack'
  | 'price_manipulation'
  | 'oracle_manipulation'
  | 'sandwich_attack'
  | 'front_running'
  | 'back_running'
  | 'liquidity_manipulation'
  | 'statistical_anomaly';

export type DetectionSeverity = 'low' | 'medium' | 'high' | 'critical';
export type DetectionStatus = 'pending' | 'confirmed' | 'false_positive' | 'under_investigation';

export interface DetectionEvidence {
  type: string;
  description: string;
  confidence: number;
  data?: Record<string, unknown>;
}

export interface SuspiciousTransaction {
  hash: string;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  gasPrice?: string;
  gasUsed?: number;
  method?: string;
  input?: string;
  type: string;
  valueUsd?: number;
}

export interface ManipulationDetection {
  id: string;
  protocol: string;
  symbol: string;
  chain: string;
  feedKey: string;
  type: ManipulationType;
  severity: DetectionSeverity;
  confidenceScore: number;
  detectedAt: number;
  evidence: DetectionEvidence[];
  suspiciousTransactions: SuspiciousTransaction[];
  relatedBlocks?: number[];
  /** 价格影响百分比，小数形式 (如 0.01 = 1%) */
  priceImpact?: number;
  financialImpactUsd?: number;
  affectedAddresses?: string[];
  status: DetectionStatus;
  reviewedBy?: string;
  reviewedAt?: number;
  notes?: string;
}

export interface DetectionMetrics {
  totalDetections: number;
  detectionsByType?: Record<string, number>;
  detectionsBySeverity?: Record<string, number>;
  falsePositives: number;
  averageConfidence?: number;
  lastDetectionTime?: string | number;
  totalAlerts?: number;
  averageDetectionTime?: number;
}

export interface ManipulationDetectionConfig {
  zScoreThreshold: number;
  minConfidenceScore: number;
  timeWindowMs: number;
  minDataPoints: number;
  flashLoanMinAmountUsd: number;
  sandwichProfitThresholdUsd: number;
  liquidityChangeThreshold: number;
  maxPriceDeviationPercent: number;
  correlationThreshold: number;
  enabledRules: string[];
  alertChannels: {
    email: boolean;
    webhook: boolean;
    slack: boolean;
    telegram: boolean;
  };
  autoBlockSuspiciousFeeds: boolean;
  notificationCooldownMs: number;
}

export interface ManipulationAlert {
  id: string;
  protocol: string;
  symbol: string;
  chain: string;
  type: ManipulationType;
  severity: DetectionSeverity;
  confidence: number;
  detectedAt: number;
  message: string;
  details?: Record<string, unknown>;
}
