/**
 * StatCard 组件 - 统一版统计卡片
 *
 * 合并了原 StatCard、EnhancedStatCard、StatCardEnhanced 的功能
 * 通过 variant 参数控制不同级别功能
 */

import React, { memo, useState } from 'react';

import { TrendingDown, TrendingUp } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { COMPONENT_COLORS } from '@/lib/design-system/tokens/colors';
import { cn } from '@/lib/utils';

import { DataFreshnessIndicator } from '../DataFreshnessIndicator';

export type StatCardColor = keyof typeof COMPONENT_COLORS;
export type StatCardVariant = 'simple' | 'enhanced' | 'animated';

export interface StatCardProps {
  /** 标题 */
  title: string;
  /** 数值 */
  value: string | number;
  /** 图标 */
  icon: React.ReactNode;
  /** 是否加载中 */
  loading?: boolean;
  /** 颜色主题 */
  color?: StatCardColor;
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
  /** 历史数据（用于趋势图） */
  history?: { value: number; timestamp: number }[];
  /** 自定义类名 */
  className?: string;
  /** 点击回调 */
  onClick?: () => void;
  /** 数据最后更新时间 */
  lastUpdated?: Date | null;
  /** 变体类型 */
  variant?: StatCardVariant;
  /** 是否显示为价格 */
  isPrice?: boolean;
  /** 货币符号 */
  currency?: string;
  /** 小数位数 */
  decimals?: number;
}

const colorConfig: Record<
  StatCardColor,
  { bg: string; text: string; border: string; gradient: string; iconBg: string }
> = COMPONENT_COLORS;

/**
 * 迷你趋势图组件
 */
function Sparkline({ data, color }: { data: number[]; color: StatCardColor }) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 60;
    const y = 20 - ((value - min) / range) * 20;
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(' L ')}`;
  const colorClasses: Record<string, string> = {
    blue: 'stroke-blue-500',
    green: 'stroke-green-500',
    amber: 'stroke-amber-500',
    red: 'stroke-red-500',
    purple: 'stroke-purple-500',
    orange: 'stroke-orange-500',
    cyan: 'stroke-cyan-500',
    pink: 'stroke-pink-500',
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
 * StatCard 组件 - 统一版统计卡片
 *
 * @example
 * // 简单版本
 * <StatCard title="用户数" value="1,234" icon={<Users />} color="blue" />
 *
 * // 增强版本（带迷你图）
 * <StatCard
 *   title="用户数"
 *   value="1,234"
 *   icon={<Users />}
 *   color="blue"
 *   variant="enhanced"
 *   sparklineData={[1, 2, 3, 4, 5]}
 * />
 *
 * // 动画版本
 * <StatCard
 *   title="价格"
 *   value={1234.56}
 *   icon={<DollarSign />}
 *   color="green"
 *   variant="animated"
 *   isPrice
 * />
 */
export const StatCard = memo(function StatCard({
  title,
  value,
  icon,
  loading = false,
  color = 'blue',
  subtitle,
  trend,
  sparklineData,
  history: _history,
  className,
  onClick,
  lastUpdated,
  variant = 'simple',
  isPrice: _isPrice,
  currency: _currency,
  decimals: _decimals,
}: StatCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const config = colorConfig[color];

  // 简单版本
  if (variant === 'simple') {
    if (loading) {
      return (
        <Card className={cn('border', className)}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
            <Skeleton className="mt-2 h-8 w-16" />
          </CardContent>
        </Card>
      );
    }

    return (
      <Card
        className={cn(
          'border transition-all hover:shadow-md',
          config.border,
          onClick && 'cursor-pointer',
          className,
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <span className={cn('text-sm font-medium opacity-80', config.text)}>{title}</span>
            <div className={cn('rounded-lg p-2', config.bg)}>{icon}</div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={cn('text-2xl font-bold', config.text)}>{value}</span>
            {trend && (
              <span
                className={cn(
                  'flex items-center text-xs',
                  trend.isPositive ? 'text-green-600' : 'text-red-600',
                )}
              >
                {trend.isPositive ? (
                  <TrendingUp className="mr-1 h-3 w-3" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3" />
                )}
                {trend.value}%
                {trend.label && <span className="ml-1 opacity-70">{trend.label}</span>}
              </span>
            )}
          </div>
          {(subtitle || lastUpdated) && (
            <div className="mt-2 flex items-center justify-between">
              {subtitle && <div className="text-xs text-gray-500">{subtitle}</div>}
              {lastUpdated && (
                <DataFreshnessIndicator lastUpdated={lastUpdated} className="ml-auto" />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // 增强版本
  if (variant === 'enhanced') {
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
                <span className={cn('text-2xl font-bold tracking-tight', config.text)}>
                  {value}
                </span>
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
  }

  // 动画版本
  if (loading) {
    return (
      <Card
        className={cn(
          'relative overflow-hidden p-4 transition-all duration-300',
          'border border-gray-200 bg-white',
          className,
        )}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="h-3 w-16 animate-pulse rounded bg-gray-200" />
            <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
          </div>
          <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
        </div>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        'group relative overflow-hidden p-4 transition-all duration-300',
        'border bg-white',
        'hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/10',
        'active:scale-[0.98] active:duration-150',
        config.border,
        onClick && 'cursor-pointer',
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* 背景渐变效果 */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300',
          config.gradient,
          isHovered && 'opacity-100',
        )}
      />

      <div className="relative">
        {/* 头部：标题和图标 */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-500">{title}</p>
            {subtitle && <p className="text-[10px] text-gray-400">{subtitle}</p>}
          </div>
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300',
              config.iconBg,
              config.text,
              isHovered && 'scale-110',
            )}
          >
            {icon}
          </div>
        </div>

        {/* 数值显示 */}
        <div className="mt-3">
          <div className={cn('text-2xl font-bold tracking-tight', config.text)}>{value}</div>
        </div>

        {/* 趋势 */}
        {trend && (
          <div className="mt-3 flex items-center gap-1.5">
            <span
              className={cn(
                'flex items-center gap-0.5 text-xs font-medium',
                trend.isPositive ? 'text-emerald-600' : 'text-rose-600',
              )}
            >
              {trend.isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {trend.isPositive ? '+' : ''}
              {trend.value}%
            </span>
            <span className="text-[10px] text-gray-400">vs last 24h</span>
          </div>
        )}

        {/* 最后更新时间 */}
        {lastUpdated && (
          <div className="mt-2 border-t border-gray-100 pt-2">
            <p className="text-[10px] text-gray-400">Updated {lastUpdated.toLocaleTimeString()}</p>
          </div>
        )}
      </div>
    </Card>
  );
});

/**
 * StatCardSkeleton 组件 - 统计卡片骨架屏
 */
export function StatCardSkeleton({
  className,
  variant = 'simple',
}: {
  className?: string;
  variant?: StatCardVariant;
}) {
  if (variant === 'enhanced' || variant === 'animated') {
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

  return (
    <Card className={cn('border', className)}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
        <Skeleton className="mt-2 h-8 w-16" />
      </CardContent>
    </Card>
  );
}

/**
 * StatCardGroup 组件 - 统计卡片组
 */
interface StatCardGroupProps {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4 | 6;
}

export const StatCardGroup = memo(function StatCardGroup({
  children,
  className,
  columns = 4,
}: StatCardGroupProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  return <div className={cn('grid gap-4', gridCols[columns], className)}>{children}</div>;
});
