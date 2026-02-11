/**
 * Enhanced Stat Card Components
 * 
 * 增强版统计卡片组件
 * - 丰富的数据展示
 * - 趋势可视化
 * - 交互功能
 */

import React, { memo, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  CheckCircle,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  MoreHorizontal,
  Maximize2,
  Download,
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkline, StatComparison, CHART_COLORS } from '@/components/charts';
import { cn, formatNumber, formatChangePercent, formatTimeAgo } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

export type StatCardVariant = 'default' | 'compact' | 'detailed' | 'interactive';
export type StatCardSize = 'sm' | 'md' | 'lg';
export type StatCardStatus = 'healthy' | 'warning' | 'critical' | 'neutral';

export interface TrendData {
  value: number;
  isPositive: boolean;
  label?: string;
  previousValue?: number;
}

export interface SparklineData {
  data: number[];
  color?: string;
  showArea?: boolean;
}

export interface StatCardAction {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'destructive';
}

export interface EnhancedStatCardProps {
  /** 标题 */
  title: string;
  /** 数值 */
  value: string | number;
  /** 副标题/描述 */
  subtitle?: string;
  /** 图标 */
  icon?: React.ReactNode;
  /** 趋势数据 */
  trend?: TrendData;
  /** 迷你图数据 */
  sparkline?: SparklineData;
  /** 状态 */
  status?: StatCardStatus;
  /** 变体 */
  variant?: StatCardVariant;
  /** 尺寸 */
  size?: StatCardSize;
  /** 是否加载中 */
  loading?: boolean;
  /** 最后更新时间 */
  lastUpdated?: Date | null;
  /** 自定义类名 */
  className?: string;
  /** 点击回调 */
  onClick?: () => void;
  /** 操作按钮 */
  actions?: StatCardAction[];
  /** 提示信息 */
  tooltip?: string;
  /** 比较数据 */
  comparison?: {
    current: number;
    previous: number;
    label?: string;
  };
  /** 额外内容 */
  extra?: React.ReactNode;
}

// ============================================================================
// Status Configurations
// ============================================================================

const statusConfig: Record<StatCardStatus, {
  bg: string;
  border: string;
  text: string;
  icon: React.ReactNode;
  dot: string;
  gradient: string;
}> = {
  healthy: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-200',
    text: 'text-emerald-700',
    icon: <CheckCircle className="h-5 w-5" />,
    dot: 'bg-emerald-500',
    gradient: 'from-emerald-500/10 to-emerald-500/5',
  },
  warning: {
    bg: 'bg-amber-50',
    border: 'border-amber-200',
    text: 'text-amber-700',
    icon: <AlertCircle className="h-5 w-5" />,
    dot: 'bg-amber-500',
    gradient: 'from-amber-500/10 to-amber-500/5',
  },
  critical: {
    bg: 'bg-rose-50',
    border: 'border-rose-200',
    text: 'text-rose-700',
    icon: <AlertCircle className="h-5 w-5" />,
    dot: 'bg-rose-500',
    gradient: 'from-rose-500/10 to-rose-500/5',
  },
  neutral: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-700',
    icon: <Activity className="h-5 w-5" />,
    dot: 'bg-gray-500',
    gradient: 'from-gray-500/10 to-gray-500/5',
  },
};

// ============================================================================
// Loading State
// ============================================================================

const StatCardSkeleton = memo(function StatCardSkeleton({ 
  size = 'md' 
}: { size?: StatCardSize }) {
  const heightClass = {
    sm: 'h-24',
    md: 'h-32',
    lg: 'h-40',
  }[size];

  return (
    <Card className={cn('overflow-hidden', heightClass)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
});

// ============================================================================
// Main Component
// ============================================================================

export const EnhancedStatCard = memo(function EnhancedStatCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  sparkline,
  status = 'neutral',
  variant = 'default',
  size = 'md',
  loading = false,
  lastUpdated,
  className,
  onClick,
  actions,
  tooltip,
  comparison,
  extra,
}: EnhancedStatCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const config = statusConfig[status];

  // 计算趋势显示
  const trendDisplay = useMemo(() => {
    if (!trend) return null;
    const { value: trendValue, isPositive, label } = trend;
    const color = isPositive ? 'text-emerald-600' : 'text-rose-600';
    const Icon = isPositive ? TrendingUp : TrendingDown;
    
    return (
      <div className="flex items-center gap-1.5">
        <Icon className={cn('h-3.5 w-3.5', color)} />
        <span className={cn('text-xs font-semibold', color)}>
          {formatChangePercent(trendValue / 100, 1, false)}
        </span>
        {label && <span className="text-xs text-gray-400">{label}</span>}
      </div>
    );
  }, [trend]);

  if (loading) {
    return <StatCardSkeleton size={size} />;
  }

  // Compact Variant
  if (variant === 'compact') {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'rounded-xl border p-3 cursor-pointer transition-shadow hover:shadow-md',
          config.bg,
          config.border,
          className
        )}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">{title}</p>
            <p className={cn('text-lg font-bold mt-0.5', config.text)}>{value}</p>
          </div>
          <div className={cn('p-2 rounded-lg bg-white/50', config.text)}>
            {icon || config.icon}
          </div>
        </div>
        {trendDisplay && <div className="mt-1.5">{trendDisplay}</div>}
      </motion.div>
    );
  }

  // Detailed Variant
  if (variant === 'detailed') {
    return (
      <Card
        className={cn(
          'overflow-hidden transition-all duration-300',
          onClick && 'cursor-pointer',
          isHovered && 'shadow-lg',
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium text-gray-600">{title}</CardTitle>
              {tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs text-xs">{tooltip}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
            {actions && actions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {actions.map((action, index) => (
                    <React.Fragment key={index}>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          action.onClick();
                        }}
                        className={action.variant === 'destructive' ? 'text-red-600' : ''}
                      >
                        {action.icon}
                        {action.label}
                      </DropdownMenuItem>
                      {index < actions.length - 1 && <DropdownMenuSeparator />}
                    </React.Fragment>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-900">{value}</span>
                {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
              </div>
              
              {comparison && (
                <div className="mt-3">
                  <StatComparison
                    current={comparison.current}
                    previous={comparison.previous}
                    label={comparison.label}
                  />
                </div>
              )}
              
              {!comparison && trendDisplay && (
                <div className="mt-2">{trendDisplay}</div>
              )}
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <motion.div
                animate={{ scale: isHovered ? 1.1 : 1, rotate: isHovered ? 5 : 0 }}
                transition={{ duration: 0.2 }}
                className={cn(
                  'p-3 rounded-xl',
                  config.bg,
                  config.text
                )}
              >
                {icon || config.icon}
              </motion.div>
              
              {sparkline && (
                <Sparkline
                  data={sparkline.data}
                  color={sparkline.color || CHART_COLORS.primary.DEFAULT}
                  showArea={sparkline.showArea}
                  width={100}
                  height={30}
                />
              )}
            </div>
          </div>
          
          {extra && <div className="mt-4 pt-4 border-t border-gray-100">{extra}</div>}
          
          {lastUpdated && (
            <p className="mt-3 text-xs text-gray-400">
              Updated {formatTimeAgo(lastUpdated)}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Interactive Variant
  if (variant === 'interactive') {
    return (
      <motion.div
        whileHover={{ y: -4, scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'relative overflow-hidden rounded-2xl border p-6 cursor-pointer',
          'bg-gradient-to-br',
          config.gradient,
          config.border,
          'transition-shadow hover:shadow-xl',
          className
        )}
        onClick={onClick}
      >
        {/* Background decoration */}
        <div className={cn(
          'absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20',
          config.dot
        )} />
        
        <div className="relative">
          <div className="flex items-start justify-between mb-4">
            <div className={cn(
              'p-3 rounded-xl bg-white/60 backdrop-blur-sm',
              config.text
            )}>
              {icon || config.icon}
            </div>
            {trend && (
              <div className={cn(
                'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                trend.isPositive ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              )}>
                {trend.isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                {formatChangePercent(trend.value / 100, 1, false)}
              </div>
            )}
          </div>
          
          <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
          <p className="text-3xl font-bold text-gray-900 mb-2">{value}</p>
          
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
          
          {sparkline && (
            <div className="mt-4">
              <Sparkline
                data={sparkline.data}
                color={sparkline.color || CHART_COLORS.primary.DEFAULT}
                showArea={sparkline.showArea}
                width={200}
                height={40}
              />
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  // Default Variant
  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-200',
        onClick && 'cursor-pointer hover:shadow-md',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-600">{title}</span>
          <div className={cn('p-2 rounded-lg', config.bg, config.text)}>
            {icon || config.icon}
          </div>
        </div>
        
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-2xl font-bold text-gray-900">{value}</span>
          {subtitle && <span className="text-sm text-gray-500">{subtitle}</span>}
        </div>
        
        {trendDisplay && <div>{trendDisplay}</div>}
        
        {sparkline && (
          <div className="mt-3">
            <Sparkline
              data={sparkline.data}
              color={sparkline.color || CHART_COLORS.primary.DEFAULT}
              showArea={sparkline.showArea}
              width={120}
              height={30}
            />
          </div>
        )}
        
        {lastUpdated && (
          <p className="mt-2 text-xs text-gray-400">
            {formatTimeAgo(lastUpdated)}
          </p>
        )}
      </CardContent>
    </Card>
  );
});

// ============================================================================
// Stat Card Group Component
// ============================================================================

interface StatCardGroupProps {
  children: React.ReactNode;
  className?: string;
  columns?: 2 | 3 | 4 | 6;
  gap?: 'sm' | 'md' | 'lg';
}

export const StatCardGroup = memo(function StatCardGroup({
  children,
  className,
  columns = 4,
  gap = 'md',
}: StatCardGroupProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  const gapClass = {
    sm: 'gap-3',
    md: 'gap-4',
    lg: 'gap-6',
  }[gap];

  return (
    <div className={cn('grid', gridCols[columns], gapClass, className)}>
      {children}
    </div>
  );
});

// ============================================================================
// Dashboard Stats Section Component
// ============================================================================

interface DashboardStatsSectionProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'red';
}

export const DashboardStatsSection = memo(function DashboardStatsSection({
  title,
  description,
  children,
  className,
  icon,
  color = 'blue',
}: DashboardStatsSectionProps) {
  const colorConfig = {
    blue: { bg: 'bg-blue-50/50', border: 'border-blue-200/50', icon: 'text-blue-600' },
    green: { bg: 'bg-emerald-50/50', border: 'border-emerald-200/50', icon: 'text-emerald-600' },
    amber: { bg: 'bg-amber-50/50', border: 'border-amber-200/50', icon: 'text-amber-600' },
    purple: { bg: 'bg-purple-50/50', border: 'border-purple-200/50', icon: 'text-purple-600' },
    red: { bg: 'bg-rose-50/50', border: 'border-rose-200/50', icon: 'text-rose-600' },
  }[color];

  return (
    <div className={cn(
      'rounded-xl border p-4',
      colorConfig.bg,
      colorConfig.border,
      className
    )}>
      <div className="flex items-center gap-2 mb-4">
        {icon && <div className={cn('p-1.5 rounded-lg bg-white/50', colorConfig.icon)}>{icon}</div>}
        <div>
          <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
});

// ============================================================================
// Export
// ============================================================================

export default EnhancedStatCard;
