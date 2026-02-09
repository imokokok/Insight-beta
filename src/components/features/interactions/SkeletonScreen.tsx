'use client';

import type { ReactNode } from 'react';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Card skeleton
interface CardSkeletonProps {
  className?: string;
  header?: boolean;
  content?: boolean;
  footer?: boolean;
}

export function CardSkeleton({ className, header = true, content = true, footer = false }: CardSkeletonProps) {
  return (
    <div className={cn('rounded-xl border bg-card p-6', className)}>
      {header && (
        <div className="mb-4 flex items-center justify-between">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-16" />
        </div>
      )}
      {content && (
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-3/5" />
        </div>
      )}
      {footer && (
        <div className="mt-4 flex items-center justify-between">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-24" />
        </div>
      )}
    </div>
  );
}

// List skeleton
interface ListSkeletonProps {
  count?: number;
  className?: string;
}

export function ListSkeleton({ count = 5, className }: ListSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-8 w-20" />
        </div>
      ))}
    </div>
  );
}

// Table skeleton
interface TableSkeletonProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export function TableSkeleton({ rows = 5, columns = 4, className }: TableSkeletonProps) {
  return (
    <div className={cn('rounded-xl border', className)}>
      {/* Header */}
      <div className="flex items-center gap-4 border-b bg-muted/50 p-4">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" style={{ maxWidth: `${100 / columns}%` }} />
        ))}
      </div>
      {/* Rows */}
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 p-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className="h-4 flex-1"
                style={{ maxWidth: `${100 / columns}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// Chart skeleton
interface ChartSkeletonProps {
  className?: string;
}

export function ChartSkeleton({ className }: ChartSkeletonProps) {
  return (
    <div className={cn('rounded-xl border bg-card p-6', className)}>
      <div className="mb-4 flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      <div className="relative h-[300px] w-full overflow-hidden rounded-lg bg-muted/30">
        {/* Chart area skeleton */}
        <svg className="h-full w-full" viewBox="0 0 400 200" preserveAspectRatio="none">
          <defs>
            <linearGradient id="skeletonGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.2" />
              <stop offset="100%" stopColor="hsl(var(--muted-foreground))" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path
            d="M0,150 Q50,120 100,140 T200,100 T300,120 T400,80 L400,200 L0,200 Z"
            fill="url(#skeletonGradient)"
          />
          <path
            d="M0,150 Q50,120 100,140 T200,100 T300,120 T400,80"
            fill="none"
            stroke="hsl(var(--muted-foreground))"
            strokeWidth="2"
            strokeOpacity="0.3"
          />
        </svg>
        {/* Animated shimmer */}
        <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      </div>
    </div>
  );
}

// Stats skeleton
interface StatsSkeletonProps {
  count?: number;
  className?: string;
}

export function StatsSkeleton({ count = 4, className }: StatsSkeletonProps) {
  return (
    <div className={cn('grid gap-4', `grid-cols-${Math.min(count, 4)}`, className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl border bg-card p-6">
          <Skeleton className="mb-2 h-4 w-20" />
          <Skeleton className="h-8 w-24" />
        </div>
      ))}
    </div>
  );
}

// Full page skeleton
interface PageSkeletonProps {
  className?: string;
}

export function PageSkeleton({ className }: PageSkeletonProps) {
  return (
    <div className={cn('space-y-6 p-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      
      {/* Stats row */}
      <StatsSkeleton count={4} />
      
      {/* Main content grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <ChartSkeleton />
          <TableSkeleton rows={4} columns={4} />
        </div>
        <div className="space-y-6">
          <CardSkeleton />
          <ListSkeleton count={3} />
        </div>
      </div>
    </div>
  );
}

// Pulse animation wrapper
interface PulseSkeletonProps {
  children: ReactNode;
  className?: string;
}

export function PulseSkeleton({ children, className }: PulseSkeletonProps) {
  return (
    <div className={cn('animate-pulse', className)}>
      {children}
    </div>
  );
}
