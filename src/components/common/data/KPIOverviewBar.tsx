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
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -2, scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className={cn(
        'group relative overflow-hidden rounded-lg border backdrop-blur-sm',
        'bg-gradient-to-br',
        config.gradient,
        config.border,
        'transition-all duration-200',
        'hover:shadow-md',
        onItemClick && 'cursor-pointer',
        config.glow,
      )}
      onClick={handleClick}
    >
      <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-white/5 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />

      <div className="relative" style={{ padding: cardPadding }}>
        <div className="mb-2 flex items-start justify-between">
          <div
            className={cn(
              'rounded-md p-2 transition-transform duration-200 group-hover:scale-105',
              config.iconBg,
              config.text,
            )}
          >
            {item.icon}
          </div>
          {item.trend && (
            <div
              className={cn(
                'flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                item.trend.isPositive ? 'bg-success/15 text-success' : 'bg-error/15 text-error',
              )}
            >
              {item.trend.isPositive ? (
                <ArrowUpRight className="h-2.5 w-2.5" />
              ) : (
                <ArrowDownRight className="h-2.5 w-2.5" />
              )}
              {formatChangePercent(item.trend.value / 100, 0, false)}
            </div>
          )}
        </div>

        <div className="space-y-0.5">
          <p className="text-[11px] font-medium text-muted-foreground">{item.label}</p>
          <p className="text-xl font-bold text-foreground">{item.value}</p>
        </div>

        {onItemClick && (
          <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            <span>查看详情</span>
            <ArrowUpRight className="h-2.5 w-2.5" />
          </div>
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
      className={cn('grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4', className)}
      style={{ gap: gridGap }}
    >
      {items.map((item, index) => (
        <KPICard key={item.id} item={item} onItemClick={onItemClick} index={index} />
      ))}
    </div>
  );
});

export default KPIOverviewBar;
