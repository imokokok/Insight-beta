/**
 * Security Types
 *
 * 安全模块的公共类型定义
 */

export type { ThreatLevel } from '@/features/security/components/ThreatLevelBadge';

export interface SecurityAlert {
  id: string;
  type: 'anomaly' | 'threat' | 'warning';
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface SecurityMetrics {
  totalAlerts: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  lastUpdated: string;
}
