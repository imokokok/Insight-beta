import { memo } from 'react';

import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

import { Sparkline, CHART_COLORS } from '@/components/charts';
import { cn, formatChangePercent } from '@/shared/utils';

import type { StatCardBaseProps, StatusConfig, SparklineData } from './types';

interface StatCardInteractiveProps extends StatCardBaseProps {
  config: StatusConfig;
}

export const StatCardInteractive = memo(function StatCardInteractive({
  title,
  value,
  subtitle,
  icon,
  trend,
  sparkline,
  sparklineData,
  className,
  onClick,
  config,
}: StatCardInteractiveProps) {
  const sparklineWithData: SparklineData | undefined =
    sparkline || (sparklineData ? { data: sparklineData } : undefined);

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
});
