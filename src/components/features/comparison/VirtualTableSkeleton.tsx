'use client';

import React from 'react';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface VirtualTableSkeletonProps {
  rowCount?: number;
}

export const VirtualTableSkeleton = React.memo(function VirtualTableSkeleton({
  rowCount = 10,
}: VirtualTableSkeletonProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: rowCount }).map((_, i) => (
            <Skeleton key={i} className="h-12" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
});
