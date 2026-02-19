/**
 * Alerts Types - 统一告警系统类型定义
 *
 * 用于价格异常、跨链分析、安全等告警
 */

import type {
  AlertSeverity as AlertSeverityBase,
  AlertStatus as AlertStatusBase,
} from '@/types/common/status';

export type AlertSeverity = AlertSeverityBase;
export type AlertStatus = AlertStatusBase;

export type AlertSource = 'price_anomaly' | 'cross_chain' | 'security';

export interface UnifiedAlert {
  id: string;
  source: AlertSource;
  timestamp: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  symbol?: string;
  chainA?: string;
  chainB?: string;
  protocol?: string;
  protocols?: string[];
  deviation?: number;
  priceA?: number;
  priceB?: number;
  avgPrice?: number;
  outlierProtocols?: string[];
  reason?: string;
  type?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
}

export interface AlertsSummary {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  active: number;
  resolved: number;
  bySource: {
    price_anomaly: number;
    cross_chain: number;
    security: number;
  };
}

export interface AlertsResponse {
  success: boolean;
  data: {
    alerts: UnifiedAlert[];
    summary: AlertsSummary;
  };
  timestamp: string;
}

export interface UseAlertsOptions {
  source?: AlertSource | 'all';
  severity?: AlertSeverity | 'all';
  status?: AlertStatus | 'all';
  searchQuery?: string;
}

export interface ResponseTimeMetrics {
  mttr: number;
  mtta: number;
  acknowledgementRate: number;
  resolutionRate: number;
  avgResponseTimeBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface ResponseTimeTrendPoint {
  date: string;
  mttr: number;
  mtta: number;
  alertCount: number;
}

export interface ResponseTimeStatsResponse {
  success: boolean;
  data: {
    metrics: ResponseTimeMetrics;
    trend: ResponseTimeTrendPoint[];
  };
  timestamp: string;
}
