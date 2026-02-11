'use client';

import { useMemo } from 'react';

import { AlertTriangle, Clock, Database, RefreshCw } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

export type FallbackDataStatus = 'fresh' | 'stale' | 'circuit-breaker' | 'error';

export interface CircuitBreakerFallbackIndicatorProps {
  /** 数据状态 */
  status: FallbackDataStatus;
  /** 缓存时间 */
  cachedAt?: Date | null;
  /** 熔断器打开时间 */
  circuitBreakerOpenedAt?: Date | null;
  /** 预计恢复时间 */
  estimatedRecoveryTime?: Date | null;
  /** 错误信息 */
  errorMessage?: string;
  /** 是否显示刷新按钮 */
  showRefresh?: boolean;
  /** 刷新回调 */
  onRefresh?: () => void;
  /** 自定义类名 */
  className?: string;
  /** 变体样式 */
  variant?: 'badge' | 'banner' | 'inline';
}

/**
 * 熔断回退数据指示器
 * 
 * 当熔断器打开时使用过期缓存数据时显示此标识
 * 优化数据可观测性，让用户知道数据可能过期
 * 
 * @example
 * <CircuitBreakerFallbackIndicator 
 *   status="circuit-breaker"
 *   cachedAt={new Date('2024-01-01')}
 *   onRefresh={() => refetch()}
 * />
 */
export function CircuitBreakerFallbackIndicator({
  status,
  cachedAt,
  circuitBreakerOpenedAt,
  estimatedRecoveryTime,
  errorMessage,
  showRefresh = true,
  onRefresh,
  className,
  variant = 'badge',
}: CircuitBreakerFallbackIndicatorProps) {
  const { t } = useI18n();

  const config = useMemo(() => {
    switch (status) {
      case 'circuit-breaker':
        return {
          icon: AlertTriangle,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          badgeColor: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
          label: t('circuitBreaker.fallback.staleData'),
          description: t('circuitBreaker.fallback.staleDataDesc'),
          tooltipTitle: t('circuitBreaker.fallback.title'),
        };
      case 'stale':
        return {
          icon: Clock,
          color: 'text-amber-600',
          bgColor: 'bg-amber-50',
          borderColor: 'border-amber-200',
          badgeColor: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
          label: t('circuitBreaker.fallback.stale'),
          description: t('circuitBreaker.fallback.staleDesc'),
          tooltipTitle: t('circuitBreaker.fallback.staleTitle'),
        };
      case 'error':
        return {
          icon: AlertTriangle,
          color: 'text-rose-600',
          bgColor: 'bg-rose-50',
          borderColor: 'border-rose-200',
          badgeColor: 'bg-rose-100 text-rose-800 hover:bg-rose-100',
          label: t('circuitBreaker.fallback.error'),
          description: errorMessage || t('circuitBreaker.fallback.errorDesc'),
          tooltipTitle: t('circuitBreaker.fallback.errorTitle'),
        };
      default:
        return {
          icon: Database,
          color: 'text-emerald-600',
          bgColor: 'bg-emerald-50',
          borderColor: 'border-emerald-200',
          badgeColor: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
          label: t('circuitBreaker.fallback.fresh'),
          description: t('circuitBreaker.fallback.freshDesc'),
          tooltipTitle: t('circuitBreaker.fallback.freshTitle'),
        };
    }
  }, [status, errorMessage, t]);

  const formatTime = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const cachedDuration = useMemo(() => {
    if (!cachedAt) return null;
    const seconds = Math.floor((Date.now() - cachedAt.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  }, [cachedAt]);

  const Icon = config.icon;

  // Badge 变体
  if (variant === 'badge') {
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="secondary"
              className={cn(
                'cursor-help gap-1.5 px-2 py-1 font-medium',
                config.badgeColor,
                className
              )}
            >
              <Icon className="h-3 w-3" />
              <span>{config.label}</span>
              {cachedDuration && (
                <span className="opacity-75">({cachedDuration})</span>
              )}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-sm p-3">
            <div className="space-y-2">
              <p className="font-semibold">{config.tooltipTitle}</p>
              <p className="text-muted-foreground text-sm">{config.description}</p>
              {cachedAt && (
                <p className="text-xs">
                  <span className="text-muted-foreground">{t('circuitBreaker.fallback.cachedAt')}:</span>{' '}
                  {formatTime(cachedAt)}
                </p>
              )}
              {circuitBreakerOpenedAt && (
                <p className="text-xs">
                  <span className="text-muted-foreground">{t('circuitBreaker.fallback.circuitOpenedAt')}:</span>{' '}
                  {formatTime(circuitBreakerOpenedAt)}
                </p>
              )}
              {estimatedRecoveryTime && (
                <p className="text-xs">
                  <span className="text-muted-foreground">{t('circuitBreaker.fallback.estimatedRecovery')}:</span>{' '}
                  {formatTime(estimatedRecoveryTime)}
                </p>
              )}
              {showRefresh && onRefresh && (
                <button
                  onClick={onRefresh}
                  className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  <RefreshCw className="h-3 w-3" />
                  {t('circuitBreaker.fallback.retry')}
                </button>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Banner 变体
  if (variant === 'banner') {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-4 rounded-lg border p-3',
          config.bgColor,
          config.borderColor,
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('rounded-full p-2', config.bgColor)}>
            <Icon className={cn('h-4 w-4', config.color)} />
          </div>
          <div>
            <p className={cn('font-medium', config.color)}>{config.label}</p>
            <p className="text-muted-foreground text-sm">{config.description}</p>
            {cachedAt && (
              <p className="text-muted-foreground mt-1 text-xs">
                {t('circuitBreaker.fallback.cachedAt')}: {formatTime(cachedAt)}
                {cachedDuration && ` (${cachedDuration} ${t('circuitBreaker.fallback.ago')})`}
              </p>
            )}
          </div>
        </div>
        {showRefresh && onRefresh && (
          <button
            onClick={onRefresh}
            className={cn(
              'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              config.bgColor,
              config.color,
              'hover:opacity-80'
            )}
          >
            <RefreshCw className="h-4 w-4" />
            {t('circuitBreaker.fallback.retry')}
          </button>
        )}
      </div>
    );
  }

  // Inline 变体
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', config.color, className)}>
      <Icon className="h-4 w-4" />
      <span>{config.label}</span>
      {cachedDuration && (
        <span className="text-muted-foreground text-xs">({cachedDuration})</span>
      )}
    </span>
  );
}

/**
 * 数据新鲜度与熔断状态组合指示器
 */
export interface DataFreshnessWithCircuitBreakerProps {
  /** 数据新鲜度状态 */
  freshnessStatus: 'fresh' | 'warning' | 'stale' | 'expired';
  /** 熔断器状态 */
  circuitBreakerStatus?: FallbackDataStatus;
  /** 最后更新时间 */
  lastUpdated?: Date | null;
  /** 缓存时间 */
  cachedAt?: Date | null;
  /** 是否显示详情 */
  showDetails?: boolean;
  className?: string;
}

export function DataFreshnessWithCircuitBreaker({
  freshnessStatus,
  circuitBreakerStatus,
  lastUpdated,
  cachedAt,
  showDetails = true,
  className,
}: DataFreshnessWithCircuitBreakerProps) {
  const { t } = useI18n();

  // 如果熔断器打开，优先显示熔断状态
  if (circuitBreakerStatus && circuitBreakerStatus !== 'fresh') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <CircuitBreakerFallbackIndicator
          status={circuitBreakerStatus}
          cachedAt={cachedAt}
          variant="badge"
        />
        {showDetails && lastUpdated && (
          <span className="text-muted-foreground text-xs">
            {t('circuitBreaker.fallback.originalTime')}: {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>
    );
  }

  // 否则显示数据新鲜度
  const config = {
    fresh: { color: 'text-emerald-600', bgColor: 'bg-emerald-50', label: t('freshness.fresh') },
    warning: { color: 'text-amber-600', bgColor: 'bg-amber-50', label: t('freshness.warning') },
    stale: { color: 'text-orange-600', bgColor: 'bg-orange-50', label: t('freshness.stale') },
    expired: { color: 'text-rose-600', bgColor: 'bg-rose-50', label: t('freshness.expired') },
  }[freshnessStatus];

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Badge
        variant="secondary"
        className={cn('gap-1', config.bgColor, config.color)}
      >
        <Database className="h-3 w-3" />
        {config.label}
      </Badge>
      {showDetails && lastUpdated && (
        <span className="text-muted-foreground text-xs">
          {lastUpdated.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}
