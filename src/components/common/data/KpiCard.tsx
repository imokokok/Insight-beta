'use client';

import { memo } from 'react';

import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import type { KpiCardData, KpiTrendDirection, KpiStatus } from '@/types/shared/kpi';
import { DEFAULT_KPI_DATA, TREND_COLORS, STATUS_COLORS } from '@/types/shared/kpi';

import { MiniTrend } from './MiniTrend';

export { DEFAULT_KPI_DATA, TREND_COLORS, STATUS_COLORS };
export type { KpiCardData, KpiStatus };
export type { KpiTrendDirection as TrendDirection };

const TREND_ICONS: Record<KpiTrendDirection, React.ReactNode> = {
  up: <TrendingUp className="h-4 w-4" />,
  down: <TrendingDown className="h-4 w-4" />,
  neutral: <Minus className="h-4 w-4" />,
};

interface KpiCardProps {
  data: KpiCardData;
  compact?: boolean;
  index?: number;
}

const KpiCardComponent = function KpiCard({ data, compact = true, index = 0 }: KpiCardProps) {
  const { t } = useI18n();
  const {
    value,
    label,
    trend = 'neutral',
    changePercent,
    status = 'neutral',
    trendData,
    showTrend,
    metadata,
  } = data;
  const colors = STATUS_COLORS[status] ?? STATUS_COLORS.neutral!;

  const trendColor = trend === 'up' ? 'success' : trend === 'down' ? 'error' : 'neutral';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        delay: index * 0.06,
        ease: 'easeOut',
      }}
      className={cn(
        'flex flex-col',
        'transition-all duration-300',
        'hover:translate-y-[-2px]',
        compact ? 'px-3 py-3 sm:px-4 sm:py-4' : 'px-4 py-4 sm:px-5 sm:py-5',
      )}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * 0.06 + 0.1 }}
          className={cn(
            'font-semibold tracking-wide text-muted-foreground/80',
            compact ? 'text-[11px] sm:text-xs' : 'text-xs sm:text-sm',
          )}
        >
          {label}
        </motion.span>
        {trend && trend !== 'neutral' && (
          <motion.span
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.06 + 0.15 }}
            className={cn(
              'flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold sm:text-xs',
              'shadow-sm',
              TREND_COLORS[trend],
              trend === 'up' ? 'bg-success/10' : 'bg-error/10',
            )}
          >
            <motion.div
              animate={{
                y: trend === 'up' ? [-2, 0, -2] : [2, 0, 2],
              }}
              transition={{
                duration: 1.8,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
            >
              {TREND_ICONS[trend]}
            </motion.div>
            {changePercent !== undefined && `${Math.abs(changePercent)}%`}
          </motion.span>
        )}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.06 + 0.12 }}
        className="mb-2 flex items-baseline gap-2"
      >
        <span
          className={cn(
            'font-mono font-black tracking-tight',
            colors.text,
            compact ? 'text-2xl sm:text-3xl md:text-4xl' : 'text-3xl sm:text-4xl md:text-5xl',
          )}
        >
          {value}
        </span>
        {showTrend && trendData && trendData.length >= 2 && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            transition={{ delay: index * 0.06 + 0.18 }}
            className="hidden sm:block"
          >
            <MiniTrend data={trendData} color={trendColor} mode="line" />
          </motion.div>
        )}
      </motion.div>

      <div className="space-y-1">
        {changePercent !== undefined && trend === 'neutral' && (
          <motion.div
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 + 0.2 }}
            className={cn('text-[11px] font-medium sm:text-xs', TREND_COLORS[trend])}
          >
            {t('common.kpi.comparedToLastPeriod')} {changePercent > 0 ? '+' : ''}
            {changePercent}%
          </motion.div>
        )}

        {metadata?.volatility && (
          <motion.div
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 + 0.22 }}
            className={cn('text-[11px] text-muted-foreground/70 sm:text-xs')}
          >
            波动率：{metadata.volatility.toFixed(2)}%
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export const KpiCard = memo(KpiCardComponent);

interface KpiGridProps {
  kpis: KpiCardData[];
  labels?: string[];
  loading?: boolean;
  compact?: boolean;
  className?: string;
}

export function KpiGrid({
  kpis,
  labels,
  loading = false,
  compact = true,
  className,
}: KpiGridProps) {
  if (loading) {
    return (
      <div
        className={cn(
          'grid gap-4 sm:gap-5 md:gap-6',
          'xs:grid-cols-2 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
          className,
        )}
      >
        {[1, 2, 3, 4].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="relative flex flex-col overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-background via-muted/10 to-background"
          >
            <div className="via-primary/8 absolute inset-0 animate-pulse bg-gradient-to-r from-transparent to-transparent" />
            <div className="relative z-10 mb-2 flex items-center justify-between px-4 pt-4">
              <div className="h-3 w-20 animate-[pulse_1.5s_ease-in-out_infinite] rounded bg-primary/25" />
              <div className="h-4 w-12 animate-[pulse_1.5s_ease-in-out_infinite] rounded bg-primary/20 [animation-delay:0.2s]" />
            </div>
            <div className="relative z-10 mt-2 px-4 pb-4">
              <div className="h-7 w-28 animate-[pulse_1.5s_ease-in-out_infinite] rounded bg-primary/30 [animation-delay:0.1s]" />
            </div>
          </motion.div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className={cn(
        'xs:grid-cols-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        'gap-4 sm:gap-5 md:gap-6',
        className,
      )}
    >
      {kpis.map((kpi, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.06 }}
          className="overflow-hidden rounded-xl border border-border/40 bg-gradient-to-br from-background via-muted/5 to-background transition-shadow duration-300 hover:shadow-md"
        >
          <KpiCard
            index={index}
            data={{ ...kpi, label: kpi.label || labels?.[index] || '' }}
            compact={compact}
          />
        </motion.div>
      ))}
    </motion.div>
  );
}
