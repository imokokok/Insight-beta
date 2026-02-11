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
// 数据新鲜度状态
// ============================================================================

export type DataFreshnessStatus = 'fresh' | 'stale' | 'expired' | 'unknown';

// ============================================================================
// 同步状态
// ============================================================================

export type SyncStatus = 'synced' | 'syncing' | 'stale' | 'offline';

// ============================================================================
// 连接状态
// ============================================================================

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected' | 'reconnecting';

// ============================================================================
// 风险等级
// ============================================================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// 操作结果状态
// ============================================================================

export type OperationStatus = 'idle' | 'loading' | 'success' | 'error';

// ============================================================================
// 验证状态
// ============================================================================

export type ValidationStatus = 'valid' | 'invalid' | 'pending' | 'warning';

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

export type AssertionStatus = 
  | 'proposed' 
  | 'disputed' 
  | 'settled' 
  | 'expired' 
  | 'resolved';

// ============================================================================
// 投票状态
// ============================================================================

export type VotingStatus = 'active' | 'passed' | 'failed' | 'expired';

// ============================================================================
// 奖励状态
// ============================================================================

export type RewardStatus = 'pending' | 'claimable' | 'claimed' | 'expired';

// ============================================================================
// 通用状态映射
// ============================================================================

export const STATUS_MAPPINGS: {
  [key: string]: HealthStatus;
} = {
  active: 'healthy',
  synced: 'healthy',
  connected: 'healthy',
  valid: 'healthy',
  resolved: 'healthy',
  fresh: 'healthy',
  claimable: 'healthy',
  
  pending: 'degraded',
  disputed: 'degraded',
  syncing: 'degraded',
  connecting: 'degraded',
  warning: 'degraded',
  stale: 'degraded',
  
  inactive: 'unhealthy',
  expired: 'unhealthy',
  offline: 'unhealthy',
  disconnected: 'unhealthy',
  invalid: 'unhealthy',
  error: 'unhealthy',
  failed: 'unhealthy',
  rejected: 'unhealthy',
  
  unknown: 'unknown',
  silenced: 'unknown',
  reconnecting: 'unknown',
} as const;

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
    primary: 'emerald',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
  },
  degraded: {
    primary: 'amber',
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
  },
  unhealthy: {
    primary: 'red',
    bg: 'bg-red-500/10',
    text: 'text-red-600',
    border: 'border-red-500/30',
    dot: 'bg-red-500',
  },
  unknown: {
    primary: 'gray',
    bg: 'bg-gray-500/10',
    text: 'text-gray-600',
    border: 'border-gray-500/30',
    dot: 'bg-gray-500',
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
    dotColor: 'bg-emerald-500',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
  },
  stale: {
    label: 'Stale',
    dotColor: 'bg-amber-500',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
  },
  error: {
    label: 'Error',
    dotColor: 'bg-rose-500',
    bgColor: 'bg-rose-100',
    textColor: 'text-rose-700',
  },
  pending: {
    label: 'Pending',
    dotColor: 'bg-blue-500',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-700',
  },
  settled: {
    label: 'Settled',
    dotColor: 'bg-emerald-500',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
  },
  disputed: {
    label: 'Disputed',
    dotColor: 'bg-orange-500',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-700',
  },
  expired: {
    label: 'Expired',
    dotColor: 'bg-gray-400',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
  },
  inactive: {
    label: 'Inactive',
    dotColor: 'bg-gray-400',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
  },
  resolved: {
    label: 'Resolved',
    dotColor: 'bg-emerald-500',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
  },
  unknown: {
    label: 'Unknown',
    dotColor: 'bg-gray-400',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
  },
  online: {
    label: 'Online',
    dotColor: 'bg-emerald-500',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
  },
  offline: {
    label: 'Offline',
    dotColor: 'bg-gray-400',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-700',
  },
  warning: {
    label: 'Warning',
    dotColor: 'bg-amber-500',
    bgColor: 'bg-amber-100',
    textColor: 'text-amber-700',
  },
  success: {
    label: 'Success',
    dotColor: 'bg-emerald-500',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
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
    primary: 'emerald',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600',
    border: 'border-emerald-500/30',
  },
  medium: {
    primary: 'amber',
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    border: 'border-amber-500/30',
  },
  high: {
    primary: 'orange',
    bg: 'bg-orange-500/10',
    text: 'text-orange-600',
    border: 'border-orange-500/30',
  },
  critical: {
    primary: 'red',
    bg: 'bg-red-500/10',
    text: 'text-red-600',
    border: 'border-red-500/30',
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
    primary: 'blue',
    bg: 'bg-blue-500/10',
    text: 'text-blue-600',
    border: 'border-blue-500/30',
  },
  warning: {
    primary: 'amber',
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    border: 'border-amber-500/30',
  },
  critical: {
    primary: 'red',
    bg: 'bg-red-500/10',
    text: 'text-red-600',
    border: 'border-red-500/30',
  },
  emergency: {
    primary: 'rose',
    bg: 'bg-rose-500/10',
    text: 'text-rose-600',
    border: 'border-rose-500/30',
  },
} as const;

// ============================================================================
// 类型guards
// ============================================================================

export function getHealthStatus(status: string): HealthStatus {
  return STATUS_MAPPINGS[status] || 'unknown';
}

export function isHealthy(status: HealthStatus): boolean {
  return status === 'healthy';
}

export function isDegraded(status: HealthStatus): boolean {
  return status === 'degraded';
}

export function isUnhealthy(status: HealthStatus): boolean {
  return status === 'unhealthy';
}

export function isRiskAcceptable(level: RiskLevel, threshold: RiskLevel): boolean {
  const levels: RiskLevel[] = ['low', 'medium', 'high', 'critical'];
  return levels.indexOf(level) <= levels.indexOf(threshold);
}
