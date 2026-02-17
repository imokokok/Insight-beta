/**
 * Alerts Types - 统一告警系统类型定义
 *
 * 用于价格异常、跨链分析、安全等告警
 */

export type AlertSource = 'price_anomaly' | 'cross_chain' | 'security';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical' | 'info' | 'warning';

export type AlertStatus = 'active' | 'resolved' | 'investigating';

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
