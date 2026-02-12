/**
 * Color Constants - 共享颜色配置
 *
 * 统一的颜色定义，用于组件、图表、状态指示等
 */

// ============================================================================
// 主题颜色
// ============================================================================

export const themeColors = {
  blue: {
    50: 'bg-blue-50',
    100: 'bg-blue-100',
    200: 'bg-blue-200',
    500: 'bg-blue-500',
    600: 'text-blue-600',
    700: 'text-blue-700',
    border: 'border-blue-100',
    border200: 'border-blue-200',
    gradient: 'from-blue-500/10 to-transparent',
    stroke: 'stroke-blue-500',
  },
  green: {
    50: 'bg-green-50',
    100: 'bg-green-100',
    200: 'bg-green-200',
    500: 'bg-green-500',
    600: 'text-green-600',
    700: 'text-green-700',
    border: 'border-green-100',
    border200: 'border-green-200',
    gradient: 'from-green-500/10 to-transparent',
    stroke: 'stroke-green-500',
  },
  emerald: {
    50: 'bg-emerald-50',
    100: 'bg-emerald-100',
    200: 'bg-emerald-200',
    500: 'bg-emerald-500',
    600: 'text-emerald-600',
    700: 'text-emerald-700',
    border: 'border-emerald-100',
    border200: 'border-emerald-200',
    gradient: 'from-emerald-500/10 to-transparent',
    stroke: 'stroke-emerald-500',
  },
  red: {
    50: 'bg-red-50',
    100: 'bg-red-100',
    200: 'bg-red-200',
    500: 'bg-red-500',
    600: 'text-red-600',
    700: 'text-red-700',
    border: 'border-red-100',
    border200: 'border-red-200',
    gradient: 'from-red-500/10 to-transparent',
    stroke: 'stroke-red-500',
  },
  rose: {
    50: 'bg-rose-50',
    100: 'bg-rose-100',
    200: 'bg-rose-200',
    500: 'bg-rose-500',
    600: 'text-rose-600',
    700: 'text-rose-700',
    border: 'border-rose-100',
    border200: 'border-rose-200',
    gradient: 'from-rose-500/10 to-transparent',
    stroke: 'stroke-rose-500',
  },
  purple: {
    50: 'bg-purple-50',
    100: 'bg-purple-100',
    200: 'bg-purple-200',
    500: 'bg-purple-500',
    600: 'text-purple-600',
    700: 'text-purple-700',
    border: 'border-purple-100',
    border200: 'border-purple-200',
    gradient: 'from-purple-500/10 to-transparent',
    stroke: 'stroke-purple-500',
  },
  orange: {
    50: 'bg-orange-50',
    100: 'bg-orange-100',
    200: 'bg-orange-200',
    500: 'bg-orange-500',
    600: 'text-orange-600',
    700: 'text-orange-700',
    border: 'border-orange-100',
    border200: 'border-orange-200',
    gradient: 'from-orange-500/10 to-transparent',
    stroke: 'stroke-orange-500',
  },
  amber: {
    50: 'bg-amber-50',
    100: 'bg-amber-100',
    200: 'bg-amber-200',
    500: 'bg-amber-500',
    600: 'text-amber-600',
    700: 'text-amber-700',
    border: 'border-amber-100',
    border200: 'border-amber-200',
    gradient: 'from-amber-500/10 to-transparent',
    stroke: 'stroke-amber-500',
  },
  cyan: {
    50: 'bg-cyan-50',
    100: 'bg-cyan-100',
    200: 'bg-cyan-200',
    500: 'bg-cyan-500',
    600: 'text-cyan-600',
    700: 'text-cyan-700',
    border: 'border-cyan-100',
    border200: 'border-cyan-200',
    gradient: 'from-cyan-500/10 to-transparent',
    stroke: 'stroke-cyan-500',
  },
  pink: {
    50: 'bg-pink-50',
    100: 'bg-pink-100',
    200: 'bg-pink-200',
    500: 'bg-pink-500',
    600: 'text-pink-600',
    700: 'text-pink-700',
    border: 'border-pink-100',
    border200: 'border-pink-200',
    gradient: 'from-pink-500/10 to-transparent',
    stroke: 'stroke-pink-500',
  },
  gray: {
    50: 'bg-gray-50',
    100: 'bg-gray-100',
    200: 'bg-gray-200',
    400: 'bg-gray-400',
    500: 'bg-gray-500',
    600: 'text-gray-600',
    700: 'text-gray-700',
    border: 'border-gray-100',
    border200: 'border-gray-200',
  },
} as const;

export type ThemeColor = keyof typeof themeColors;

// ============================================================================
// StatCard 颜色配置
// ============================================================================

export const statCardColors: Record<
  ThemeColor,
  {
    bg: string;
    text: string;
    border: string;
    gradient: string;
    iconBg: string;
  }
> = {
  blue: {
    bg: themeColors.blue[50],
    text: themeColors.blue[600],
    border: themeColors.blue.border,
    gradient: themeColors.blue.gradient,
    iconBg: themeColors.blue[100],
  },
  green: {
    bg: themeColors.green[50],
    text: themeColors.green[600],
    border: themeColors.green.border,
    gradient: themeColors.green.gradient,
    iconBg: themeColors.green[100],
  },
  emerald: {
    bg: themeColors.emerald[50],
    text: themeColors.emerald[600],
    border: themeColors.emerald.border,
    gradient: themeColors.emerald.gradient,
    iconBg: themeColors.emerald[100],
  },
  red: {
    bg: themeColors.red[50],
    text: themeColors.red[600],
    border: themeColors.red.border,
    gradient: themeColors.red.gradient,
    iconBg: themeColors.red[100],
  },
  rose: {
    bg: themeColors.rose[50],
    text: themeColors.rose[600],
    border: themeColors.rose.border,
    gradient: themeColors.rose.gradient,
    iconBg: themeColors.rose[100],
  },
  purple: {
    bg: themeColors.purple[50],
    text: themeColors.purple[600],
    border: themeColors.purple.border,
    gradient: themeColors.purple.gradient,
    iconBg: themeColors.purple[100],
  },
  orange: {
    bg: themeColors.orange[50],
    text: themeColors.orange[600],
    border: themeColors.orange.border,
    gradient: themeColors.orange.gradient,
    iconBg: themeColors.orange[100],
  },
  amber: {
    bg: themeColors.amber[50],
    text: themeColors.amber[600],
    border: themeColors.amber.border,
    gradient: themeColors.amber.gradient,
    iconBg: themeColors.amber[100],
  },
  cyan: {
    bg: themeColors.cyan[50],
    text: themeColors.cyan[600],
    border: themeColors.cyan.border,
    gradient: themeColors.cyan.gradient,
    iconBg: themeColors.cyan[100],
  },
  pink: {
    bg: themeColors.pink[50],
    text: themeColors.pink[600],
    border: themeColors.pink.border,
    gradient: themeColors.pink.gradient,
    iconBg: themeColors.pink[100],
  },
  gray: {
    bg: themeColors.gray[50],
    text: themeColors.gray[600],
    border: themeColors.gray.border,
    gradient: 'from-gray-500/10 to-transparent',
    iconBg: themeColors.gray[100],
  },
};

// ============================================================================
// 状态颜色配置
// ============================================================================

export type StatusType =
  | 'healthy'
  | 'active'
  | 'success'
  | 'online'
  | 'degraded'
  | 'warning'
  | 'stale'
  | 'error'
  | 'offline'
  | 'inactive'
  | 'down'
  | 'critical';

export interface StatusColorConfig {
  dot: string;
  bg: string;
  text: string;
  border: string;
  /** ARIA label 国际化 key */
  ariaLabelKey: string;
}

/**
 * 统一的状态颜色配置
 * 用于所有组件、图表、状态指示等
 *
 * 语义映射：
 * - healthy/active/success/online: 健康/正常状态 (emerald-绿色)
 * - degraded/warning: 降级/警告状态 (amber-琥珀色)
 * - stale: 陈旧状态 (orange-橙色)
 * - error/offline/down: 错误/离线状态 (rose-玫瑰红)
 * - inactive: 非活跃状态 (gray-灰色)
 * - critical: 严重状态 (red-红色)
 */
export const statusColors: Record<StatusType, StatusColorConfig> = {
  healthy: {
    dot: themeColors.emerald[500],
    bg: themeColors.emerald[100],
    text: themeColors.emerald[700],
    border: themeColors.emerald.border,
    ariaLabelKey: 'status.healthy',
  },
  active: {
    dot: themeColors.emerald[500],
    bg: themeColors.emerald[100],
    text: themeColors.emerald[700],
    border: themeColors.emerald.border,
    ariaLabelKey: 'status.active',
  },
  success: {
    dot: themeColors.emerald[500],
    bg: themeColors.emerald[100],
    text: themeColors.emerald[700],
    border: themeColors.emerald.border,
    ariaLabelKey: 'status.success',
  },
  online: {
    dot: themeColors.emerald[500],
    bg: themeColors.emerald[100],
    text: themeColors.emerald[700],
    border: themeColors.emerald.border,
    ariaLabelKey: 'status.online',
  },
  degraded: {
    dot: themeColors.amber[500],
    bg: themeColors.amber[100],
    text: themeColors.amber[700],
    border: themeColors.amber.border,
    ariaLabelKey: 'status.degraded',
  },
  warning: {
    dot: themeColors.amber[500],
    bg: themeColors.amber[100],
    text: themeColors.amber[700],
    border: themeColors.amber.border,
    ariaLabelKey: 'status.warning',
  },
  stale: {
    dot: themeColors.orange[500],
    bg: themeColors.orange[100],
    text: themeColors.orange[700],
    border: themeColors.orange.border,
    ariaLabelKey: 'status.stale',
  },
  error: {
    dot: themeColors.rose[500],
    bg: themeColors.rose[100],
    text: themeColors.rose[700],
    border: themeColors.rose.border,
    ariaLabelKey: 'status.error',
  },
  offline: {
    dot: themeColors.gray[400],
    bg: themeColors.gray[100],
    text: themeColors.gray[700],
    border: themeColors.gray.border,
    ariaLabelKey: 'status.offline',
  },
  inactive: {
    dot: themeColors.gray[400],
    bg: themeColors.gray[100],
    text: themeColors.gray[700],
    border: themeColors.gray.border,
    ariaLabelKey: 'status.inactive',
  },
  down: {
    dot: themeColors.rose[500],
    bg: themeColors.rose[100],
    text: themeColors.rose[700],
    border: themeColors.rose.border,
    ariaLabelKey: 'status.down',
  },
  critical: {
    dot: themeColors.red[500],
    bg: themeColors.red[100],
    text: themeColors.red[700],
    border: themeColors.red.border,
    ariaLabelKey: 'status.critical',
  },
};

// ============================================================================
// 图表颜色配置
// ============================================================================

export const chartColors = {
  primary: ['#3b82f6', 'rgb(var(--color-primary))', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'],
  secondary: ['#60a5fa', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#22d3ee'],
  gradients: [
    ['#3b82f6', '#60a5fa'],
    ['rgb(var(--color-primary))', '#a78bfa'],
    ['#10b981', '#34d399'],
    ['#f59e0b', '#fbbf24'],
    ['#ef4444', '#f87171'],
    ['#06b6d4', '#22d3ee'],
  ],
} as const;

// ============================================================================
// 趋势颜色配置
// ============================================================================

export const trendColors = {
  positive: {
    text: 'text-emerald-600',
    bg: 'bg-emerald-100',
    icon: 'text-emerald-600',
  },
  negative: {
    text: 'text-rose-600',
    bg: 'bg-rose-100',
    icon: 'text-rose-600',
  },
  neutral: {
    text: 'text-gray-600',
    bg: 'bg-gray-100',
    icon: 'text-gray-600',
  },
} as const;

// ============================================================================
// 优先级颜色配置
// ============================================================================

export const priorityColors = {
  high: {
    bg: themeColors.rose[100],
    text: themeColors.rose[700],
    border: themeColors.rose.border,
  },
  medium: {
    bg: themeColors.amber[100],
    text: themeColors.amber[700],
    border: themeColors.amber.border,
  },
  low: {
    bg: themeColors.blue[100],
    text: themeColors.blue[700],
    border: themeColors.blue.border,
  },
} as const;

export type PriorityLevel = keyof typeof priorityColors;
