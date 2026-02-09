/**
 * 图表主题配置
 *
 * 提供统一的 Recharts 图表主题和样式配置
 */

import { CSSProperties } from 'react';

// ============================================================================
// 配色方案
// ============================================================================

export const chartColors = {
  // 主色调
  primary: {
    main: '#8b5cf6',
    light: '#a78bfa',
    dark: '#7c3aed',
    gradient: ['rgba(139, 92, 246, 0.3)', 'rgba(139, 92, 246, 0.05)'],
  },
  // 成功/上涨
  success: {
    main: '#10b981',
    light: '#34d399',
    dark: '#059669',
    gradient: ['rgba(16, 185, 129, 0.3)', 'rgba(16, 185, 129, 0.05)'],
  },
  // 警告
  warning: {
    main: '#f59e0b',
    light: '#fbbf24',
    dark: '#d97706',
    gradient: ['rgba(245, 158, 11, 0.3)', 'rgba(245, 158, 11, 0.05)'],
  },
  // 危险/下跌
  danger: {
    main: '#ef4444',
    light: '#f87171',
    dark: '#dc2626',
    gradient: ['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.05)'],
  },
  // 信息
  info: {
    main: '#3b82f6',
    light: '#60a5fa',
    dark: '#2563eb',
    gradient: ['rgba(59, 130, 246, 0.3)', 'rgba(59, 130, 246, 0.05)'],
  },
  // 中性色
  neutral: {
    main: '#6b7280',
    light: '#9ca3af',
    dark: '#4b5563',
    gradient: ['rgba(107, 114, 128, 0.3)', 'rgba(107, 114, 128, 0.05)'],
  },
  // 多协议配色（用于对比图表）
  protocols: [
    '#8b5cf6', // Chainlink - 紫色
    '#10b981', // Pyth - 绿色
    '#3b82f6', // Band - 蓝色
    '#f59e0b', // API3 - 橙色
    '#ef4444', // RedStone - 红色
    '#ec4899', // Flux - 粉色
    '#06b6d4', // DIA - 青色
    '#8b5cf6', // Switchboard - 紫色
  ],
};

// ============================================================================
// 图表网格和坐标轴样式
// ============================================================================

export const gridConfig = {
  stroke: 'rgba(139, 92, 246, 0.1)',
  strokeDasharray: '3 3',
  vertical: false,
};

export const axisConfig = {
  x: {
    stroke: 'rgba(139, 92, 246, 0.2)',
    tick: { fill: '#6b7280', fontSize: 11 },
    tickLine: { stroke: 'rgba(139, 92, 246, 0.1)' },
    axisLine: { stroke: 'rgba(139, 92, 246, 0.2)' },
  },
  y: {
    stroke: 'rgba(139, 92, 246, 0.2)',
    tick: { fill: '#6b7280', fontSize: 11 },
    tickLine: { stroke: 'rgba(139, 92, 246, 0.1)' },
    axisLine: { stroke: 'rgba(139, 92, 246, 0.2)' },
    tickFormatter: (value: number) => {
      if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
      return value.toString();
    },
  },
};

// ============================================================================
// Tooltip 样式配置
// ============================================================================

export const tooltipConfig = {
  contentStyle: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    border: '1px solid rgba(139, 92, 246, 0.2)',
    borderRadius: '12px',
    boxShadow: '0 10px 40px -10px rgba(139, 92, 246, 0.2)',
    padding: '12px 16px',
  } as CSSProperties,
  itemStyle: {
    color: '#374151',
    fontSize: '13px',
    fontWeight: 500,
  } as CSSProperties,
  labelStyle: {
    color: '#6b7280',
    fontSize: '12px',
    fontWeight: 400,
    marginBottom: '8px',
  } as CSSProperties,
  cursor: {
    stroke: 'rgba(139, 92, 246, 0.3)',
    strokeWidth: 1,
    strokeDasharray: '4 4',
  },
  wrapperStyle: {
    outline: 'none',
  } as CSSProperties,
};

// ============================================================================
// 图例样式配置
// ============================================================================

export const legendConfig = {
  wrapperStyle: {
    paddingTop: '16px',
  } as CSSProperties,
  iconType: 'circle' as const,
  iconSize: 8,
};

// ============================================================================
// 线条图表配置
// ============================================================================

export const lineChartConfig = {
  strokeWidth: 2,
  dot: {
    r: 4,
    strokeWidth: 2,
    fill: '#fff',
  },
  activeDot: {
    r: 6,
    strokeWidth: 2,
    fill: '#fff',
  },
  animationDuration: 1500,
  animationEasing: 'ease-out',
};

// ============================================================================
// 面积图表配置
// ============================================================================

export const areaChartConfig = {
  strokeWidth: 2,
  fillOpacity: 0.3,
  animationDuration: 1500,
  animationEasing: 'ease-out',
};

// ============================================================================
// 柱状图表配置
// ============================================================================

export const barChartConfig = {
  radius: [4, 4, 0, 0],
  animationDuration: 1000,
  animationEasing: 'ease-out',
};

// ============================================================================
// 饼图配置
// ============================================================================

export const pieChartConfig = {
  innerRadius: '60%',
  outerRadius: '80%',
  paddingAngle: 2,
  cornerRadius: 4,
  animationDuration: 1000,
  animationEasing: 'ease-out',
};

// ============================================================================
// 自定义 Tooltip 组件样式
// ============================================================================

export const customTooltipStyles = {
  container: `
    rounded-xl border border-purple-200/50 bg-white/95 p-4
    shadow-lg shadow-purple-500/10 backdrop-blur-sm
  `,
  header: 'mb-2 text-xs font-medium text-gray-500',
  item: 'flex items-center gap-2 py-1',
  dot: 'h-2 w-2 rounded-full',
  label: 'text-sm font-medium text-gray-700',
  value: 'ml-auto text-sm font-bold text-gray-900',
  change: {
    up: 'text-emerald-500',
    down: 'text-rose-500',
    neutral: 'text-gray-500',
  },
};

// ============================================================================
// 图表容器样式
// ============================================================================

export const chartContainerStyles = {
  default: 'rounded-2xl border border-purple-100/50 bg-white p-6 shadow-sm',
  compact: 'rounded-xl border border-purple-100/50 bg-white p-4 shadow-sm',
  transparent: 'p-4',
};

// ============================================================================
// 响应式配置
// ============================================================================

export const responsiveConfig = {
  width: '100%',
  height: 300,
  minHeight: 200,
  aspect: 2,
};

// ============================================================================
// 动画配置
// ============================================================================

export const chartAnimation = {
  isAnimationActive: true,
  animationBegin: 0,
  animationDuration: 1500,
  animationEasing: 'ease-out',
};

// ============================================================================
// 价格格式化
// ============================================================================

export function formatPriceValue(value: number, currency: string = '$'): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  
  if (value >= 1e9) return `${currency}${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${currency}${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${currency}${(value / 1e3).toFixed(2)}K`;
  if (value >= 1) return `${currency}${value.toFixed(2)}`;
  if (value >= 0.01) return `${currency}${value.toFixed(4)}`;
  return `${currency}${value.toFixed(6)}`;
}

export function formatPercentage(value: number, decimals: number = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

// ============================================================================
// 获取协议颜色
// ============================================================================

export function getProtocolColor(index: number): string {
  return chartColors.protocols[index % chartColors.protocols.length] ?? '#8b5cf6';
}

export function getProtocolColors(count: number): string[] {
  return Array.from({ length: count }, (_, i) => getProtocolColor(i));
}

// ============================================================================
// 渐变定义
// ============================================================================

export function createGradientId(baseId: string, index: number = 0): string {
  return `gradient-${baseId}-${index}`;
}

export interface GradientDef {
  id: string;
  color: string;
  opacity: number;
}

export function createAreaGradient(
  color: string,
  id: string,
  opacity: number = 0.3
): GradientDef {
  return {
    id,
    color,
    opacity,
  };
}
