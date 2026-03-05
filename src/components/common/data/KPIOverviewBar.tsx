'use client';

import { memo } from 'react';

import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

import { useDensity } from '@/components/common/controls/DensityProvider';
import { cn, formatChangePercent } from '@/shared/utils';

export type KPIColor = 'blue' | 'green' | 'amber' | 'red' | 'purple';

export interface KPITrend {
  value: number;
  isPositive: boolean;
}

export interface KPIItem {
  id: string;
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: KPITrend;
  color?: KPIColor;
}

export interface KPIOverviewBarProps {
  items: KPIItem[];
  onItemClick?: (id: string) => void;
  className?: string;
}

const colorConfig: Record<
  KPIColor,
  {
    bg: string;
    border: string;
    text: string;
    iconBg: string;
    gradient: string;
    glow: string;
  }
> = {
  blue: {
    bg: 'bg-primary/5',
    border: 'border-primary/20',
    text: 'text-primary',
    iconBg: 'bg-primary/10',
    gradient: 'from-primary/10 via-primary/5 to-transparent',
    glow: 'shadow-primary/20',
  },
  green: {
    bg: 'bg-success/5',
    border: 'border-success/20',
    text: 'text-success',
    iconBg: 'bg-success/10',
    gradient: 'from-success/10 via-success/5 to-transparent',
    glow: 'shadow-success/20',
  },
  amber: {
    bg: 'bg-warning/5',
    border: 'border-warning/20',
    text: 'text-warning',
    iconBg: 'bg-warning/10',
    gradient: 'from-warning/10 via-warning/5 to-transparent',
    glow: 'shadow-warning/20',
  },
  red: {
    bg: 'bg-error/5',
    border: 'border-error/20',
    text: 'text-error',
    iconBg: 'bg-error/10',
    gradient: 'from-error/10 via-error/5 to-transparent',
    glow: 'shadow-error/20',
  },
  purple: {
    bg: 'bg-purple-500/5',
    border: 'border-purple-500/20',
    text: 'text-purple-500',
    iconBg: 'bg-purple-500/10',
    gradient: 'from-purple-500/10 via-purple-500/5 to-transparent',
    glow: 'shadow-purple-500/20',
  },
};

interface KPICardProps {
  item: KPIItem;
  onItemClick?: (id: string) => void;
  index: number;
}

const KPICard = memo(function KPICard({ item, onItemClick, index }: KPICardProps) {
  const { config: densityConfig } = useDensity();
  const config = colorConfig[item.color || 'blue'];

  const handleClick = () => {
    if (onItemClick) {
      onItemClick(item.id);
    }
  };

  const cardPadding = densityConfig.spacing.item;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: index * 0.08,
        ease: [0.22, 1, 0.36, 1],
      }}
      whileHover={{
        y: -4,
        scale: 1.02,
        transition: { duration: 0.2 },
      }}
      whileTap={{
        scale: 0.98,
        transition: { duration: 0.1 },
      }}
      className={cn(
        'group relative overflow-hidden rounded-xl border backdrop-blur-sm',
        'bg-gradient-to-br',
        config.gradient,
        config.border,
        'transition-all duration-300',
        'hover:shadow-current/10 hover:shadow-lg',
        'active:shadow-sm',
        onItemClick && 'cursor-pointer',
        config.glow,
      )}
      onClick={handleClick}
    >
      <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/5 opacity-0 transition-all duration-300 group-hover:scale-110 group-hover:opacity-100" />
      <div className="bg-white/3 duration-400 absolute -bottom-8 -left-8 h-32 w-32 rounded-full opacity-0 transition-all group-hover:scale-110 group-hover:opacity-100" />

      <div className="relative" style={{ padding: cardPadding }}>
        <div className="mb-3 flex items-start justify-between">
          <motion.div
            whileHover={{ rotate: 5 }}
            className={cn(
              'rounded-lg p-2.5 transition-all duration-300 group-hover:scale-110 group-hover:shadow-md',
              config.iconBg,
              config.text,
            )}
          >
            {item.icon}
          </motion.div>
          {item.trend && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08 + 0.2 }}
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold',
                'shadow-sm',
                item.trend.isPositive
                  ? 'bg-gradient-to-r from-success/20 to-success/10 text-success'
                  : 'bg-gradient-to-r from-error/20 to-error/10 text-error',
              )}
            >
              <motion.div
                animate={{ y: item.trend.isPositive ? [-1, 0, -1] : [1, 0, 1] }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: 'easeInOut',
                }}
              >
                {item.trend.isPositive ? (
                  <ArrowUpRight className="h-3.5 w-3.5" />
                ) : (
                  <ArrowDownRight className="h-3.5 w-3.5" />
                )}
              </motion.div>
              {formatChangePercent(item.trend.value / 100, 0, false)}
            </motion.div>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
            {item.label}
          </p>
          <motion.p
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.08 + 0.1 }}
            className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl"
          >
            {item.value}
          </motion.p>
        </div>

        {onItemClick && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 0, y: 5 }}
            whileHover={{ opacity: 1, y: 0 }}
            className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground/90"
          >
            <span className="font-medium">查看详情</span>
            <motion.div animate={{ x: [0, 2, 0] }} transition={{ duration: 1.5, repeat: Infinity }}>
              <ArrowUpRight className="h-3.5 w-3.5" />
            </motion.div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
});

export const KPIOverviewBar = memo(function KPIOverviewBar({
  items,
  onItemClick,
  className,
}: KPIOverviewBarProps) {
  const { config: densityConfig } = useDensity();
  const gridGap = densityConfig.gap.card;

  return (
    <div
      className={cn(
        'xs:grid-cols-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
        'gap-3 sm:gap-4',
        className,
      )}
      style={{ gap: gridGap }}
    >
      {items.map((item, index) => (
        <KPICard key={item.id} item={item} onItemClick={onItemClick} index={index} />
      ))}
    </div>
  );
});

export default KPIOverviewBar;
