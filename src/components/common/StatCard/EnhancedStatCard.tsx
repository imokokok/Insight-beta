/**
 * Enhanced Stat Card Components
 *
 * 增强版统计卡片组件
 * - 丰富的数据展示
 * - 趋势可视化
 * - 交互功能
 */

import { memo, useState, useMemo, Fragment } from 'react';

import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertCircle,
  CheckCircle,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal,
} from 'lucide-react';

import { Sparkline, StatComparison, CHART_COLORS } from '@/components/charts';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn, formatChangePercent, formatTimeAgo } from '@/shared/utils';

// ============================================================================
// Types
// ============================================================================

export type StatCardVariant = 'default' | 'compact' | 'detailed' | 'interactive';
export type StatCardSize = 'sm' | 'md' | 'lg';
export type StatCardStatus = 'healthy' | 'warning' | 'critical' | 'neutral';
export type StatCardColor = 'blue' | 'green' | 'amber' | 'purple' | 'red' | 'cyan' | 'pink';

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
  /** 颜色 */
  color?: StatCardColor;
  /** 趋势数据 */
  trend?: TrendData;
  /** 迷你图数据 */
  sparkline?: SparklineData;
  /** 迷你图数据 (数组格式，简写) */
  sparklineData?: number[];
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
// Status & Color Configurations
// ============================================================================

const statusConfig: Record<
  StatCardStatus,
  {
    bg: string;
    border: string;
    text: string;
    icon: React.ReactNode;
    dot: string;
    gradient: string;
  }
> = {
  healthy: {
    bg: 'bg-success/10',
    border: 'border-success/20',
    text: 'text-success-dark',
    icon: <CheckCircle className="h-5 w-5" />,
    dot: 'bg-success',
    gradient: 'from-success/10 to-success/5',
  },
  warning: {
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    text: 'text-warning-dark',
    icon: <AlertCircle className="h-5 w-5" />,
    dot: 'bg-warning',
    gradient: 'from-warning/10 to-warning/5',
  },
  critical: {
    bg: 'bg-error/10',
    border: 'border-error/20',
    text: 'text-error-dark',
    icon: <AlertCircle className="h-5 w-5" />,
    dot: 'bg-error',
    gradient: 'from-error/10 to-error/5',
  },
  neutral: {
    bg: 'bg-muted/30',
    border: 'border-muted',
    text: 'text-muted-foreground',
    icon: <Activity className="h-5 w-5" />,
    dot: 'bg-muted-foreground',
    gradient: 'from-muted-foreground/10 to-muted-foreground/5',
  },
};

const colorConfig: Record<
  StatCardColor,
  {
    bg: string;
    border: string;
    text: string;
    icon: React.ReactNode;
    dot: string;
    gradient: string;
  }
> = {
  blue: {
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    text: 'text-primary-dark',
    icon: <Activity className="h-5 w-5" />,
    dot: 'bg-primary',
    gradient: 'from-primary/10 to-primary/5',
  },
  green: {
    bg: 'bg-success/10',
    border: 'border-success/20',
    text: 'text-success-dark',
    icon: <CheckCircle className="h-5 w-5" />,
    dot: 'bg-success',
    gradient: 'from-success/10 to-success/5',
  },
  amber: {
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    text: 'text-warning-dark',
    icon: <AlertCircle className="h-5 w-5" />,
    dot: 'bg-warning',
    gradient: 'from-warning/10 to-warning/5',
  },
  purple: {
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    text: 'text-primary-dark',
    icon: <Activity className="h-5 w-5" />,
    dot: 'bg-primary',
    gradient: 'from-primary/10 to-primary/5',
  },
  red: {
    bg: 'bg-error/10',
    border: 'border-error/20',
    text: 'text-error-dark',
    icon: <AlertCircle className="h-5 w-5" />,
    dot: 'bg-error',
    gradient: 'from-error/10 to-error/5',
  },
  cyan: {
    bg: 'bg-accent/10',
    border: 'border-accent/20',
    text: 'text-accent-dark',
    icon: <Activity className="h-5 w-5" />,
    dot: 'bg-accent',
    gradient: 'from-accent/10 to-accent/5',
  },
  pink: {
    bg: 'bg-accent/10',
    border: 'border-accent/20',
    text: 'text-accent-dark',
    icon: <Activity className="h-5 w-5" />,
    dot: 'bg-accent',
    gradient: 'from-accent/10 to-accent/5',
  },
};

// ============================================================================
// Loading State
// ============================================================================

export const StatCardSkeleton = memo(function StatCardSkeleton({
  size = 'md',
}: {
  size?: StatCardSize;
}) {
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
  color,
  trend,
  sparkline,
  sparklineData,
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
  const config = color ? colorConfig[color] : statusConfig[status];

  const sparklineWithData = sparkline || (sparklineData ? { data: sparklineData } : undefined);

  // 计算趋势显示
  const trendDisplay = useMemo(() => {
    if (!trend) return null;
    const { value: trendValue, isPositive, label } = trend;
    const color = isPositive ? 'text-success' : 'text-error';
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
          'cursor-pointer rounded-xl border p-3 transition-shadow hover:shadow-md',
          config.bg,
          config.border,
          className,
        )}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500">{title}</p>
            <p className={cn('mt-0.5 text-lg font-bold', config.text)}>{value}</p>
          </div>
          <div className={cn('rounded-lg bg-white/50 p-2', config.text)}>{icon || config.icon}</div>
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
          className,
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
              {tooltip && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground" />
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
                    <Fragment key={index}>
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
                    </Fragment>
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
                <span className="text-3xl font-bold text-foreground">{value}</span>
                {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
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

              {!comparison && trendDisplay && <div className="mt-2">{trendDisplay}</div>}
            </div>

            <div className="flex flex-col items-end gap-2">
              <motion.div
                animate={{ scale: isHovered ? 1.1 : 1, rotate: isHovered ? 5 : 0 }}
                transition={{ duration: 0.2 }}
                className={cn('rounded-xl p-3', config.bg, config.text)}
              >
                {icon || config.icon}
              </motion.div>

              {sparklineWithData && (
                <Sparkline
                  data={sparklineWithData.data}
                  color={sparklineWithData.color || CHART_COLORS.primary.DEFAULT}
                  showArea={sparklineWithData.showArea}
                  width={100}
                  height={30}
                />
              )}
            </div>
          </div>

          {extra && <div className="mt-4 border-t border-gray-100 pt-4">{extra}</div>}

          {lastUpdated && (
            <p className="mt-3 text-xs text-gray-400">Updated {formatTimeAgo(lastUpdated)}</p>
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
          'relative cursor-pointer overflow-hidden rounded-2xl border p-6',
          'bg-gradient-to-br',
          config.gradient,
          config.border,
          'transition-shadow hover:shadow-xl',
          className,
        )}
        onClick={onClick}
      >
        {/* Background decoration */}
        <div
          className={cn('absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20', config.dot)}
        />

        <div className="relative">
          <div className="mb-4 flex items-start justify-between">
            <div className={cn('rounded-xl bg-white/60 p-3 backdrop-blur-sm', config.text)}>
              {icon || config.icon}
            </div>
            {trend && (
              <div
                className={cn(
                  'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium',
                  trend.isPositive
                    ? 'bg-success/20 text-success-dark'
                    : 'bg-error/20 text-error-dark',
                )}
              >
                {trend.isPositive ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {formatChangePercent(trend.value / 100, 1, false)}
              </div>
            )}
          </div>

          <h3 className="mb-1 text-sm font-medium text-muted-foreground">{title}</h3>
          <p className="mb-2 text-3xl font-bold text-foreground">{value}</p>

          {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}

          {sparklineWithData && (
            <div className="mt-4">
              <Sparkline
                data={sparklineWithData.data}
                color={sparklineWithData.color || CHART_COLORS.primary.DEFAULT}
                showArea={sparklineWithData.showArea}
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
        className,
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          <div className={cn('rounded-lg p-2', config.bg, config.text)}>{icon || config.icon}</div>
        </div>

        <div className="mb-2 flex items-baseline gap-2">
          <span className="text-2xl font-bold text-foreground">{value}</span>
          {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
        </div>

        {trendDisplay && <div>{trendDisplay}</div>}

        {sparklineWithData && (
          <div className="mt-3">
            <Sparkline
              data={sparklineWithData.data}
              color={sparklineWithData.color || CHART_COLORS.primary.DEFAULT}
              showArea={sparklineWithData.showArea}
              width={120}
              height={30}
            />
          </div>
        )}

        {lastUpdated && <p className="mt-2 text-xs text-gray-400">{formatTimeAgo(lastUpdated)}</p>}
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

  return <div className={cn('grid', gridCols[columns], gapClass, className)}>{children}</div>;
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
    blue: { bg: 'bg-primary/5', border: 'border-primary/20', icon: 'text-primary' },
    green: { bg: 'bg-success/5', border: 'border-success/20', icon: 'text-success' },
    amber: { bg: 'bg-warning/5', border: 'border-warning/20', icon: 'text-warning' },
    purple: { bg: 'bg-primary/5', border: 'border-primary/20', icon: 'text-primary' },
    red: { bg: 'bg-error/5', border: 'border-error/20', icon: 'text-error' },
  }[color];

  return (
    <div className={cn('rounded-xl border p-4', colorConfig.bg, colorConfig.border, className)}>
      <div className="mb-4 flex items-center gap-2">
        {icon && <div className={cn('rounded-lg bg-card/50 p-1.5', colorConfig.icon)}>{icon}</div>}
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
});

// ============================================================================
// Unified Stats Panel Component - 一体化统计面板
// ============================================================================

interface StatItem {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: StatCardColor;
  trend?: TrendData;
  status?: StatCardStatus;
}

interface UnifiedStatsPanelProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  items: StatItem[];
  columns?: 2 | 3 | 4 | 6;
  className?: string;
}

export const UnifiedStatsPanel = memo(function UnifiedStatsPanel({
  title,
  description,
  icon,
  items,
  columns = 4,
  className,
}: UnifiedStatsPanelProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
  };

  return (
    <div className={className}>
      {(title || description) && (
        <div className="mb-4 flex items-center gap-2">
          {icon && <div className="text-primary">{icon}</div>}
          <div>
            {title && <h3 className="text-sm font-semibold text-foreground">{title}</h3>}
            {description && <p className="text-xs text-muted-foreground">{description}</p>}
          </div>
        </div>
      )}
      <div className={cn('grid', gridCols[columns], 'gap-4')}>
        {items.map((item, index) => {
          const config = item.color
            ? colorConfig[item.color]
            : statusConfig[item.status || 'neutral'];

          const trendDisplay = item.trend
            ? (() => {
                const { value: trendValue, isPositive, label } = item.trend;
                const color = isPositive ? 'text-success' : 'text-error';
                const Icon = isPositive ? TrendingUp : TrendingDown;

                return (
                  <div className="flex items-center gap-1">
                    <Icon className={cn('h-3 w-3', color)} />
                    <span className={cn('text-xs font-medium', color)}>
                      {formatChangePercent(trendValue / 100, 1, false)}
                    </span>
                    {label && <span className="text-xs text-muted-foreground">{label}</span>}
                  </div>
                );
              })()
            : null;

          return (
            <div
              key={index}
              className={cn(
                'rounded-xl p-4 transition-all duration-200 hover:bg-card/50',
                index < items.length - 1 &&
                  'border-r border-border/30 last:border-r-0 sm:border-r lg:border-r-0',
                index % columns !== columns - 1 && 'lg:border-r lg:border-border/30',
              )}
            >
              <div className="mb-2 flex items-start justify-between">
                <span className="text-xs font-medium text-muted-foreground">{item.title}</span>
                {item.icon && (
                  <div className={cn('rounded-lg p-1.5', config.bg, config.text)}>{item.icon}</div>
                )}
              </div>
              <div className="mb-1">
                <span className="text-xl font-bold text-foreground">{item.value}</span>
              </div>
              {trendDisplay}
            </div>
          );
        })}
      </div>
    </div>
  );
});

// ============================================================================
// Export
// ============================================================================

export default EnhancedStatCard;
