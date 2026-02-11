'use client';

import { memo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface CrossChainPriceChartProps {
  data?: unknown;
  isLoading?: boolean;
  height?: number;
}

export const CrossChainPriceChart = memo(function CrossChainPriceChart({
  isLoading,
  height = 350,
}: CrossChainPriceChartProps) {
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
        <CardTitle>Price Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          style={{ height }}
          className="flex items-center justify-center text-muted-foreground"
        >
          Price chart coming soon
        </div>
      </CardContent>
    </Card>
  );
});
