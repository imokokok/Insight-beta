/**
 * Skeleton Card Component
 *
 * 骨架屏卡片组件 - 用于加载状态展示
 */

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface SkeletonCardProps {
  className?: string;
  header?: boolean;
  rows?: number;
}

export function SkeletonCard({ className, header = true, rows = 3 }: SkeletonCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      {header && (
        <CardHeader className="pb-2">
          <div className="h-5 w-1/3 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-gray-100" />
        </CardHeader>
      )}
      <CardContent className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-gray-100" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export function SkeletonStatCard({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardContent className="p-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 animate-pulse rounded-lg bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
            <div className="h-8 w-24 animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function SkeletonList({ count = 5, className }: { count?: number; className?: string }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
          <div className="h-10 w-10 animate-pulse rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-5 w-16 animate-pulse rounded-full bg-gray-100" />
            </div>
            <div className="h-3 w-48 animate-pulse rounded bg-gray-100" />
          </div>
          <div className="h-8 w-20 animate-pulse rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader>
        <div className="h-5 w-1/3 animate-pulse rounded bg-gray-200" />
        <div className="mt-2 h-3 w-1/2 animate-pulse rounded bg-gray-100" />
      </CardHeader>
      <CardContent>
        <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
      </CardContent>
    </Card>
  );
}
