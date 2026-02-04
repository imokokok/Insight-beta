import { cn } from '@/lib/utils';

/**
 * 骨架屏组件
 *
 * 用于在数据加载时显示占位符，提升用户体验
 */

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * 基础骨架屏组件
 */
function Skeleton({ className }: SkeletonProps) {
  return <div className={cn('animate-pulse rounded-md bg-gray-200 dark:bg-gray-800', className)} />;
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

export {
  Skeleton,
  CardSkeleton,
  ListItemSkeleton,
  TableRowSkeleton,
  StatCardSkeleton,
  ChartSkeleton,
  TextSkeleton,
  AvatarSkeleton,
  ButtonSkeleton,
  PageSkeleton,
  DataTableSkeleton,
};

export default Skeleton;
