'use client';

import { ArrowRightLeft, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/shared/utils';
import { formatTime } from '@/shared/utils';
import type { PriceDeviationPoint } from '../types/deviation';

interface ProtocolPriceComparisonProps {
  dataPoint: PriceDeviationPoint | null;
}

export function ProtocolPriceComparison({ dataPoint }: ProtocolPriceComparisonProps) {
  if (!dataPoint) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Protocol Price Comparison
          </CardTitle>
          <CardDescription>Select a data point to view details</CardDescription>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <BarChart3 className="mx-auto mb-4 h-12 w-12 text-gray-300" />
          <p className="text-muted-foreground">
            Click on a deviation point to see protocol comparison
          </p>
        </CardContent>
      </Card>
    );
  }

  const prices = Object.entries(dataPoint.prices).map(([protocol, price]) => ({
    protocol,
    price,
    deviation: Math.abs(price - dataPoint.avgPrice) / dataPoint.avgPrice,
    isOutlier: dataPoint.outlierProtocols.includes(protocol),
  }));

  const maxPrice = Math.max(...prices.map((p) => p.price));
  const minPrice = Math.min(...prices.map((p) => p.price));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          Protocol Price Comparison
        </CardTitle>
        <CardDescription>
          {dataPoint.symbol} at {formatTime(dataPoint.timestamp)}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-green-50 p-3">
              <p className="text-xs text-muted-foreground">Average Price</p>
              <p className="text-lg font-bold">${dataPoint.avgPrice.toFixed(4)}</p>
            </div>
            <div className="rounded-lg bg-orange-50 p-3">
              <p className="text-xs text-muted-foreground">Max Deviation</p>
              <p className="text-lg font-bold">
                {(dataPoint.maxDeviationPercent * 100).toFixed(2)}%
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {prices
              .sort((a, b) => b.price - a.price)
              .map(({ protocol, price, deviation, isOutlier }) => (
                <div
                  key={protocol}
                  className={cn(
                    'flex items-center justify-between rounded-lg border p-3',
                    isOutlier && 'border-red-300 bg-red-50',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium capitalize">{protocol}</span>
                    {isOutlier && (
                      <Badge variant="outline" className="border-red-500 text-red-500">
                        Outlier
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">${price.toFixed(4)}</p>
                    <p
                      className={cn(
                        'text-xs',
                        deviation > 0.01 ? 'text-red-500' : 'text-green-500',
                      )}
                    >
                      {deviation > 0 ? '+' : ''}
                      {(deviation * 100).toFixed(2)}%
                    </p>
                  </div>
                </div>
              ))}
          </div>

          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-xs text-muted-foreground">Price Spread</p>
            <p className="text-lg font-bold">
              ${(maxPrice - minPrice).toFixed(4)} (
              {(((maxPrice - minPrice) / minPrice) * 100).toFixed(2)}%)
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
