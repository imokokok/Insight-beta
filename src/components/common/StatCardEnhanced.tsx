/**
 * 增强版统计卡片组件
 *
 * 添加悬停动效、价格闪烁和数字滚动动画
 */

'use client';

import { ReactNode, useState } from 'react';

import { TrendingUp, TrendingDown } from 'lucide-react';

import { Card } from '@/components/ui/card';
import {
  AnimatedNumber,
  LivePrice,
  PriceChangeIndicator,
  PriceTrend,
} from '@/components/features/interactions/PriceFlash';
import { cn } from '@/lib/utils';

interface StatCardEnhancedProps {
  /** 标题 */
  title: string;
  /** 当前值 */
  value: number | string;
  /** 图标 */
  icon: ReactNode;
  /** 加载状态 */
  loading?: boolean;
  /** 颜色主题 */
  color?: 'blue' | 'green' | 'red' | 'purple' | 'orange' | 'cyan' | 'pink';
  /** 趋势值 (百分比) */
  trend?: {
    value: number;
    isPositive: boolean;
  };
  /** 历史数据 (用于趋势图) */
  history?: { value: number; timestamp: number }[];
  /** 是否显示为价格 */
  isPrice?: boolean;
  /** 货币符号 */
  currency?: string;
  /** 小数位数 */
  decimals?: number;
  /** 副标题 */
  subtitle?: string;
  /** 最后更新时间 */
  lastUpdated?: Date | null;
  /** 自定义类名 */
  className?: string;
  /** 点击回调 */
  onClick?: () => void;
}

const colorVariants = {
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-600',
    border: 'border-blue-200',
    gradient: 'from-blue-500/10 to-transparent',
    iconBg: 'bg-blue-100',
  },
  green: {
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
    border: 'border-emerald-200',
    gradient: 'from-emerald-500/10 to-transparent',
    iconBg: 'bg-emerald-100',
  },
  red: {
    bg: 'bg-rose-50',
    text: 'text-rose-600',
    border: 'border-rose-200',
    gradient: 'from-rose-500/10 to-transparent',
    iconBg: 'bg-rose-100',
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-600',
    border: 'border-purple-200',
    gradient: 'from-purple-500/10 to-transparent',
    iconBg: 'bg-purple-100',
  },
  orange: {
    bg: 'bg-orange-50',
    text: 'text-orange-600',
    border: 'border-orange-200',
    gradient: 'from-orange-500/10 to-transparent',
    iconBg: 'bg-orange-100',
  },
  cyan: {
    bg: 'bg-cyan-50',
    text: 'text-cyan-600',
    border: 'border-cyan-200',
    gradient: 'from-cyan-500/10 to-transparent',
    iconBg: 'bg-cyan-100',
  },
  pink: {
    bg: 'bg-pink-50',
    text: 'text-pink-600',
    border: 'border-pink-200',
    gradient: 'from-pink-500/10 to-transparent',
    iconBg: 'bg-pink-100',
  },
};

/**
 * StatCardEnhanced 组件 - 增强版统计卡片
 *
 * 带有悬停动效、价格闪烁和数字滚动动画
 */
export function StatCardEnhanced({
  title,
  value,
  icon,
  loading = false,
  color = 'blue',
  trend,
  history,
  isPrice = false,
  currency = '$',
  decimals = 0,
  subtitle,
  lastUpdated,
  className,
  onClick,
}: StatCardEnhancedProps) {
  const [isHovered, setIsHovered] = useState(false);
  const colors = colorVariants[color];

  const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;

  if (loading) {
    return (
      <Card
        className={cn(
          'relative overflow-hidden p-4 transition-all duration-300',
          'border border-gray-200 bg-white',
          className
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
        colors.border,
        onClick && 'cursor-pointer',
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
    >
      {/* 背景渐变效果 */}
      <div
        className={cn(
          'absolute inset-0 bg-gradient-to-br opacity-0 transition-opacity duration-300',
          colors.gradient,
          isHovered && 'opacity-100'
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
              colors.iconBg,
              colors.text,
              isHovered && 'scale-110'
            )}
          >
            {icon}
          </div>
        </div>

        {/* 数值显示 */}
        <div className="mt-3">
          {isPrice ? (
            <div className="text-2xl font-bold tracking-tight">
              <LivePrice price={numericValue} currency={currency} decimals={decimals} />
            </div>
          ) : (
            <div className={cn('text-2xl font-bold tracking-tight', colors.text)}>
              <AnimatedNumber
                value={numericValue}
                prefix={typeof value === 'string' && value.startsWith('$') ? '$' : ''}
                suffix={typeof value === 'string' && value.includes('%') ? '%' : ''}
                decimals={decimals}
              />
            </div>
          )}
        </div>

        {/* 趋势和图表 */}
        <div className="mt-3 flex items-center justify-between">
          {trend && (
            <div className="flex items-center gap-1.5">
              <span
                className={cn(
                  'flex items-center gap-0.5 text-xs font-medium',
                  trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
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

          {history && history.length > 0 && (
            <PriceTrend
              data={history}
              width={60}
              height={24}
              className="opacity-60 transition-opacity group-hover:opacity-100"
            />
          )}
        </div>

        {/* 最后更新时间 */}
        {lastUpdated && (
          <div className="mt-2 border-t border-gray-100 pt-2">
            <p className="text-[10px] text-gray-400">
              Updated {lastUpdated.toLocaleTimeString()}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}

interface StatCardGroupProps {
  children: ReactNode;
  className?: string;
  columns?: 2 | 3 | 4 | 6;
}

/**
 * StatCardGroup 组件 - 统计卡片组
 *
 * 用于整齐排列多个统计卡片
 */
export function StatCardGroup({
  children,
  className,
  columns = 4,
}: StatCardGroupProps) {
  const columnClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  return (
    <div className={cn('grid gap-4', columnClasses[columns], className)}>
      {children}
    </div>
  );
}

interface ComparisonStatCardProps {
  title: string;
  currentValue: number;
  previousValue: number;
  icon: ReactNode;
  color?: StatCardEnhancedProps['color'];
  isPrice?: boolean;
  currency?: string;
  decimals?: number;
  className?: string;
}

/**
 * ComparisonStatCard 组件 - 对比统计卡片
 *
 * 显示当前值与对比值的变化
 */
export function ComparisonStatCard({
  title,
  currentValue,
  previousValue,
  icon,
  color = 'blue',
  isPrice = false,
  currency = '$',
  decimals = 0,
  className,
}: ComparisonStatCardProps) {
  const colors = colorVariants[color];

  return (
    <Card
      className={cn(
        'group relative overflow-hidden p-4 transition-all duration-300',
        'border bg-white',
        'hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-500/10',
        colors.border,
        className
      )}
    >
      <div className="relative">
        <div className="flex items-start justify-between">
          <p className="text-xs font-medium text-gray-500">{title}</p>
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-xl',
              colors.iconBg,
              colors.text
            )}
          >
            {icon}
          </div>
        </div>

        <div className="mt-3">
          {isPrice ? (
            <div className="text-2xl font-bold tracking-tight">
              <LivePrice price={currentValue} currency={currency} decimals={decimals} />
            </div>
          ) : (
            <div className={cn('text-2xl font-bold tracking-tight', colors.text)}>
              <AnimatedNumber value={currentValue} decimals={decimals} />
            </div>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          <PriceChangeIndicator
            value={currentValue}
            previousValue={previousValue}
            decimals={1}
          />
          <span className="text-xs text-gray-400">
            from {isPrice ? currency : ''}
            {previousValue.toFixed(decimals)}
          </span>
        </div>
      </div>
    </Card>
  );
}
