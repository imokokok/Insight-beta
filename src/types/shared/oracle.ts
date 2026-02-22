/**
 * Shared Oracle Types
 *
 * 共享的 Oracle 类型定义，各协议模块可扩展这些基础类型
 */

export interface GasCostTrendPoint {
  timestamp: string;
  gasUsed: number;
  costEth: number;
  costUsd: number;
  transactionCount: number;
}

export interface GasCostAnalysisDataBase {
  timeRange: '1h' | '24h' | '7d' | '30d';
  trend: GasCostTrendPoint[];
  totalGasUsed: number;
  totalCostEth: number;
  totalCostUsd: number;
  totalTransactions: number;
  generatedAt: string;
}

export interface CrossChainPriceBase {
  chain: string;
  price: number;
  timestamp: string;
  deviation?: number;
  confidence?: number;
}

export interface PriceDataBase {
  timestamp: string;
  price: number;
}

export interface DeviationMetricsBase {
  mean: number;
  max: number;
  min: number;
  stdDev: number;
}

export interface ReliabilityScoreBase {
  overall: number;
  uptime: number;
  responseTime: number;
  trend: 'up' | 'down' | 'stable';
}

export type TimeRange = '1h' | '24h' | '7d' | '30d';

export interface AlertBase {
  id: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  acknowledged?: boolean;
}
