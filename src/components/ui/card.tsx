import React from 'react';

import { motion } from 'framer-motion';

import { cn } from '@/shared/utils';

// ==================== 基础 Card 组件 ====================

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-2xl border border-border/50 bg-card text-foreground shadow-sm backdrop-blur-xl transition-all hover:bg-card/80 hover:shadow-md',
        className,
      )}
      {...props}
    />
  ),
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  ),
);
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, children, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn(
        'text-lg font-semibold leading-none tracking-tight text-foreground',
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  ),
);
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  ),
);
CardContent.displayName = 'CardContent';

// ==================== 增强版 Card 组件 ====================

import type { HTMLMotionProps } from 'framer-motion';

interface CardEnhancedProps extends HTMLMotionProps<'div'> {
  hover?: boolean;
  clickable?: boolean;
  gradient?: boolean;
  glow?: boolean;
}

const CardEnhanced = React.forwardRef<HTMLDivElement, CardEnhancedProps>(
  ({ className, hover = true, clickable, gradient, glow, children, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          'relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 backdrop-blur-xl',
          'transition-all duration-300',
          hover &&
            'hover:border-primary/30 hover:bg-card/80 hover:shadow-xl hover:shadow-primary/10',
          clickable && 'cursor-pointer active:scale-[0.98]',
          gradient && 'bg-gradient-to-br from-card via-primary-5/10 to-blue-5/10',
          glow && 'shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30',
          className,
        )}
        whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
        whileTap={clickable ? { scale: 0.98 } : undefined}
        {...props}
      >
        {/* Shimmer effect on hover */}
        {hover && (
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:animate-shimmer group-hover:opacity-100" />
        )}

        {/* Gradient border effect */}
        {gradient && (
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/10 via-transparent to-blue-500/10 opacity-0 transition-opacity duration-300 hover:opacity-100" />
        )}

        <div className="relative z-10">{children as React.ReactNode}</div>
      </motion.div>
    );
  },
);
CardEnhanced.displayName = 'CardEnhanced';

// ==================== 交互式统计卡片 ====================

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

function InteractiveStatCard({
  title,
  value,
  change,
  icon,
  trend = 'neutral',
  loading,
  onClick,
  className,
}: StatCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const trendColors = {
    up: 'text-emerald-500',
    down: 'text-rose-500',
    neutral: 'text-muted-foreground',
  };

  const trendIcons = {
    up: '↑',
    down: '↓',
    neutral: '→',
  };

  return (
    <motion.div
      className={cn(
        'relative cursor-pointer overflow-hidden rounded-2xl border border-border/50 bg-card p-6 backdrop-blur-xl',
        'transition-all duration-300',
        'hover:border-primary/30 hover:bg-card/80 hover:shadow-lg hover:shadow-primary/10',
        className,
      )}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      onClick={onClick}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Background glow on hover */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-br from-primary/5 to-blue-500/5"
        initial={{ opacity: 0 }}
        animate={{ opacity: isHovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      />

      <div className="relative z-10">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground">{title}</span>
          {icon && (
            <motion.div
              className="rounded-xl bg-primary/10 p-2 text-primary"
              animate={{ scale: isHovered ? 1.1 : 1, rotate: isHovered ? 5 : 0 }}
              transition={{ duration: 0.2 }}
            >
              {icon}
            </motion.div>
          )}
        </div>

        {/* Value */}
        <div className="mb-2">
          {loading ? (
            <div className="h-8 w-24 animate-pulse rounded bg-primary/20" />
          ) : (
            <motion.span
              className="text-3xl font-bold text-foreground"
              key={value}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {value}
            </motion.span>
          )}
        </div>

        {/* Change indicator */}
        {change !== undefined && !loading && (
          <motion.div
            className={cn('flex items-center gap-1 text-sm font-medium', trendColors[trend])}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <span>{trendIcons[trend]}</span>
            <span>{Math.abs(change)}%</span>
            <span className="text-muted-foreground">vs last period</span>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}

// ==================== 可展开卡片 ====================

interface ExpandableCardProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
}

function ExpandableCard({
  title,
  children,
  defaultExpanded = false,
  className,
}: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  return (
    <CardEnhanced className={className}>
      <button
        className="flex w-full items-center justify-between"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-primary"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </button>

      <motion.div
        initial={false}
        animate={{
          height: isExpanded ? 'auto' : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="overflow-hidden"
      >
        <div className="pt-4">{children}</div>
      </motion.div>
    </CardEnhanced>
  );
}

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardEnhanced,
  InteractiveStatCard,
  ExpandableCard,
};
