'use client';

import { memo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface CrossChainDeviationChartProps {
  data?: unknown;
  isLoading?: boolean;
  height?: number;
}

export const CrossChainDeviationChart = memo(function CrossChainDeviationChart({
  isLoading,
  height = 250,
}: CrossChainDeviationChartProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton style={{ height }} className="w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Deviation Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          style={{ height }}
          className="flex items-center justify-center text-muted-foreground"
        >
          Deviation chart coming soon
        </div>
      </CardContent>
    </Card>
  );
});
