'use client';

import { memo } from 'react';

import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

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
  const config = colorConfig[item.color || 'blue'];

  const handleClick = () => {
    if (onItemClick) {
      onItemClick(item.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'group relative overflow-hidden rounded-xl border backdrop-blur-sm',
        'bg-gradient-to-br',
        config.gradient,
        config.border,
        'transition-all duration-300',
        'hover:shadow-lg',
        onItemClick && 'cursor-pointer',
        config.glow,
      )}
      onClick={handleClick}
    >
      <div className="absolute -right-4 -top-4 h-20 w-20 rounded-full bg-white/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

      <div className="relative p-4">
        <div className="mb-3 flex items-start justify-between">
          <div
            className={cn(
              'rounded-lg p-2.5 transition-transform duration-300 group-hover:scale-110',
              config.iconBg,
              config.text,
            )}
          >
            {item.icon}
          </div>
          {item.trend && (
            <div
              className={cn(
                'flex items-center gap-0.5 rounded-full px-2 py-1 text-xs font-medium',
                item.trend.isPositive ? 'bg-success/15 text-success' : 'bg-error/15 text-error',
              )}
            >
              {item.trend.isPositive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {formatChangePercent(item.trend.value / 100, 0, false)}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
          <p className="text-2xl font-bold text-foreground">{item.value}</p>
        </div>

        {onItemClick && (
          <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <span>查看详情</span>
            <ArrowUpRight className="h-3 w-3" />
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
  return (
    <div className={cn('grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4', className)}>
      {items.map((item, index) => (
        <KPICard key={item.id} item={item} onItemClick={onItemClick} index={index} />
      ))}
    </div>
  );
});

export default KPIOverviewBar;
