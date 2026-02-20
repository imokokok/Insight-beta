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
    bg: 'bg-primary/10',
    text: 'text-primary-dark',
    border: 'border-primary/20',
    gradient: 'from-primary/10 to-transparent',
    hover: 'hover:bg-primary/20',
    icon: 'text-primary',
    iconBg: 'bg-primary/20',
    primary: 'primary',
  },
  green: {
    bg: 'bg-success/10',
    text: 'text-success-dark',
    border: 'border-success/20',
    gradient: 'from-success/10 to-transparent',
    hover: 'hover:bg-success/20',
    icon: 'text-success',
    iconBg: 'bg-success/20',
    primary: 'success',
  },
  amber: {
    bg: 'bg-warning/10',
    text: 'text-warning-dark',
    border: 'border-warning/20',
    gradient: 'from-warning/10 to-transparent',
    hover: 'hover:bg-warning/20',
    icon: 'text-warning',
    iconBg: 'bg-warning/20',
    primary: 'warning',
  },
  purple: {
    bg: 'bg-primary/10',
    text: 'text-primary-dark',
    border: 'border-primary/20',
    gradient: 'from-primary/10 to-transparent',
    hover: 'hover:bg-primary/20',
    icon: 'text-primary',
    iconBg: 'bg-primary/20',
    primary: 'primary',
  },
  red: {
    bg: 'bg-error/10',
    text: 'text-error-dark',
    border: 'border-error/20',
    gradient: 'from-error/10 to-transparent',
    hover: 'hover:bg-error/20',
    icon: 'text-error',
    iconBg: 'bg-error/20',
    primary: 'error',
  },
  cyan: {
    bg: 'bg-accent/10',
    text: 'text-accent-dark',
    border: 'border-accent/20',
    gradient: 'from-accent/10 to-transparent',
    hover: 'hover:bg-accent/20',
    icon: 'text-accent',
    iconBg: 'bg-accent/20',
    primary: 'accent',
  },
  pink: {
    bg: 'bg-accent/10',
    text: 'text-accent-dark',
    border: 'border-accent/20',
    gradient: 'from-accent/10 to-transparent',
    hover: 'hover:bg-accent/20',
    icon: 'text-accent',
    iconBg: 'bg-accent/20',
    primary: 'accent',
  },
} as const;

// ============================================================================
// 工厂函数 - 用于生成重复的颜色配置
// ============================================================================

type LevelColorTheme = 'success' | 'warning' | 'error' | 'primary' | 'muted';

interface LevelColorConfig {
  primary: LevelColorTheme;
  bg: string;
  text: string;
  border: string;
  dot: string;
  label: string;
}

const LEVEL_THEMES: Record<LevelColorTheme, Omit<LevelColorConfig, 'primary' | 'label'>> = {
  success: {
    bg: 'bg-success/10',
    text: 'text-success-dark',
    border: 'border-success/30',
    dot: 'bg-success',
  },
  warning: {
    bg: 'bg-warning/10',
    text: 'text-warning-dark',
    border: 'border-warning/30',
    dot: 'bg-warning',
  },
  error: {
    bg: 'bg-error/10',
    text: 'text-error-dark',
    border: 'border-error/30',
    dot: 'bg-error',
  },
  primary: {
    bg: 'bg-primary/10',
    text: 'text-primary-dark',
    border: 'border-primary/30',
    dot: 'bg-primary',
  },
  muted: {
    bg: 'bg-muted/30',
    text: 'text-muted-foreground',
    border: 'border-muted',
    dot: 'bg-muted-foreground',
  },
};

function createLevelColorConfig<T extends string>(
  configs: Record<T, { theme: LevelColorTheme; label: string }>,
): Record<T, LevelColorConfig> {
  const result = {} as Record<T, LevelColorConfig>;
  for (const key in configs) {
    const { theme, label } = configs[key];
    result[key] = {
      primary: theme,
      ...LEVEL_THEMES[theme],
      label,
    };
  }
  return result;
}

// ============================================================================
// 状态颜色映射
// ============================================================================

type StatusKey =
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

const STATUS_CONFIGS: Record<
  StatusKey,
  { theme: LevelColorTheme; label: string; component: ComponentColor }
> = {
  active: { theme: 'success', label: 'Active', component: 'green' },
  stale: { theme: 'warning', label: 'Stale', component: 'amber' },
  error: { theme: 'error', label: 'Error', component: 'red' },
  pending: { theme: 'primary', label: 'Pending', component: 'blue' },
  settled: { theme: 'primary', label: 'Settled', component: 'purple' },
  disputed: { theme: 'warning', label: 'Disputed', component: 'amber' },
  expired: { theme: 'muted', label: 'Expired', component: 'blue' },
  inactive: { theme: 'muted', label: 'Inactive', component: 'blue' },
  resolved: { theme: 'success', label: 'Resolved', component: 'green' },
  unknown: { theme: 'muted', label: 'Unknown', component: 'blue' },
  online: { theme: 'success', label: 'Online', component: 'green' },
  offline: { theme: 'error', label: 'Offline', component: 'red' },
  warning: { theme: 'warning', label: 'Warning', component: 'amber' },
  success: { theme: 'success', label: 'Success', component: 'green' },
};

interface StatusColorValue {
  bg: string;
  text: string;
  border: string;
  dot: string;
  label: string;
  component: ComponentColor;
}

const STATUS_COLORS_INTERNAL: Record<StatusKey, StatusColorValue> = (() => {
  const result = {} as Record<StatusKey, StatusColorValue>;
  for (const key in STATUS_CONFIGS) {
    const { theme, label, component } = STATUS_CONFIGS[key as StatusKey];
    result[key as StatusKey] = {
      ...LEVEL_THEMES[theme],
      label,
      component,
    };
  }
  return result;
})();

export type StatusColor = StatusKey;

export const STATUS_COLORS: Record<StatusKey, StatusColorValue> = STATUS_COLORS_INTERNAL;

// ============================================================================
// 协议颜色
// ============================================================================

export type ProtocolColor = keyof typeof PROTOCOL_COLORS;

export const PROTOCOL_COLORS = {
  chainlink: '#375bd2',
  pyth: '#e6c35c',
  redstone: '#ff6b6b',
  uma: '#ff4d4d',
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
  secondary: ['rgb(var(--color-primary))', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'] as const,
  success: ['#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#dcfce7'] as const,
  warning: ['#f59e0b', '#fbbf24', '#fcd34d', '#fde68a', '#fef3c7'] as const,
  error: ['#ef4444', '#f87171', '#fca5a5', '#fecaca', '#fee2e2'] as const,
  gradient: {
    blue: ['#3b82f6', '#06b6d4'] as [string, string],
    purple: ['rgb(var(--color-primary))', '#d946ef'] as [string, string],
    green: ['#22c55e', '#14b8a6'] as [string, string],
    amber: ['#f59e0b', '#f97316'] as [string, string],
  },
  categorical: [
    '#3b82f6',
    'rgb(var(--color-primary))',
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
// 监控状态颜色 - 用于数据分析平台
// ============================================================================

export type MonitorStatus = 'operational' | 'degraded' | 'down' | 'maintenance' | 'investigating';

export const MONITOR_STATUS_COLORS = {
  operational: {
    bg: 'bg-success/10',
    border: 'border-success/20',
    text: 'text-success-dark',
    dot: 'bg-success',
    label: 'Operational',
    description: 'All systems operational',
  },
  degraded: {
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    text: 'text-warning-dark',
    dot: 'bg-warning',
    label: 'Degraded',
    description: 'Some services experiencing issues',
  },
  down: {
    bg: 'bg-error/10',
    border: 'border-error/20',
    text: 'text-error-dark',
    dot: 'bg-error',
    label: 'Down',
    description: 'Service disruption detected',
  },
  maintenance: {
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    text: 'text-primary-dark',
    dot: 'bg-primary',
    label: 'Maintenance',
    description: 'Scheduled maintenance in progress',
  },
  investigating: {
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    text: 'text-primary-dark',
    dot: 'bg-primary',
    label: 'Investigating',
    description: 'Investigating potential issues',
  },
} as const;

// ============================================================================
// 严重级别颜色配置
// ============================================================================

export type SeverityColor = keyof typeof SEVERITY_COLORS;

export const SEVERITY_COLORS: Record<string, LevelColorConfig> = createLevelColorConfig({
  low: { theme: 'success', label: 'Low' },
  medium: { theme: 'warning', label: 'Medium' },
  high: { theme: 'warning', label: 'High' },
  critical: { theme: 'error', label: 'Critical' },
  info: { theme: 'primary', label: 'Info' },
  warning: { theme: 'warning', label: 'Warning' },
  emergency: { theme: 'error', label: 'Emergency' },
});

// ============================================================================
// 风险等级颜色配置
// ============================================================================

export type RiskColor = keyof typeof RISK_COLORS;

export const RISK_COLORS: Record<string, LevelColorConfig> = createLevelColorConfig({
  low: { theme: 'success', label: 'Low Risk' },
  medium: { theme: 'warning', label: 'Medium Risk' },
  high: { theme: 'warning', label: 'High Risk' },
  critical: { theme: 'error', label: 'Critical Risk' },
});

// ============================================================================
// Badge 状态颜色配置（用于 StatusBadge 组件）
// ============================================================================

interface StatusThemeColorValue {
  label: string;
  dotColor: string;
  bgColor: string;
  textColor: string;
}

const STATUS_THEME_COLORS_INTERNAL: Record<StatusKey, StatusThemeColorValue> = (() => {
  const result = {} as Record<StatusKey, StatusThemeColorValue>;
  for (const key in STATUS_CONFIGS) {
    const { theme, label } = STATUS_CONFIGS[key as StatusKey];
    const themeConfig = LEVEL_THEMES[theme];
    result[key as StatusKey] = {
      label,
      dotColor: themeConfig.dot,
      bgColor: themeConfig.bg.replace('/10', '/20'),
      textColor: themeConfig.text,
    };
  }
  return result;
})();

export type StatusThemeColor = StatusKey;

export const STATUS_THEME_COLORS: Record<StatusKey, StatusThemeColorValue> =
  STATUS_THEME_COLORS_INTERNAL;

// ============================================================================
// 健康状态颜色配置
// ============================================================================

export type HealthColor = keyof typeof HEALTH_COLORS;

export const HEALTH_COLORS: Record<string, LevelColorConfig> = createLevelColorConfig({
  healthy: { theme: 'success', label: 'Healthy' },
  degraded: { theme: 'warning', label: 'Degraded' },
  unhealthy: { theme: 'error', label: 'Unhealthy' },
  unknown: { theme: 'muted', label: 'Unknown' },
});

// ============================================================================
// 工具函数
// ============================================================================

export function getStatusColor(status: string): (typeof STATUS_COLORS)[StatusColor] {
  const key = status.toLowerCase() as StatusColor;
  return STATUS_COLORS[key] || STATUS_COLORS.unknown;
}

const DEFAULT_LEVEL_COLOR: LevelColorConfig = {
  primary: 'muted',
  bg: 'bg-muted/30',
  text: 'text-muted-foreground',
  border: 'border-muted',
  dot: 'bg-muted-foreground',
  label: 'Unknown',
};

export function getSeverityColor(severity: string): LevelColorConfig {
  const key = severity.toLowerCase();
  return (SEVERITY_COLORS as Record<string, LevelColorConfig>)[key] ?? DEFAULT_LEVEL_COLOR;
}

export function getRiskColor(risk: string): LevelColorConfig {
  const key = risk.toLowerCase();
  return (RISK_COLORS as Record<string, LevelColorConfig>)[key] ?? DEFAULT_LEVEL_COLOR;
}

export function getHealthColor(health: string): LevelColorConfig {
  const key = health.toLowerCase();
  return (HEALTH_COLORS as Record<string, LevelColorConfig>)[key] ?? DEFAULT_LEVEL_COLOR;
}

export function getProtocolColor(protocol: string): string {
  const key = protocol.toLowerCase() as ProtocolColor;
  return PROTOCOL_COLORS[key] || PROTOCOL_COLORS.default;
}

export function getChainColor(chain: string): string {
  const key = chain.toLowerCase() as ChainColor;
  return CHAIN_COLORS[key] || CHAIN_COLORS.default;
}

export function getMonitorStatusColor(
  status: string,
): (typeof MONITOR_STATUS_COLORS)[MonitorStatus] {
  const key = status.toLowerCase() as MonitorStatus;
  return MONITOR_STATUS_COLORS[key] || MONITOR_STATUS_COLORS.investigating;
}
