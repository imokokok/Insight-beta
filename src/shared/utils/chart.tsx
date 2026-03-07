/**
 * Chart Utilities
 *
 * 图表相关的通用工具函数
 */

import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatTime } from './format/date';

export type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d';
export type Trend = 'up' | 'down' | 'stable';

/**
 * 格式化图表标签
 */
export function formatChartLabel(timeRange: TimeRange, timestamp: string | Date): string {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  switch (timeRange) {
    case '1h':
    case '24h':
      return formatTime(date, 'HH:mm');
    case '7d':
      return formatTime(date, 'MM/DD HH:mm');
    case '30d':
    case '90d':
      return formatTime(date, 'MM/DD');
    default:
      return formatTime(date, 'MM/DD');
  }
}

/**
 * 获取状态对应的颜色类
 */
export function getStatusColor(status: string): string {
  switch (status.toLowerCase()) {
    case 'online':
    case 'healthy':
    case 'active':
      return 'bg-success text-success-foreground';
    case 'offline':
    case 'critical':
    case 'error':
      return 'bg-error text-error-foreground';
    case 'degraded':
    case 'warning':
    case 'pending':
      return 'bg-warning text-warning-foreground';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

/**
 * 获取分数对应的颜色类
 */
export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-500';
  if (score >= 70) return 'text-yellow-500';
  if (score >= 50) return 'text-orange-500';
  return 'text-red-500';
}

/**
 * 获取趋势图标组件
 */
export function TrendIcon({ trend, className }: { trend: Trend; className?: string }) {
  switch (trend) {
    case 'up':
      return <TrendingUp className={`h-4 w-4 text-success ${className || ''}`} />;
    case 'down':
      return <TrendingDown className={`h-4 w-4 text-error ${className || ''}`} />;
    case 'stable':
      return <Minus className={`h-4 w-4 text-muted-foreground ${className || ''}`} />;
    default:
      return null;
  }
}

/**
 * 获取趋势颜色
 */
export function getTrendColor(trend: Trend): string {
  switch (trend) {
    case 'up':
      return 'text-success';
    case 'down':
      return 'text-error';
    case 'stable':
      return 'text-muted-foreground';
    default:
      return 'text-muted-foreground';
  }
}
