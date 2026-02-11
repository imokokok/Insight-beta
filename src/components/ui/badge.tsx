import * as React from 'react';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';
import { STATUS_THEME_COLORS, type StatusType } from '@/lib/types/common';

export type { StatusType };

// ============================================================================
// 基础 Badge 变体
// ============================================================================

const badgeVariants = cva(
  'focus:ring-ring inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/80 border-transparent',
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 border-transparent',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/80 border-transparent',
        outline: 'text-foreground',
        // 语义化变体
        success: 'border-transparent bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
        warning: 'border-transparent bg-amber-100 text-amber-700 hover:bg-amber-200',
        danger: 'border-transparent bg-rose-100 text-rose-700 hover:bg-rose-200',
        info: 'border-transparent bg-blue-100 text-blue-700 hover:bg-blue-200',
        // 特殊效果
        ghost: 'border-transparent text-purple-700 hover:bg-purple-100',
        pulse: 'animate-pulse border-transparent bg-purple-100 text-purple-700',
        glow: 'border-transparent bg-purple-500 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]',
      },
      size: {
        default: 'text-xs',
        sm: 'px-2 py-0.5 text-[10px]',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

interface BaseBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.memo(function Badge({ className, variant, size, ...props }: BaseBadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
});

// ============================================================================
// StatusBadge - 状态徽章
// ============================================================================

interface StatusBadgeProps {
  status: StatusType;
  text?: string;
  showIcon?: boolean;
  pulse?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<
  string,
  {
    label: string;
    dotColor: string;
    bgColor: string;
    textColor: string;
  }
> = STATUS_THEME_COLORS;

const defaultStatusConfig = statusConfig.unknown;

const StatusBadge = React.memo(function StatusBadge({
  status,
  text,
  pulse = true,
  className,
  size = 'md',
}: StatusBadgeProps) {
  const config = statusConfig[status] || defaultStatusConfig;
  const shouldPulse = pulse && (status === 'online' || status === 'active');

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    md: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  const dotSize = {
    sm: 'h-1.5 w-1.5',
    md: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-medium',
        sizeClasses[size],
        config.bgColor,
        config.textColor,
        className,
      )}
    >
      <span className={cn('relative flex', dotSize[size], shouldPulse && 'animate-pulse')}>
        <span
          className={cn(
            'absolute inset-0 rounded-full opacity-75',
            config.dotColor,
            shouldPulse && 'animate-ping',
          )}
        />
        <span className={cn('relative rounded-full', config.dotColor)} />
      </span>
      {text || config.label}
    </span>
  );
});

// ============================================================================
// CountBadge - 计数徽章
// ============================================================================

interface CountBadgeProps {
  count: number;
  max?: number;
  className?: string;
}

const CountBadge = React.memo(function CountBadge({ count, max = 99, className }: CountBadgeProps) {
  const displayCount = count > max ? `${max}+` : count;

  return (
    <span
      className={cn(
        'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white',
        className,
      )}
    >
      {displayCount}
    </span>
  );
});

// ============================================================================
// ProgressBadge - 进度徽章
// ============================================================================

interface ProgressBadgeProps {
  progress: number;
  className?: string;
}

const ProgressBadge = React.memo(function ProgressBadge({
  progress,
  className,
}: ProgressBadgeProps) {
  const getColor = (p: number) => {
    if (p >= 80) return 'bg-emerald-500';
    if (p >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
    >
      <span className="relative h-2 w-8 overflow-hidden rounded-full bg-gray-200">
        <span
          className={cn(
            'absolute inset-y-0 left-0 rounded-full transition-all duration-500',
            getColor(progress),
          )}
          style={{ width: `${progress}%` }}
        />
      </span>
      <span className="text-gray-600">{progress}%</span>
    </span>
  );
});

// ============================================================================
// 导出
// ============================================================================

export { Badge, StatusBadge, CountBadge, ProgressBadge, badgeVariants };
export type { BaseBadgeProps as BadgeProps, StatusBadgeProps, CountBadgeProps, ProgressBadgeProps };

export { StatusBadge as default };
