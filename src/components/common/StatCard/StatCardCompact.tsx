import { memo, useMemo } from 'react';

import { motion } from 'framer-motion';

import { cn, formatChangePercent } from '@/shared/utils';

import { TrendingUp, TrendingDown } from './config';

import type { StatCardBaseProps, StatusConfig } from './types';

interface StatCardCompactProps extends StatCardBaseProps {
  config: StatusConfig;
}

export const StatCardCompact = memo(function StatCardCompact({
  title,
  value,
  icon,
  trend,
  className,
  onClick,
  config,
}: StatCardCompactProps) {
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
});
