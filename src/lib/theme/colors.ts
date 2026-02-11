/**
 * Theme Colors - 统一颜色配置
 *
 * 集中管理所有颜色相关的配置，避免重复
 */

// ============================================================================
// 协议颜色
// ============================================================================

export type ProtocolColor = typeof PROTOCOL_COLORS[keyof typeof PROTOCOL_COLORS];

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
// 基础颜色
// ============================================================================

export const BASE_COLORS = {
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
  neutral: {
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
  },
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
    orange: ['#f97316', '#f59e0b'] as [string, string],
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
};

// ============================================================================
// 状态颜色映射
// ============================================================================

export const STATUS_THEME_COLORS = {
  active: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    label: 'Active',
  },
  stale: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
    label: 'Stale',
  },
  error: {
    bg: 'bg-red-500/10',
    text: 'text-red-600',
    border: 'border-red-500/30',
    dot: 'bg-red-500',
    label: 'Error',
  },
  pending: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600',
    border: 'border-blue-500/30',
    dot: 'bg-blue-500',
    label: 'Pending',
  },
  settled: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600',
    border: 'border-purple-500/30',
    dot: 'bg-purple-500',
    label: 'Settled',
  },
  disputed: {
    bg: 'bg-orange-500/10',
    text: 'text-orange-600',
    border: 'border-orange-500/30',
    dot: 'bg-orange-500',
    label: 'Disputed',
  },
  expired: {
    bg: 'bg-gray-500/10',
    text: 'text-gray-600',
    border: 'border-gray-500/30',
    dot: 'bg-gray-500',
    label: 'Expired',
  },
  inactive: {
    bg: 'bg-gray-500/10',
    text: 'text-gray-600',
    border: 'border-gray-500/30',
    dot: 'bg-gray-500',
    label: 'Inactive',
  },
  resolved: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    label: 'Resolved',
  },
  unknown: {
    bg: 'bg-gray-500/10',
    text: 'text-gray-600',
    border: 'border-gray-500/30',
    dot: 'bg-gray-500',
    label: 'Unknown',
  },
  online: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    label: 'Online',
  },
  offline: {
    bg: 'bg-red-500/10',
    text: 'text-red-600',
    border: 'border-red-500/30',
    dot: 'bg-red-500',
    label: 'Offline',
  },
  warning: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600',
    border: 'border-amber-500/30',
    dot: 'bg-amber-500',
    label: 'Warning',
  },
  success: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600',
    border: 'border-emerald-500/30',
    dot: 'bg-emerald-500',
    label: 'Success',
  },
} as const;

// ============================================================================
// Card 颜色配置
// ============================================================================

export const CARD_COLORS = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-100',
    gradient: 'from-blue-500/10 to-transparent',
    hover: 'hover:bg-blue-100',
    icon: 'text-blue-500',
    iconBg: 'bg-blue-100',
  },
  green: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-100',
    gradient: 'from-emerald-500/10 to-transparent',
    hover: 'hover:bg-emerald-100',
    icon: 'text-emerald-500',
    iconBg: 'bg-emerald-100',
  },
  amber: {
    bg: 'bg-amber-50',
    text: 'text-amber-600',
    border: 'border-amber-100',
    gradient: 'from-amber-500/10 to-transparent',
    hover: 'hover:bg-amber-100',
    icon: 'text-amber-500',
    iconBg: 'bg-amber-100',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-100',
    gradient: 'from-purple-500/10 to-transparent',
    hover: 'hover:bg-purple-100',
    icon: 'text-purple-500',
    iconBg: 'bg-purple-100',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-100',
    gradient: 'from-red-500/10 to-transparent',
    hover: 'hover:bg-red-100',
    icon: 'text-red-500',
    iconBg: 'bg-red-100',
  },
  cyan: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-600',
    border: 'border-cyan-100',
    gradient: 'from-cyan-500/10 to-transparent',
    hover: 'hover:bg-cyan-100',
    icon: 'text-cyan-500',
    iconBg: 'bg-cyan-100',
  },
  pink: {
    bg: 'bg-pink-50',
    text: 'text-pink-600',
    border: 'border-pink-100',
    gradient: 'from-pink-500/10 to-transparent',
    hover: 'hover:bg-pink-100',
    icon: 'text-pink-500',
    iconBg: 'bg-pink-100',
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-100',
    gradient: 'from-orange-500/10 to-transparent',
    hover: 'hover:bg-orange-100',
    icon: 'text-orange-500',
    iconBg: 'bg-orange-100',
  },
} as const;

// ============================================================================
// 工具函数
// ============================================================================

export function getProtocolColor(protocol: string): string {
  const key = protocol.toLowerCase() as keyof typeof PROTOCOL_COLORS;
  return PROTOCOL_COLORS[key] || PROTOCOL_COLORS.default;
}

export function getStatusColor(status: string) {
  const key = status.toLowerCase() as keyof typeof STATUS_THEME_COLORS;
  return STATUS_THEME_COLORS[key] || STATUS_THEME_COLORS.unknown;
}

export function getCardColor(color: string) {
  const key = color.toLowerCase() as keyof typeof CARD_COLORS;
  return CARD_COLORS[key] || CARD_COLORS.blue;
}

export function getChartColor(index: number): string {
  return CHART_COLORS.categorical[index % CHART_COLORS.categorical.length];
}

export function getGradientColors(name: keyof typeof CHART_COLORS.gradient): [string, string] {
  const colors = CHART_COLORS.gradient[name];
  return colors as [string, string];
}
