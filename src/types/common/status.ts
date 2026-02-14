/**
 * Status Types - 统一状态类型定义
 *
 * 集中管理所有状态相关的类型定义，避免重复
 */

// ============================================================================
// 实体状态
// ============================================================================

export type EntityStatus = 'active' | 'inactive' | 'pending' | 'archived';

// ============================================================================
// 健康状态
// ============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

// ============================================================================
// 告警严重级别
// ============================================================================

export type SeverityLevel = 'info' | 'warning' | 'critical' | 'emergency';

// ============================================================================
// 告警状态
// ============================================================================

export type AlertStatus = 'firing' | 'pending' | 'resolved' | 'silenced';

// ============================================================================
// 同步状态
// ============================================================================

export type SyncStatus = 'synced' | 'syncing' | 'stale' | 'offline';

// ============================================================================
// 风险等级
// ============================================================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// Dispute 状态
// ============================================================================

export type DisputeStatus =
  | 'active'
  | 'disputed'
  | 'settled'
  | 'expired'
  | 'resolved'
  | 'accepted'
  | 'rejected';

// ============================================================================
// 断言状态
// ============================================================================

export type AssertionStatus = 'proposed' | 'disputed' | 'settled' | 'expired' | 'resolved';

// ============================================================================
// 投票状态
// ============================================================================

export type VotingStatus = 'active' | 'passed' | 'failed' | 'expired';

// ============================================================================
// Badge 状态类型（向后兼容）
// ============================================================================

export type StatusType =
  | 'active'
  | 'stale'
  | 'error'
  | 'pending'
  | 'settled'
  | 'disputed'
  | 'expired'
  | 'inactive'
  | 'resolved'
  | 'unknown'
  | 'online'
  | 'offline'
  | 'warning'
  | 'success';

// ============================================================================
// 状态颜色配置
// ============================================================================

export const STATUS_COLORS: {
  [K in HealthStatus]: {
    primary: string;
    bg: string;
    text: string;
    border: string;
    dot: string;
  };
} = {
  healthy: {
    primary: 'success',
    bg: 'bg-success/10',
    text: 'text-success-dark',
    border: 'border-success/30',
    dot: 'bg-success',
  },
  degraded: {
    primary: 'warning',
    bg: 'bg-warning/10',
    text: 'text-warning-dark',
    border: 'border-warning/30',
    dot: 'bg-warning',
  },
  unhealthy: {
    primary: 'error',
    bg: 'bg-error/10',
    text: 'text-error-dark',
    border: 'border-error/30',
    dot: 'bg-error',
  },
  unknown: {
    primary: 'muted',
    bg: 'bg-muted/30',
    text: 'text-muted-foreground',
    border: 'border-muted',
    dot: 'bg-muted-foreground',
  },
} as const;

// ============================================================================
// Badge 状态颜色配置（带 label）
// ============================================================================

export const STATUS_THEME_COLORS: {
  [K in StatusType]: {
    label: string;
    dotColor: string;
    bgColor: string;
    textColor: string;
  };
} = {
  active: {
    label: 'Active',
    dotColor: 'bg-success',
    bgColor: 'bg-success/20',
    textColor: 'text-success-dark',
  },
  stale: {
    label: 'Stale',
    dotColor: 'bg-warning',
    bgColor: 'bg-warning/20',
    textColor: 'text-warning-dark',
  },
  error: {
    label: 'Error',
    dotColor: 'bg-error',
    bgColor: 'bg-error/20',
    textColor: 'text-error-dark',
  },
  pending: {
    label: 'Pending',
    dotColor: 'bg-primary',
    bgColor: 'bg-primary/20',
    textColor: 'text-primary-dark',
  },
  settled: {
    label: 'Settled',
    dotColor: 'bg-success',
    bgColor: 'bg-success/20',
    textColor: 'text-success-dark',
  },
  disputed: {
    label: 'Disputed',
    dotColor: 'bg-warning',
    bgColor: 'bg-warning/20',
    textColor: 'text-warning-dark',
  },
  expired: {
    label: 'Expired',
    dotColor: 'bg-muted-foreground',
    bgColor: 'bg-muted/30',
    textColor: 'text-muted-foreground',
  },
  inactive: {
    label: 'Inactive',
    dotColor: 'bg-muted-foreground',
    bgColor: 'bg-muted/30',
    textColor: 'text-muted-foreground',
  },
  resolved: {
    label: 'Resolved',
    dotColor: 'bg-success',
    bgColor: 'bg-success/20',
    textColor: 'text-success-dark',
  },
  unknown: {
    label: 'Unknown',
    dotColor: 'bg-muted-foreground',
    bgColor: 'bg-muted/30',
    textColor: 'text-muted-foreground',
  },
  online: {
    label: 'Online',
    dotColor: 'bg-success',
    bgColor: 'bg-success/20',
    textColor: 'text-success-dark',
  },
  offline: {
    label: 'Offline',
    dotColor: 'bg-error',
    bgColor: 'bg-error/20',
    textColor: 'text-error-dark',
  },
  warning: {
    label: 'Warning',
    dotColor: 'bg-warning',
    bgColor: 'bg-warning/20',
    textColor: 'text-warning-dark',
  },
  success: {
    label: 'Success',
    dotColor: 'bg-success',
    bgColor: 'bg-success/20',
    textColor: 'text-success-dark',
  },
} as const;

// ============================================================================
// 风险等级颜色配置
// ============================================================================

export const RISK_COLORS: {
  [K in RiskLevel]: {
    primary: string;
    bg: string;
    text: string;
    border: string;
  };
} = {
  low: {
    primary: 'success',
    bg: 'bg-success/10',
    text: 'text-success-dark',
    border: 'border-success/30',
  },
  medium: {
    primary: 'warning',
    bg: 'bg-warning/10',
    text: 'text-warning-dark',
    border: 'border-warning/30',
  },
  high: {
    primary: 'warning',
    bg: 'bg-warning/10',
    text: 'text-warning-dark',
    border: 'border-warning/30',
  },
  critical: {
    primary: 'error',
    bg: 'bg-error/10',
    text: 'text-error-dark',
    border: 'border-error/30',
  },
} as const;

// ============================================================================
// 严重级别颜色配置
// ============================================================================

export const SEVERITY_COLORS: {
  [K in SeverityLevel]: {
    primary: string;
    bg: string;
    text: string;
    border: string;
  };
} = {
  info: {
    primary: 'primary',
    bg: 'bg-primary/10',
    text: 'text-primary-dark',
    border: 'border-primary/30',
  },
  warning: {
    primary: 'warning',
    bg: 'bg-warning/10',
    text: 'text-warning-dark',
    border: 'border-warning/30',
  },
  critical: {
    primary: 'error',
    bg: 'bg-error/10',
    text: 'text-error-dark',
    border: 'border-error/30',
  },
  emergency: {
    primary: 'error',
    bg: 'bg-error/10',
    text: 'text-error-dark',
    border: 'border-error/30',
  },
} as const;
