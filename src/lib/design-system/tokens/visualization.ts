/**
 * Data Visualization Design Tokens
 * 
 * 数据可视化设计令牌
 * - 统一图表配色方案
 * - 图表尺寸规范
 * - 动画配置
 */

// ============================================================================
// Color Schemes - 图表配色方案
// ============================================================================

export const CHART_COLORS = {
  // 主色调
  primary: {
    DEFAULT: '#8b5cf6',
    light: '#a78bfa',
    dark: '#7c3aed',
    50: '#f5f3ff',
    100: '#ede9fe',
    200: '#ddd6fe',
    300: '#c4b5fd',
    400: '#a78bfa',
    500: '#8b5cf6',
    600: '#7c3aed',
    700: '#6d28d9',
    800: '#5b21b6',
    900: '#4c1d95',
  },
  
  // 语义化颜色
  semantic: {
    success: {
      DEFAULT: '#22c55e',
      light: '#86efac',
      dark: '#16a34a',
      bg: 'rgba(34, 197, 94, 0.1)',
    },
    warning: {
      DEFAULT: '#f59e0b',
      light: '#fcd34d',
      dark: '#d97706',
      bg: 'rgba(245, 158, 11, 0.1)',
    },
    error: {
      DEFAULT: '#ef4444',
      light: '#fca5a5',
      dark: '#dc2626',
      bg: 'rgba(239, 68, 68, 0.1)',
    },
    info: {
      DEFAULT: '#3b82f6',
      light: '#93c5fd',
      dark: '#2563eb',
      bg: 'rgba(59, 130, 246, 0.1)',
    },
  },
  
  // 多数据系列配色（用于对比图表）
  series: [
    '#8b5cf6', // 紫色
    '#3b82f6', // 蓝色
    '#10b981', // 绿色
    '#f59e0b', // 橙色
    '#ef4444', // 红色
    '#ec4899', // 粉色
    '#06b6d4', // 青色
    '#8b5a2b', // 棕色
    '#6366f1', // 靛蓝
    '#14b8a6', //  teal
  ],
  
  // 渐变配色
  gradients: {
    purple: ['#8b5cf6', '#a78bfa'],
    blue: ['#3b82f6', '#60a5fa'],
    green: ['#22c55e', '#4ade80'],
    orange: ['#f59e0b', '#fbbf24'],
    red: ['#ef4444', '#f87171'],
  },
  
  // 热力图配色
  heatmap: {
    low: '#dcfce7',
    medium: '#86efac',
    high: '#facc15',
    critical: '#fb923c',
    severe: '#ef4444',
  },
  
  // 网格和轴线
  grid: {
    line: '#e5e7eb',
    axis: '#9ca3af',
    text: '#6b7280',
  },
} as const;

// ============================================================================
// Chart Dimensions - 图表尺寸规范
// ============================================================================

export const CHART_DIMENSIONS = {
  // 默认高度
  height: {
    sm: 200,
    md: 300,
    lg: 400,
    xl: 500,
  },
  
  // 响应式高度配置
  responsive: {
    mobile: {
      min: 180,
      default: 220,
      max: 280,
    },
    tablet: {
      min: 240,
      default: 320,
      max: 400,
    },
    desktop: {
      min: 300,
      default: 400,
      max: 600,
    },
  },
  
  // 边距
  margin: {
    sm: { top: 10, right: 10, bottom: 10, left: 10 },
    md: { top: 20, right: 20, bottom: 20, left: 20 },
    lg: { top: 30, right: 30, bottom: 30, left: 30 },
  },
  
  // 坐标轴
  axis: {
    tickSize: 5,
    tickMargin: 10,
    labelOffset: 20,
  },
} as const;

// ============================================================================
// Animation Config - 动画配置
// ============================================================================

export const CHART_ANIMATIONS = {
  // 默认动画时长
  duration: {
    fast: 300,
    normal: 500,
    slow: 800,
  },
  
  // 缓动函数
  easing: {
    default: 'ease-out',
    smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
  
  // 图表动画配置
  chart: {
    isAnimationActive: true,
    animationDuration: 500,
    animationEasing: 'ease-out',
  },
  
  // 数据更新动画
  dataUpdate: {
    duration: 300,
    easing: 'ease-in-out',
  },
} as const;

// ============================================================================
// Typography - 图表文字样式
// ============================================================================

export const CHART_TYPOGRAPHY = {
  // 标题
  title: {
    fontSize: 16,
    fontWeight: 600,
    fill: '#111827',
  },
  
  // 副标题
  subtitle: {
    fontSize: 12,
    fontWeight: 400,
    fill: '#6b7280',
  },
  
  // 坐标轴标签
  axis: {
    fontSize: 11,
    fontWeight: 400,
    fill: '#6b7280',
  },
  
  // 提示框
  tooltip: {
    title: {
      fontSize: 12,
      fontWeight: 600,
      fill: '#111827',
    },
    value: {
      fontSize: 14,
      fontWeight: 700,
      fill: '#111827',
    },
    label: {
      fontSize: 11,
      fontWeight: 400,
      fill: '#6b7280',
    },
  },
  
  // 图例
  legend: {
    fontSize: 12,
    fontWeight: 400,
    fill: '#374151',
  },
} as const;

// ============================================================================
// Thresholds - 阈值配置
// ============================================================================

export const CHART_THRESHOLDS = {
  // 健康度阈值
  health: {
    excellent: 95,
    good: 85,
    fair: 70,
    poor: 50,
  },
  
  // 偏差阈值
  deviation: {
    normal: 0.01,
    warning: 0.02,
    critical: 0.05,
  },
  
  // 延迟阈值 (ms)
  latency: {
    excellent: 500,
    good: 1000,
    fair: 2000,
    poor: 5000,
  },
  
  // 准确率阈值
  accuracy: {
    excellent: 99.9,
    good: 99.5,
    fair: 99.0,
    poor: 98.0,
  },
} as const;

// ============================================================================
// Helpers - 辅助函数
// ============================================================================

/**
 * 根据值获取状态颜色
 */
export function getStatusColor(
  value: number,
  thresholds: { warning: number; critical: number },
  reverse = false
): string {
  if (reverse) {
    if (value <= thresholds.critical) return CHART_COLORS.semantic.error.DEFAULT;
    if (value <= thresholds.warning) return CHART_COLORS.semantic.warning.DEFAULT;
    return CHART_COLORS.semantic.success.DEFAULT;
  }
  
  if (value >= thresholds.critical) return CHART_COLORS.semantic.error.DEFAULT;
  if (value >= thresholds.warning) return CHART_COLORS.semantic.warning.DEFAULT;
  return CHART_COLORS.semantic.success.DEFAULT;
}

/**
 * 根据健康度评分获取颜色
 */
export function getHealthColor(score: number): string {
  if (score >= CHART_THRESHOLDS.health.excellent) return CHART_COLORS.semantic.success.DEFAULT;
  if (score >= CHART_THRESHOLDS.health.good) return CHART_COLORS.semantic.success.light;
  if (score >= CHART_THRESHOLDS.health.fair) return CHART_COLORS.semantic.warning.DEFAULT;
  return CHART_COLORS.semantic.error.DEFAULT;
}

/**
 * 获取数据系列颜色
 */
export function getSeriesColor(index: number): string {
  return CHART_COLORS.series[index % CHART_COLORS.series.length];
}

/**
 * 生成渐变ID
 */
export function generateGradientId(color: string, id?: string): string {
  return `gradient-${id || color.replace('#', '')}`;
}
