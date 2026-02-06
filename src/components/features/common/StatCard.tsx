import React, { memo } from 'react';

import { TrendingUp, TrendingDown } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export type StatCardColor = 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'cyan';

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
  color: StatCardColor;
  /** 副标题 */
  subtitle?: string;
  /** 趋势数据 */
  trend?: {
    value: number;
    isPositive: boolean;
    label?: string;
  };
  /** 自定义类名 */
  className?: string;
  /** 点击回调 */
  onClick?: () => void;
}

const colorClasses: Record<StatCardColor, string> = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  green: 'bg-green-50 text-green-600 border-green-100',
  red: 'bg-red-50 text-red-600 border-red-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
  orange: 'bg-orange-50 text-orange-600 border-orange-100',
  cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100',
};

/**
 * StatCard 组件 - 统计卡片
 *
 * 用于展示关键指标数据，支持加载状态、趋势显示
 *
 * @example
 * <StatCard
 *   title="总用户数"
 *   value="12,345"
 *   icon={<Users className="h-5 w-5" />}
 *   color="blue"
 *   trend={{ value: 12.5, isPositive: true }}
 * />
 */
export const StatCard = memo(function StatCard({
  title,
  value,
  icon,
  loading = false,
  color,
  subtitle,
  trend,
  className,
  onClick,
}: StatCardProps) {
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

  const [bgColor, textColor, borderColor] = colorClasses[color].split(' ');

  return (
    <Card
      className={cn(
        'border transition-all hover:shadow-md',
        borderColor,
        onClick && 'cursor-pointer',
        className,
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className={cn('text-sm font-medium opacity-80', textColor)}>{title}</span>
          <div className={cn('rounded-lg p-2', bgColor)}>{icon}</div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <span className={cn('text-2xl font-bold', textColor)}>{value}</span>
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
              {trend.value}%{trend.label && <span className="ml-1 opacity-70">{trend.label}</span>}
            </span>
          )}
        </div>
        {subtitle && <div className="mt-1 text-xs text-gray-500">{subtitle}</div>}
      </CardContent>
    </Card>
  );
});

/**
 * StatCardSkeleton 组件 - 统计卡片骨架屏
 *
 * 用于加载状态的占位显示
 */
export function StatCardSkeleton({ className }: { className?: string }) {
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
 *
 * 用于展示多个统计卡片
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
