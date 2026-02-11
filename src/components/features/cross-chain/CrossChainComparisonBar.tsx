'use client';

import { memo } from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface PriceData {
  chain: string;
  price: number;
  deviationFromAvg: number;
}

interface CrossChainComparisonBarProps {
  prices?: PriceData[];
  isLoading?: boolean;
  height?: number;
}

export const CrossChainComparisonBar = memo(function CrossChainComparisonBar({
  isLoading,
  height = 350,
}: CrossChainComparisonBarProps) {
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
        <CardTitle>Chain Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div
          style={{ height }}
          className="flex items-center justify-center text-muted-foreground"
        >
          Comparison chart coming soon
        </div>
      </CardContent>
    </Card>
  );
});
