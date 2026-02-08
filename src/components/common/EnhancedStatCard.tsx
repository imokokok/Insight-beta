/**
 * Enhanced StatCard Component
 *
 * 增强版统计卡片组件
 * - 添加迷你趋势图
 * - 悬停效果
 * - 渐变背景
 */

import React, { memo } from 'react';

import { TrendingUp, TrendingDown } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type StatCardColor = 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'cyan';

export interface EnhancedStatCardProps {
  /** 标题 */
  title: string;
  /** 数值 */
  value: string | number;
  /** 图标 */
  icon: React.ReactNode;
  /** 是否加载中 */
  loading?: boolean;
  /** 颜色主题 */
  color: StatCardColor;
  /** 副标题 */
  subtitle?: string;
  /** 趋势数据 */
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  /** 迷你图数据 */
  sparklineData?: number[];
  /** 自定义类名 */
  className?: string;
  /** 点击回调 */
  onClick?: () => void;
}

const colorConfig: Record<
  StatCardColor,
  { bg: string; text: string; border: string; gradient: string }
> = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-100',
    gradient: 'from-blue-500/10 to-transparent',
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-600',
    border: 'border-green-100',
    gradient: 'from-green-500/10 to-transparent',
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-600',
    border: 'border-red-100',
    gradient: 'from-red-500/10 to-transparent',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-100',
    gradient: 'from-purple-500/10 to-transparent',
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-100',
    gradient: 'from-orange-500/10 to-transparent',
  },
  cyan: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-600',
    border: 'border-cyan-100',
    gradient: 'from-cyan-500/10 to-transparent',
  },
};

/**
 * 迷你趋势图组件
 */
function Sparkline({ data, color }: { data: number[]; color: StatCardColor }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // 生成 SVG 路径
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 60;
    const y = 20 - ((value - min) / range) * 20;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const colorClasses = {
    blue: 'stroke-blue-500',
    green: 'stroke-green-500',
    red: 'stroke-red-500',
    purple: 'stroke-purple-500',
    orange: 'stroke-orange-500',
    cyan: 'stroke-cyan-500',
  };

  return (
    <svg width="60" height="24" className="overflow-visible">
      <path
        d={pathD}
        fill="none"
        className={cn(colorClasses[color], 'stroke-2')}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * EnhancedStatCard 组件 - 增强版统计卡片
 */
export const EnhancedStatCard = memo(function EnhancedStatCard({
  title,
  value,
  icon,
  loading = false,
  color,
  subtitle,
  trend,
  sparklineData,
  className,
  onClick,
}: EnhancedStatCardProps) {
  if (loading) {
    return (
      <Card className={cn('overflow-hidden border', className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-10 w-10 rounded-xl" />
          </div>
          <Skeleton className="mt-3 h-8 w-24" />
        </CardContent>
      </Card>
    );
  }

  const config = colorConfig[color];

  return (
    <Card
      className={cn(
        'relative overflow-hidden border transition-all duration-300',
        'hover:scale-[1.02] hover:shadow-lg',
        config.border,
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      {/* 渐变背景 */}
      <div className={cn('absolute inset-0 bg-gradient-to-br opacity-50', config.gradient)} />

      {/* 左侧装饰条 */}
      <div
        className={cn(
          'absolute bottom-0 left-0 top-0 w-1',
          config.bg.replace('bg-', 'bg-').replace('50', '500'),
        )}
      />

      <CardContent className="relative p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <span className={cn('text-sm font-medium opacity-70', config.text)}>{title}</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={cn('text-2xl font-bold tracking-tight', config.text)}>{value}</span>
              {trend && (
                <span
                  className={cn(
                    'flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium',
                    trend.isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700',
                  )}
                >
                  {trend.isPositive ? (
                    <TrendingUp className="mr-0.5 h-3 w-3" />
                  ) : (
                    <TrendingDown className="mr-0.5 h-3 w-3" />
                  )}
                  {trend.value}%
                </span>
              )}
            </div>
            {subtitle && <div className="mt-1 text-xs text-gray-500">{subtitle}</div>}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className={cn('rounded-xl p-2.5 shadow-sm', config.bg)}>{icon}</div>
            {sparklineData && (
              <div className="opacity-60">
                <Sparkline data={sparklineData} color={color} />
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

/**
 * EnhancedStatCardSkeleton 组件 - 增强版统计卡片骨架屏
 */
export function EnhancedStatCardSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden border', className)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-3 h-8 w-24" />
          </div>
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * EnhancedStatCardGroup 组件 - 增强版统计卡片组
 */
interface EnhancedStatCardGroupProps {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4;
}

export const EnhancedStatCardGroup = memo(function EnhancedStatCardGroup({
  children,
  className,
  columns = 4,
}: EnhancedStatCardGroupProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return <div className={cn('grid gap-4', gridCols[columns], className)}>{children}</div>;
});
