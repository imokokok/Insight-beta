'use client';

import { motion } from 'framer-motion';

import { cn } from '@/shared/utils';

/**
 * 骨架屏组件
 *
 * 用于在数据加载时显示占位符，提升用户体验
 * 支持基础和增强（带 Shimmer 效果）两种模式
 */

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
  shimmer?: boolean;
}

/**
 * 统一的骨架屏颜色配置
 */
const SKELETON_BASE_STYLES = 'bg-gray-200 dark:bg-gray-700';
const SKELETON_SHIMMER_STYLES =
  'bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700';
const SKELETON_PULSE_STYLES = 'animate-pulse';

/**
 * 基础骨架屏组件
 * @param shimmer - 是否启用 Shimmer 动画效果
 */
function Skeleton({ className, shimmer = true }: SkeletonProps) {
  if (shimmer) {
    return (
      <div
        className={cn(
          'relative overflow-hidden rounded-md',
          SKELETON_BASE_STYLES,
          'before:absolute before:inset-0',
          'before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent',
          'before:animate-shimmer',
          'before:bg-[length:200%_100%]',
          className,
        )}
      />
    );
  }

  return (
    <div className={cn(SKELETON_PULSE_STYLES, 'rounded-md', SKELETON_BASE_STYLES, className)} />
  );
}

/**
 * 卡片骨架屏
 */
function CardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-lg border border-gray-200 p-4', className)}>
      <Skeleton className="mb-4 h-4 w-1/3" />
      <Skeleton className="mb-2 h-8 w-2/3" />
      <Skeleton className="h-4 w-full" />
    </div>
  );
}

/**
 * 列表项骨架屏
 */
function ListItemSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('flex items-center gap-4 py-3', className)}>
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="flex-1">
        <Skeleton className="mb-2 h-4 w-1/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

/**
 * 表格行骨架屏
 */
function TableRowSkeleton({ columns = 4, className }: SkeletonProps & { columns?: number }) {
  return (
    <div className={cn('flex gap-4 py-3', className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" style={{ width: `${Math.random() * 20 + 60}%` }} />
      ))}
    </div>
  );
}

/**
 * 统计卡片骨架屏
 */
function StatCardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-lg border border-gray-200 p-6', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-8 w-8 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-8 w-16" />
      <Skeleton className="mt-2 h-3 w-32" />
    </div>
  );
}

/**
 * 图表骨架屏
 */
function ChartSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-lg border border-gray-200 p-4', className)}>
      <Skeleton className="mb-4 h-6 w-1/4" />
      <div className="flex h-48 items-end gap-2">
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t"
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * 文本骨架屏
 */
function TextSkeleton({ lines = 3, className }: SkeletonProps & { lines?: number }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{
            width: i === lines - 1 ? '60%' : '100%',
          }}
        />
      ))}
    </div>
  );
}

/**
 * 头像骨架屏
 */
function AvatarSkeleton({
  size = 'md',
  className,
}: SkeletonProps & { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
    xl: 'h-24 w-24',
  };

  return <Skeleton className={cn('rounded-full', sizeClasses[size], className)} />;
}

/**
 * 按钮骨架屏
 */
function ButtonSkeleton({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-10 w-24 rounded-md', className)} />;
}

/**
 * 页面骨架屏（完整页面加载状态）
 */
function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
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
      <div className="rounded-lg border border-gray-200 p-4">
        <Skeleton className="mb-4 h-6 w-1/4" />
        <div className="space-y-2">
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
          <ListItemSkeleton />
        </div>
      </div>
    </div>
  );
}

/**
 * 数据表格骨架屏
 */
function DataTableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="rounded-lg border border-gray-200">
      {/* Header */}
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-3">
        <div className="flex gap-4">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton key={i} className="h-4 flex-1" />
          ))}
        </div>
      </div>

      {/* Rows */}
      <div className="divide-y divide-gray-200">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="px-4 py-3">
            <TableRowSkeleton columns={columns} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 仪表板骨架屏
 */
function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-4 lg:p-6">
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
          <ChartSkeleton className="h-80" />
        </div>
        <ChartSkeleton className="h-80" />
      </div>

      {/* Bottom Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <ChartSkeleton className="h-64" />
        <ChartSkeleton className="h-64" />
      </div>
    </div>
  );
}

/**
 * 价格卡片骨架屏
 */
function PriceCardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-xl border border-gray-200 p-4', className)}>
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
    </div>
  );
}

/**
 * 协议卡片骨架屏
 */
function ProtocolCardSkeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('rounded-xl border border-gray-200 p-4', className)}>
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
    </div>
  );
}

/**
 * AlertCard 骨架屏
 */
function AlertCardSkeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-5 w-24 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-5 w-3/4 rounded" />
          <Skeleton className="h-4 w-full rounded" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        </div>
        <div className="text-right">
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

/**
 * Alert 列表骨架屏
 */
function AlertListSkeleton({ count = 5, className }: SkeletonProps & { count?: number }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <AlertCardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * 列表骨架屏（从 SkeletonList 迁移）
 */
function SkeletonList({
  count = 6,
  viewMode = 'grid',
}: {
  count?: number;
  viewMode?: 'grid' | 'list';
}) {
  return (
    <div
      className={cn(
        'grid gap-6',
        viewMode === 'grid' ? 'md:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1',
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            'animate-pulse rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-700 dark:bg-gray-800',
            viewMode === 'grid' ? 'h-[220px]' : 'h-[120px]',
          )}
        >
          <div className="mb-6 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div className="space-y-2">
              <Skeleton className="h-3 w-20 rounded" />
              <Skeleton className="h-4 w-32 rounded" />
            </div>
            <Skeleton className="ml-auto h-6 w-20 rounded-full" />
          </div>
          <div className="space-y-4">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
            <Skeleton className="mt-4 h-3 w-full rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Animation Variants
// ============================================================================

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
// Skeleton Container
// ============================================================================

interface SkeletonContainerProps {
  children: React.ReactNode;
  className?: string;
  animated?: boolean;
}

function SkeletonContainer({ children, className, animated = true }: SkeletonContainerProps) {
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
// Table Skeleton
// ============================================================================

interface TableSkeletonProps extends SkeletonProps {
  rows?: number;
  columns?: number;
  showHeader?: boolean;
}

function TableSkeleton({
  className,
  rows = 5,
  columns = 4,
  showHeader = true,
}: TableSkeletonProps) {
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
// Loading Spinner
// ============================================================================

interface LoadingSpinnerProps extends SkeletonProps {
  size?: 'sm' | 'md' | 'lg';
}

function LoadingSpinner({ className, size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
  };

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <motion.div
        className={cn('rounded-full border-2 border-gray-200 border-t-primary', sizeClasses[size])}
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

interface LoadingOverlayProps extends SkeletonProps {
  message?: string;
}

function LoadingOverlay({ className, message = 'Loading...' }: LoadingOverlayProps) {
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
      {message && <p className="mt-4 text-sm text-gray-600">{message}</p>}
    </motion.div>
  );
}

export {
  Skeleton,
  CardSkeleton,
  CardSkeleton as SkeletonCard,
  ListItemSkeleton,
  TableRowSkeleton,
  StatCardSkeleton,
  ChartSkeleton,
  TextSkeleton,
  AvatarSkeleton,
  ButtonSkeleton,
  PageSkeleton,
  DataTableSkeleton,
  DashboardSkeleton,
  PriceCardSkeleton,
  ProtocolCardSkeleton,
  SkeletonList,
  SkeletonContainer,
  TableSkeleton,
  LoadingSpinner,
  LoadingOverlay,
  AlertCardSkeleton,
  AlertListSkeleton,
};

export default Skeleton;
