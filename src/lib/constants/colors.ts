export type ThemeColor = string;

export type StatusType = 'active' | 'inactive' | 'pending' | 'error';

export type PriorityLevel = 'low' | 'medium' | 'high' | 'critical';

export {
  STATUS_COLORS,
  STATUS_THEME_COLORS,
  RISK_COLORS,
  SEVERITY_COLORS,
} from '../../types/common/status';
export type {
  EntityStatus,
  HealthStatus,
  SeverityLevel,
  AlertStatus,
  SyncStatus,
  RiskLevel,
  DisputeStatus,
  AssertionStatus,
  VotingStatus,
} from '../../types/common/status';

export const themeColors = {
  primary: '#3b82f6',
  secondary: '#64748b',
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
} as const;

export const statCardColors = {
  positive: '#22c55e',
  negative: '#ef4444',
  neutral: '#64748b',
} as const;

export const statusColors = {
  active: {
    dot: 'bg-emerald-500',
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600',
  },
  inactive: {
    dot: 'bg-gray-400',
    bg: 'bg-gray-500/10',
    text: 'text-gray-600',
  },
  pending: {
    dot: 'bg-blue-500',
    bg: 'bg-blue-500/10',
    text: 'text-blue-600',
  },
  error: {
    dot: 'bg-red-500',
    bg: 'bg-red-500/10',
    text: 'text-red-600',
  },
  healthy: {
    dot: 'bg-emerald-500',
    ariaLabelKey: 'status.healthy',
  },
  degraded: {
    dot: 'bg-amber-500',
    ariaLabelKey: 'status.degraded',
  },
  stale: {
    dot: 'bg-amber-500',
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    ariaLabelKey: 'status.stale',
  },
  warning: {
    dot: 'bg-amber-500',
  },
  critical: {
    dot: 'bg-red-500',
  },
} as const;

export const trendColors = {
  up: '#22c55e',
  down: '#ef4444',
  stable: '#64748b',
} as const;

export const priorityColors = {
  low: '#64748b',
  medium: '#f59e0b',
  high: '#f97316',
  critical: '#ef4444',
} as const;
