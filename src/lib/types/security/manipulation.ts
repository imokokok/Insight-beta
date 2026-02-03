/**
 * 价格操纵检测系统类型定义
 *
 * 用于检测预言机价格操纵、闪电贷攻击等异常行为
 */

import type { OracleProtocol, SupportedChain } from '../unifiedOracleTypes';

// ============================================================================
// 操纵检测类型
// ============================================================================

export type ManipulationType =
  | 'flash_loan_attack' // 闪电贷攻击
  | 'price_manipulation' // 价格操纵
  | 'oracle_manipulation' // 预言机操纵
  | 'sandwich_attack' // 三明治攻击
  | 'front_running' // 抢跑交易
  | 'back_running' // 尾随交易
  | 'liquidity_manipulation' // 流动性操纵
  | 'statistical_anomaly'; // 统计异常

export type DetectionSeverity = 'low' | 'medium' | 'high' | 'critical';

export type DetectionStatus =
  | 'detected'
  | 'investigating'
  | 'confirmed'
  | 'false_positive'
  | 'resolved';

// ============================================================================
// 检测结果
// ============================================================================

export interface ManipulationDetection {
  id: string;
  type: ManipulationType;
  severity: DetectionSeverity;
  status: DetectionStatus;
  confidence: number; // 0-100%
  timestamp: number;

  // 受影响的预言机和价格对
  affectedFeeds: {
    protocol: OracleProtocol;
    symbol: string;
    chain: SupportedChain;
    feedAddress: string;
  }[];

  // 检测详情
  details: {
    description: string;
    evidence: DetectionEvidence[];
    priceDeviation: number; // 价格偏离百分比
    normalPrice: number; // 正常价格
    manipulatedPrice: number; // 被操纵价格
    duration: number; // 持续时间（毫秒）
  };

  // 可疑交易
  suspiciousTransactions: SuspiciousTransaction[];

  // 影响评估
  impact: {
    affectedProtocols: string[]; // 受影响的DeFi协议
    estimatedLossUSD: number; // 估计损失
    potentialLiquidations: number; // 潜在清算数量
  };

  // 建议措施
  recommendedActions: RecommendedAction[];

  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface DetectionEvidence {
  type:
    | 'price_spike'
    | 'volume_anomaly'
    | 'liquidity_drop'
    | 'transaction_pattern'
    | 'time_correlation';
  description: string;
  data: Record<string, unknown>;
  timestamp: number;
}

export interface SuspiciousTransaction {
  hash: string;
  chain: SupportedChain;
  blockNumber: number;
  timestamp: number;
  from: string;
  to: string;
  value: string;
  gasUsed: number;

  // 交易分析
  analysis: {
    type: 'flash_loan' | 'swap' | 'liquidation' | 'arbitrage' | 'unknown';
    profitUSD: number;
    borrowedAmount?: number;
    swappedAmount?: number;
    involvedTokens: string[];
    dexPlatforms: string[];
  };

  // 关联性评分
  relevanceScore: number; // 0-100%
}

export interface RecommendedAction {
  priority: 'immediate' | 'high' | 'medium' | 'low';
  action: string;
  description: string;
  automated: boolean; // 是否可自动执行
}

// ============================================================================
// 检测配置
// ============================================================================

export interface ManipulationDetectionConfig {
  // 统计异常检测阈值
  statisticalThresholds: {
    priceDeviation: number; // 价格偏离阈值（如 5%）
    volumeAnomaly: number; // 交易量异常阈值（标准差倍数）
    liquidityDrop: number; // 流动性下降阈值（如 50%）
    timeWindow: number; // 检测时间窗口（毫秒）
  };

  // 模式识别配置
  patternRecognition: {
    flashLoanMinProfit: number; // 闪电贷最小利润（USD）
    sandwichMinProfit: number; // 三明治攻击最小利润
    frontRunMinProfit: number; // 抢跑最小利润
    maxNormalTxValue: number; // 正常交易最大价值
  };

  // 多源验证配置
  multiSourceValidation: {
    enabled: boolean;
    sources: ('cex' | 'dex' | 'aggregators')[];
    deviationTolerance: number; // 多源偏差容忍度
  };

  // 告警配置
  alerting: {
    minSeverity: DetectionSeverity;
    channels: ('webhook' | 'email' | 'slack' | 'telegram')[];
    cooldownPeriod: number; // 告警冷却期（毫秒）
  };
}

// ============================================================================
// 检测规则
// ============================================================================

export interface DetectionRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  type: ManipulationType;

  // 规则条件
  conditions: DetectionCondition[];

  // 评分权重
  weights: {
    statistical: number;
    pattern: number;
    correlation: number;
  };

  // 阈值
  thresholds: {
    minConfidence: number;
    minSeverity: DetectionSeverity;
  };

  createdAt: string;
  updatedAt: string;
}

export interface DetectionCondition {
  field: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'in' | 'contains';
  value: unknown;
}

// ============================================================================
// 监控和报告
// ============================================================================

export interface DetectionMetrics {
  period: {
    start: string;
    end: string;
  };

  summary: {
    totalDetections: number;
    bySeverity: Record<DetectionSeverity, number>;
    byType: Record<ManipulationType, number>;
    confirmedAttacks: number;
    falsePositives: number;
    averageConfidence: number;
  };

  trends: {
    dailyDetections: Array<{
      date: string;
      count: number;
      severity: DetectionSeverity;
    }>;
    topAffectedFeeds: Array<{
      feed: string;
      detectionCount: number;
    }>;
  };

  // 响应统计
  responseStats: {
    averageResponseTime: number; // 平均响应时间（毫秒）
    automatedResponses: number; // 自动响应次数
    manualInvestigations: number; // 人工调查次数
  };
}

export interface DetectionReport {
  id: string;
  title: string;
  description: string;

  // 报告范围
  scope: {
    feeds: string[];
    protocols: OracleProtocol[];
    chains: SupportedChain[];
    timeRange: {
      start: string;
      end: string;
    };
  };

  // 发现摘要
  findings: {
    totalDetections: number;
    highSeverityCount: number;
    confirmedManipulations: number;
    estimatedTotalLossUSD: number;
  };

  // 详细检测列表
  detections: ManipulationDetection[];

  // 建议
  recommendations: string[];

  generatedAt: string;
  generatedBy: string;
}

// ============================================================================
// 实时检测状态
// ============================================================================

export interface RealTimeDetectionState {
  isMonitoring: boolean;
  monitoredFeeds: string[];

  // 当前检测到的威胁
  activeThreats: ManipulationDetection[];

  // 最近检测
  recentDetections: ManipulationDetection[];

  // 系统健康度
  systemHealth: {
    lastCheckAt: string;
    dataSourceStatus: Record<string, 'healthy' | 'degraded' | 'down'>;
    detectionEngineStatus: 'running' | 'paused' | 'error';
  };
}

// ============================================================================
// API 请求/响应类型
// ============================================================================

export interface DetectionQueryParams {
  startTime?: string;
  endTime?: string;
  types?: ManipulationType[];
  severities?: DetectionSeverity[];
  protocols?: OracleProtocol[];
  chains?: SupportedChain[];
  status?: DetectionStatus;
  minConfidence?: number;
  limit?: number;
  offset?: number;
}

export interface DetectionListResponse {
  detections: ManipulationDetection[];
  total: number;
  hasMore: boolean;
}

export interface CreateDetectionReportRequest {
  title: string;
  description?: string;
  scope: {
    feeds?: string[];
    protocols?: OracleProtocol[];
    chains?: SupportedChain[];
    timeRange: {
      start: string;
      end: string;
    };
  };
}
