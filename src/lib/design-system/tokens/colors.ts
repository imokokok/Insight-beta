/**
 * Design System - Color Tokens
 *
 * 统一的颜色令牌定义，确保整个应用的视觉一致性
 * 
 * 核心原则：
 * - 统一使用 amber 替代 orange（避免颜色不一致）
 * - 使用语义化颜色名称
 * - 提供完整的颜色阶梯（50-900）
 * - 类型安全的颜色定义
 */

// ============================================================================
// 语义化颜色
// ============================================================================

export type SemanticColor = 'success' | 'warning' | 'error' | 'info';

export const SEMANTIC_COLORS = {
  success: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
  },
  warning: {
    50: '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    300: '#fcd34d',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
    700: '#b45309',
    800: '#92400e',
    900: '#78350f',
  },
  error: {
    50: '#fef2f2',
    100: '#fee2e2',
    200: '#fecaca',
    300: '#fca5a5',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
    900: '#7f1d1d',
  },
  info: {
    50: '#eff6ff',
    100: '#dbeafe',
    200: '#bfdbfe',
    300: '#93c5fd',
    400: '#60a5fa',
    500: '#3b82f6',
    600: '#2563eb',
    700: '#1d4ed8',
    800: '#1e40af',
    900: '#1e3a8a',
  },
} as const;

// ============================================================================
// 品牌颜色
// ============================================================================

export type BrandColor = 'primary' | 'secondary';

export const BRAND_COLORS = {
  primary: {
    50: '#f0f9ff',
    100: '#e0f2fe',
    200: '#bae6fd',
    300: '#7dd3fc',
    400: '#38bdf8',
    500: '#0ea5e9',
    600: '#0284c7',
    700: '#0369a1',
    800: '#075985',
    900: '#0c4a6e',
  },
  secondary: {
    50: '#faf5ff',
    100: '#f3e8ff',
    200: '#e9d5ff',
    300: '#d8b4fe',
    400: '#c084fc',
    500: '#a855f7',
    600: '#9333ea',
    700: '#7e22ce',
    800: '#6b21a8',
    900: '#581c87',
  },
} as const;

// ============================================================================
// 中性色
// ============================================================================

export const NEUTRAL_COLORS = {
  50: '#fafafa',
  100: '#f5f5f5',
  200: '#e5e5e5',
  300: '#d4d4d4',
  400: '#a3a3a3',
  500: '#737373',
  600: '#525252',
  700: '#404040',
  800: '#262626',
  900: '#171717',
} as const;

// ============================================================================
// 组件颜色 - 用于 UI 组件
// ============================================================================

export type ComponentColor = 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'cyan' | 'pink';

export const COMPONENT_COLORS = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-100',
    gradient: 'from-blue-500/10 to-transparent',
    hover: 'hover:bg-blue-100',
    icon: 'text-blue-500',
    iconBg: 'bg-blue-100',
    primary: 'blue',
  },
  green: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-100',
    gradient: 'from-emerald-500/10 to-transparent',
    hover: 'hover:bg-emerald-100',
    icon: 'text-emerald-500',
    iconBg: 'bg-emerald-100',
    primary: 'emerald',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-100',
    gradient: 'from-amber-500/10 to-transparent',
    hover: 'hover:bg-amber-100',
    icon: 'text-amber-500',
    iconBg: 'bg-amber-100',
    primary: 'amber',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-100',
    gradient: 'from-purple-500/10 to-transparent',
    hover: 'hover:bg-purple-100',
    icon: 'text-purple-500',
    iconBg: 'bg-purple-100',
    primary: 'purple',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-100',
    gradient: 'from-red-500/10 to-transparent',
    hover: 'hover:bg-red-100',
    icon: 'text-red-500',
    iconBg: 'bg-red-100',
    primary: 'red',
  },
  cyan: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-600',
    border: 'border-cyan-100',
    gradient: 'from-cyan-500/10 to-transparent',
    hover: 'hover:bg-cyan-100',
    icon: 'text-cyan-500',
    iconBg: 'bg-cyan-100',
    primary: 'cyan',
  },
  pink: {
    bg: 'bg-pink-50',
    text: 'text-pink-600',
    border: 'border-pink-100',
    gradient: 'from-pink-500/10 to-transparent',
    hover: 'hover:bg-pink-100',
    icon: 'text-pink-500',
    iconBg: 'bg-pink-100',
    primary: 'pink',
  },
} as const;

// ============================================================================
// 状态颜色映射
// ============================================================================

export type StatusColor = keyof typeof STATUS_COLORS;

export const STATUS_COLORS = {
  active: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    label: 'Active',
    component: 'green' as ComponentColor,
  },
  stale: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
    label: 'Stale',
    component: 'amber' as ComponentColor,
  },
  error: {
    bg: 'bg-red-500/10',
    text: 'text-red-600',
    border: 'border-red-500/30',
    dot: 'bg-red-500',
    label: 'Error',
    component: 'red' as ComponentColor,
  },
  pending: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
    label: 'Pending',
    component: 'blue' as ComponentColor,
  },
  settled: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600',
    border: 'border-purple-500/30',
    dot: 'bg-purple-500',
    label: 'Settled',
    component: 'purple' as ComponentColor,
  },
  disputed: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
    label: 'Disputed',
    component: 'amber' as ComponentColor,
  },
  expired: {
    bg: 'bg-gray-500/10',
    text: 'text-gray-600',
    border: 'border-gray-500/30',
    dot: 'bg-gray-500',
    label: 'Expired',
    component: 'blue' as ComponentColor,
  },
  inactive: {
    bg: 'bg-gray-500/10',
    text: 'text-gray-600',
    border: 'border-gray-500/30',
    dot: 'bg-gray-500',
    label: 'Inactive',
    component: 'blue' as ComponentColor,
  },
  resolved: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    label: 'Resolved',
    component: 'green' as ComponentColor,
  },
  unknown: {
    bg: 'bg-gray-500/10',
    text: 'text-gray-600',
    border: 'border-gray-500/30',
    dot: 'bg-gray-500',
    label: 'Unknown',
    component: 'blue' as ComponentColor,
  },
  online: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    label: 'Online',
    component: 'green' as ComponentColor,
  },
  offline: {
    bg: 'bg-red-500/10',
    text: 'text-red-600',
    border: 'border-red-500/30',
    dot: 'bg-red-500',
    label: 'Offline',
    component: 'red' as ComponentColor,
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
    label: 'Warning',
    component: 'amber' as ComponentColor,
  },
  success: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    label: 'Success',
    component: 'green' as ComponentColor,
  },
} as const;

// ============================================================================
// 协议颜色
// ============================================================================

export type ProtocolColor = keyof typeof PROTOCOL_COLORS;

export const PROTOCOL_COLORS = {
  chainlink: '#375bd2',
  pyth: '#e6c35c',
  band: '#00b2a9',
  api3: '#7ce3cb',
  redstone: '#ff6b6b',
  uma: '#ff4d4d',
  dia: '#9c27b0',
  flux: '#00bcd4',
  switchboard: '#ff9800',
  tellor: '#3f51b5',
  nest: '#8bc34a',
  uncl: '#607d8b',
  default: '#888888',
} as const;

// ============================================================================
// 图表颜色
// ============================================================================

export const CHART_COLORS = {
  primary: ['#3b82f6', '#60a5fa', '#93c5fd', '#bfdbfe', '#dbeafe'] as const,
  secondary: ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'] as const,
  success: ['#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#dcfce7'] as const,
  warning: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7'] as const,
  error: ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'] as const,
  gradient: {
    blue: ['#3b82f6', '#06b6d4'] as [string, string],
    purple: ['#8b5cf6', '#d946ef'] as [string, string],
    green: ['#22c55e', '#14b8a6'] as [string, string],
    amber: ['#f59e0b', '#f97316'] as [string, string],
  },
  categorical: [
    '#3b82f6',
    '#8b5cf6',
    '#22c55e',
    '#f59e0b',
    '#ef4444',
    '#06b6d4',
    '#ec4899',
    '#f97316',
    '#14b8a6',
    '#6366f1',
  ],
} as const;

// ============================================================================
// 链品牌色
// ============================================================================

export type ChainColor = keyof typeof CHAIN_COLORS;

export const CHAIN_COLORS = {
  ethereum: '#627eea',
  bsc: '#f0b90b',
  polygon: '#8247e5',
  avalanche: '#e84142',
  arbitrum: '#28a0f0',
  optimism: '#ff0420',
  base: '#0052ff',
  solana: '#9945ff',
  fantom: '#1969ff',
  cronos: '#002d72',
  default: '#888888',
} as const;

// ============================================================================
// 监控状态颜色 - 用于监控平台
// ============================================================================

export type MonitorStatus = 'operational' | 'degraded' | 'down' | 'maintenance' | 'investigating';

export const MONITOR_STATUS_COLORS = {
  operational: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    dot: 'bg-emerald-500',
    label: 'Operational',
    description: 'All systems operational',
  },
  degraded: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    dot: 'bg-amber-500',
    label: 'Degraded',
    description: 'Some services experiencing issues',
  },
  down: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    dot: 'bg-rose-500',
    label: 'Down',
    description: 'Service disruption detected',
  },
  maintenance: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-700',
    dot: 'bg-blue-500',
    label: 'Maintenance',
    description: 'Scheduled maintenance in progress',
  },
  investigating: {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-700',
    dot: 'bg-purple-500',
    label: 'Investigating',
    description: 'Investigating potential issues',
  },
} as const;

// ============================================================================
// 工具函数
// ============================================================================

export function getStatusColor(status: string): typeof STATUS_COLORS[StatusColor] {
  const key = status.toLowerCase() as StatusColor;
  return STATUS_COLORS[key] || STATUS_COLORS.unknown;
}

export function getProtocolColor(protocol: string): string {
  const key = protocol.toLowerCase() as ProtocolColor;
  return PROTOCOL_COLORS[key] || PROTOCOL_COLORS.default;
}

export function getChainColor(chain: string): string {
  const key = chain.toLowerCase() as ChainColor;
  return CHAIN_COLORS[key] || CHAIN_COLORS.default;
}

export function getMonitorStatusColor(status: string): typeof MONITOR_STATUS_COLORS[MonitorStatus] {
  const key = status.toLowerCase() as MonitorStatus;
  return MONITOR_STATUS_COLORS[key] || MONITOR_STATUS_COLORS.investigating;
}


