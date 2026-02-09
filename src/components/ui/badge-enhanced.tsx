'use client';

import * as React from 'react';

import { motion } from 'framer-motion';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all duration-200',
  {
    variants: {
      variant: {
        default: 'bg-purple-100 text-purple-700 hover:bg-purple-200',
        secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
        success: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200',
        warning: 'bg-amber-100 text-amber-700 hover:bg-amber-200',
        danger: 'bg-rose-100 text-rose-700 hover:bg-rose-200',
        info: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
        outline: 'border border-purple-200 text-purple-700 hover:bg-purple-50',
        ghost: 'text-purple-700 hover:bg-purple-100',
        // Animated variants
        pulse: 'bg-purple-100 text-purple-700 animate-pulse',
        glow: 'bg-purple-500 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]',
        shimmer: 'relative overflow-hidden bg-purple-100 text-purple-700',
      },
      size: {
        default: 'text-xs',
        sm: 'text-[10px] px-2 py-0.5',
        lg: 'text-sm px-3 py-1',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  animated?: boolean;
  removable?: boolean;
  onRemove?: () => void;
}

function BadgeEnhanced({
  className,
  variant,
  size,
  animated,
  removable,
  onRemove,
  children,
  ...props
}: BadgeProps) {
  return (
    <motion.span
      className={cn(badgeVariants({ variant, size }), className)}
      initial={animated ? { scale: 0, opacity: 0 } : undefined}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      whileHover={{ scale: 1.05 }}
      transition={{ duration: 0.2 }}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {...props as any}
    >
      {/* Shimmer effect for shimmer variant */}
      {variant === 'shimmer' && (
        <span className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent" />
      )}

      <span className="relative z-10">{children}</span>

      {/* Remove button */}
      {removable && (
        <motion.button
          className="-mr-1 ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-black/10"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            onRemove?.();
          }}
          whileHover={{ scale: 1.2 }}
          whileTap={{ scale: 0.9 }}
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </motion.button>
      )}
    </motion.span>
  );
}

// Status Badge with dot indicator
interface StatusBadgeProps {
  status: 'online' | 'offline' | 'warning' | 'error' | 'pending' | 'active' | 'inactive' | 'success';
  text?: string;
  pulse?: boolean;
  className?: string;
  size?: 'sm' | 'default' | 'lg';
}

function StatusBadge({ status, text, pulse = true, className, size = 'default' }: StatusBadgeProps) {
  const statusConfig = {
    online: { color: 'bg-emerald-500', text: 'Online', textColor: 'text-emerald-700', bgColor: 'bg-emerald-100' },
    offline: { color: 'bg-gray-400', text: 'Offline', textColor: 'text-gray-700', bgColor: 'bg-gray-100' },
    warning: { color: 'bg-amber-500', text: 'Warning', textColor: 'text-amber-700', bgColor: 'bg-amber-100' },
    error: { color: 'bg-rose-500', text: 'Error', textColor: 'text-rose-700', bgColor: 'bg-rose-100' },
    pending: { color: 'bg-blue-500', text: 'Pending', textColor: 'text-blue-700', bgColor: 'bg-blue-100' },
    active: { color: 'bg-emerald-500', text: 'Active', textColor: 'text-emerald-700', bgColor: 'bg-emerald-100' },
    inactive: { color: 'bg-gray-400', text: 'Inactive', textColor: 'text-gray-700', bgColor: 'bg-gray-100' },
    success: { color: 'bg-emerald-500', text: 'Success', textColor: 'text-emerald-700', bgColor: 'bg-emerald-100' },
  };

  const config = statusConfig[status];
  const shouldPulse = pulse && (status === 'online' || status === 'active');

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-[10px]',
    default: 'px-2.5 py-0.5 text-xs',
    lg: 'px-3 py-1 text-sm',
  };

  const dotSize = {
    sm: 'h-1.5 w-1.5',
    default: 'h-2 w-2',
    lg: 'h-2.5 w-2.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-medium',
        sizeClasses[size],
        config.bgColor,
        config.textColor,
        className
      )}
    >
      <span className={cn('relative flex', dotSize[size], shouldPulse && 'animate-pulse')}>
        <span className={cn('absolute inset-0 rounded-full opacity-75', config.color, shouldPulse && 'animate-ping')} />
        <span className={cn('relative rounded-full', config.color)} />
      </span>
      {text || config.text}
    </span>
  );
}

// Count Badge with animation
interface CountBadgeProps {
  count: number;
  max?: number;
  className?: string;
}

function CountBadge({ count, max = 99, className }: CountBadgeProps) {
  const displayCount = count > max ? `${max}+` : count;

  return (
    <motion.span
      key={count}
      className={cn(
        'inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white',
        className
      )}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 15 }}
    >
      {displayCount}
    </motion.span>
  );
}

// Progress Badge
interface ProgressBadgeProps {
  progress: number;
  className?: string;
}

function ProgressBadge({ progress, className }: ProgressBadgeProps) {
  const getColor = (p: number) => {
    if (p >= 80) return 'bg-emerald-500';
    if (p >= 50) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium', className)}>
      <span className="relative h-2 w-8 overflow-hidden rounded-full bg-gray-200">
        <motion.span
          className={cn('absolute inset-y-0 left-0 rounded-full', getColor(progress))}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </span>
      <span className="text-gray-600">{progress}%</span>
    </span>
  );
}

export { BadgeEnhanced, StatusBadge, CountBadge, ProgressBadge, badgeVariants };
