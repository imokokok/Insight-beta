import { memo } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/shared/utils';

import type { StatCardSize } from './types';

interface StatCardSkeletonProps {
  size?: StatCardSize;
}

export const StatCardSkeleton = memo(function StatCardSkeleton({
  size = 'md',
}: StatCardSkeletonProps) {
  const heightClass = {
    sm: 'h-24',
    md: 'h-32',
    lg: 'h-40',
  }[size];

  return (
    <Card className={cn('overflow-hidden', heightClass)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
          </div>
          <Skeleton className="h-10 w-10 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  );
});
