/**
 * Enhanced Skeleton Components
 *
 * 增强版骨架屏组件
 * - 动画效果
 * - 品牌一致性
 * - 多种预设场景
 */

'use client';

import type { CSSProperties, ReactNode } from 'react';

import { motion } from 'framer-motion';

import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
  shimmer?: boolean;
  animated?: boolean;
}

interface SkeletonContainerProps {
  children: ReactNode;
  className?: string;
  animated?: boolean;
}

// ============================================================================
// Animation Variants
// ============================================================================

import type { Variants } from 'framer-motion';

const shimmerAnimation: Variants = {
  initial: { x: '-100%' },
  animate: {
    x: '100%',
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'linear',
    },
  },
};

const pulseAnimation: Variants = {
  initial: { opacity: 0.4 },
  animate: {
    opacity: [0.4, 0.8, 0.4],
    transition: {
      repeat: Infinity,
      duration: 1.5,
      ease: 'easeInOut',
    },
  },
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
};

// ============================================================================
// Base Skeleton
// ============================================================================

export function Skeleton({
  className,
  style,
  shimmer = true,
  animated = true,
}: SkeletonProps) {
  const Wrapper = animated ? motion.div : 'div';

  if (shimmer) {
    return (
      <Wrapper
        className={cn(
          'relative overflow-hidden rounded-md bg-gray-200',
          className,
        )}
        style={style}
        {...(animated
          ? {
              initial: 'initial',
              animate: 'animate',
              variants: pulseAnimation,
            }
          : {})}
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent"
          variants={shimmerAnimation}
        />
      </Wrapper>
    );
  }

  return (
    <div
      className={cn(
        'animate-pulse rounded-md bg-gray-200 dark:bg-gray-800',
        className,
      )}
      style={style}
    />
  );
}

// ============================================================================
// Skeleton Container
// ============================================================================

function SkeletonContainer({
  children,
  className,
  animated = true,
}: SkeletonContainerProps) {
  const Wrapper = animated ? motion.div : 'div';

  return (
    <Wrapper
      className={cn('space-y-4', className)}
      {...(animated
        ? {
            initial: 'hidden',
            animate: 'visible',
            variants: containerVariants,
          }
        : {})}
    >
      {children}
    </Wrapper>
  );
}

// ============================================================================
// Card Skeleton
// ============================================================================

export function CardSkeleton({
  className,
  header = true,
  content = true,
  footer = false,
}: SkeletonProps & {
  header?: boolean;
  content?: boolean;
  footer?: boolean;
}) {
  return (
    <motion.div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-4',
        className,
      )}
      variants={itemVariants}
    >
      {header && (
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      )}
      {content && (
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      )}
      {footer && (
        <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      )}
    </motion.div>
  );
}

// ============================================================================
// Stat Card Skeleton
// ============================================================================

export function StatCardSkeleton({
  className,
  showTrend = true,
}: SkeletonProps & { showTrend?: boolean }) {
  return (
    <motion.div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-4',
        className,
      )}
      variants={itemVariants}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-2 h-8 w-24" />
          {showTrend && <Skeleton className="mt-2 h-3 w-16" />}
        </div>
        <Skeleton className="h-10 w-10 rounded-xl" />
      </div>
    </motion.div>
  );
}

// ============================================================================
// Chart Skeleton
// ============================================================================

export function ChartSkeleton({
  className,
  height = 200,
  showHeader = true,
}: SkeletonProps & { height?: number; showHeader?: boolean }) {
  return (
    <motion.div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-4',
        className,
      )}
      variants={itemVariants}
    >
      {showHeader && (
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      )}
      <div
        className="flex items-end gap-2"
        style={{ height }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{
              height: `${Math.random() * 60 + 20}%`,
              opacity: 0.3 + Math.random() * 0.4,
            }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================================
// List Item Skeleton
// ============================================================================

export function ListItemSkeleton({
  className,
  showAvatar = true,
  showAction = true,
  lines = 2,
}: SkeletonProps & {
  showAvatar?: boolean;
  showAction?: boolean;
  lines?: number;
}) {
  return (
    <motion.div
      className={cn('flex items-center gap-4 py-3', className)}
      variants={itemVariants}
    >
      {showAvatar && (
        <Skeleton className="h-10 w-10 rounded-full" />
      )}
      <div className="flex-1 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-4"
            style={{ width: i === 0 ? '40%' : '60%' }}
          />
        ))}
      </div>
      {showAction && <Skeleton className="h-8 w-20" />}
    </motion.div>
  );
}

// ============================================================================
// Table Skeleton
// ============================================================================

export function TableSkeleton({
  className,
  rows = 5,
  columns = 4,
  showHeader = true,
}: SkeletonProps & {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}) {
  return (
    <motion.div
      className={cn('rounded-xl border border-gray-200 bg-white', className)}
      variants={itemVariants}
    >
      {showHeader && (
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
        </div>
      )}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="px-4 py-3">
            <div className="flex gap-4">
              {Array.from({ length: columns }).map((_, colIndex) => (
                <Skeleton
                  key={colIndex}
                  className="h-4 flex-1"
                  style={{
                    width: `${Math.random() * 20 + 60}%`,
                  }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ============================================================================
// Text Skeleton
// ============================================================================

export function TextSkeleton({
  className,
  lines = 3,
  lineHeight = 16,
  lastLineWidth = '60%',
}: SkeletonProps & {
  lines?: number;
  lineHeight?: number;
  lastLineWidth?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <motion.div key={i} variants={itemVariants}>
          <Skeleton
            className="h-4"
            style={{
              height: lineHeight,
              width: i === lines - 1 ? lastLineWidth : '100%',
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

// ============================================================================
// Avatar Skeleton
// ============================================================================

export function AvatarSkeleton({
  size = 'md',
  className,
}: SkeletonProps & {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}) {
  const sizeClasses = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  };

  return (
    <motion.div variants={itemVariants}>
      <Skeleton className={cn('rounded-full', sizeClasses[size], className)} />
    </motion.div>
  );
}

// ============================================================================
// Button Skeleton
// ============================================================================

export function ButtonSkeleton({
  className,
  width = 96,
}: SkeletonProps & { width?: number }) {
  return (
    <motion.div variants={itemVariants}>
      <Skeleton
        className={cn('h-10 rounded-md', className)}
        style={{ width }}
      />
    </motion.div>
  );
}

// ============================================================================
// Page Skeleton
// ============================================================================

export function PageSkeleton({ className }: SkeletonProps) {
  return (
    <SkeletonContainer className={cn('space-y-6 p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Stats Row */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        <ChartSkeleton />
        <ChartSkeleton />
      </div>

      {/* List */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <Skeleton className="mb-4 h-6 w-1/4" />
        <div className="space-y-2">
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
      </div>
    </SkeletonContainer>
  );
}

// ============================================================================
// Dashboard Skeleton
// ============================================================================

export function DashboardSkeleton({ className }: SkeletonProps) {
  return (
    <SkeletonContainer className={cn('space-y-6 p-4 lg:p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 lg:gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ChartSkeleton height={320} />
        </div>
        <ChartSkeleton height={320} />
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton height={256} />
        <ChartSkeleton height={256} />
      </div>
    </SkeletonContainer>
  );
}

// ============================================================================
// Price Card Skeleton
// ============================================================================

export function PriceCardSkeleton({ className }: SkeletonProps) {
  return (
    <motion.div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-4',
        className,
      )}
      variants={itemVariants}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-4 w-20" />
            <Skeleton className="mt-1 h-3 w-12" />
          </div>
        </div>
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="mt-4 flex items-end justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-16" />
      </div>
    </motion.div>
  );
}

// ============================================================================
// Protocol Card Skeleton
// ============================================================================

export function ProtocolCardSkeleton({ className }: SkeletonProps) {
  return (
    <motion.div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-4',
        className,
      )}
      variants={itemVariants}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="h-12 w-12 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="mt-1 h-3 w-16" />
        </div>
        <Skeleton className="h-8 w-20 rounded-full" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-4">
        <div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="mt-1 h-4 w-3/4" />
        </div>
        <div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="mt-1 h-4 w-3/4" />
        </div>
        <div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="mt-1 h-4 w-3/4" />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Alert Card Skeleton
// ============================================================================

export function AlertCardSkeleton({ className }: SkeletonProps) {
  return (
    <motion.div
      className={cn(
        'rounded-xl border border-gray-200 bg-white p-4',
        className,
      )}
      variants={itemVariants}
    >
      <div className="flex items-start gap-3">
        <Skeleton className="h-5 w-5 rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================================================
// Stats Grid Skeleton
// ============================================================================

export function StatsGridSkeleton({
  className,
  count = 4,
}: SkeletonProps & { count?: number }) {
  return (
    <div
      className={cn(
        'grid gap-4',
        count === 2 && 'grid-cols-2',
        count === 3 && 'grid-cols-3',
        count === 4 && 'grid-cols-2 lg:grid-cols-4',
        count === 6 && 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6',
        className,
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <StatCardSkeleton key={i} />
      ))}
    </div>
  );
}

// ============================================================================
// Loading Spinner
// ============================================================================

export function LoadingSpinner({
  className,
  size = 'md',
}: SkeletonProps & { size?: 'sm' | 'md' | 'lg' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <motion.div
        className={cn(
          'rounded-full border-2 border-gray-200 border-t-purple-600',
          sizeClasses[size],
        )}
        animate={{ rotate: 360 }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}

// ============================================================================
// Loading Overlay
// ============================================================================

export function LoadingOverlay({
  className,
  message = 'Loading...',
}: SkeletonProps & { message?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        'absolute inset-0 z-50 flex flex-col items-center justify-center',
        'bg-white/80 backdrop-blur-sm',
        className,
      )}
    >
      <LoadingSpinner size="lg" />
      {message && (
        <p className="mt-4 text-sm text-gray-600">{message}</p>
      )}
    </motion.div>
  );
}

// ============================================================================
// Progressive Loading
// ============================================================================

export function ProgressiveLoading({
  className,
  steps = ['Loading data...', 'Processing...', 'Almost there...'],
  currentStep = 0,
}: SkeletonProps & {
  steps?: string[];
  currentStep?: number;
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center space-y-4',
        className,
      )}
    >
      <LoadingSpinner size="md" />
      <div className="space-y-2 text-center">
        {steps.map((step, index) => (
          <motion.p
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{
              opacity: index <= currentStep ? 1 : 0.3,
              y: 0,
            }}
            className={cn(
              'text-sm',
              index === currentStep
                ? 'text-purple-600'
                : 'text-gray-400',
            )}
          >
            {index < currentStep && '✓ '}
            {step}
          </motion.p>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

export { Skeleton as default, SkeletonContainer };
