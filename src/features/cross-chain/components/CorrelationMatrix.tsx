'use client';

import { memo, useMemo } from 'react';

import { Grid3X3, Info } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/shared/utils';

import type { CorrelationResponse } from '../types';

interface CorrelationMatrixProps {
  data?: CorrelationResponse;
  isLoading?: boolean;
  height?: number;
}

function getCorrelationColor(correlation: number): string {
  if (correlation >= 0.98) return 'bg-green-600';
  if (correlation >= 0.95) return 'bg-green-500';
  if (correlation >= 0.9) return 'bg-green-400';
  if (correlation >= 0.85) return 'bg-yellow-400';
  if (correlation >= 0.8) return 'bg-yellow-500';
  if (correlation >= 0.7) return 'bg-orange-400';
  return 'bg-red-400';
}

function getCorrelationTextColor(correlation: number): string {
  if (correlation >= 0.9) return 'text-white';
  return 'text-gray-800';
}

export const CorrelationMatrix = memo(function CorrelationMatrix({
  data,
  isLoading,
  height = 300,
}: CorrelationMatrixProps) {
  const matrixSize = data?.chains.length ?? 0;

  const cellSize = useMemo(() => {
    if (matrixSize <= 4) return 60;
    if (matrixSize <= 6) return 50;
    return 40;
  }, [matrixSize]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-1 h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton style={{ height }} className="w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data || matrixSize === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Grid3X3 className="h-5 w-5" />
            价格相关性矩阵
          </CardTitle>
          <CardDescription>暂无相关性数据</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            style={{ height }}
            className="flex items-center justify-center text-muted-foreground"
          >
            暂无数据
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5" />
              价格相关性矩阵
            </CardTitle>
            <CardDescription>
              {data.meta.symbol} 各链价格相关性分析 ({data.meta.timeRange})
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div
            className="inline-block"
            style={{ minWidth: `${(matrixSize + 1) * cellSize + 80}px` }}
          >
            <div className="flex">
              <div style={{ width: 80 }} />
              {data.chains.map((chain) => (
                <div
                  key={`header-${chain}`}
                  className="text-center text-xs font-medium capitalize"
                  style={{ width: cellSize, height: 24 }}
                >
                  {chain.slice(0, 4)}
                </div>
              ))}
            </div>
            {data.matrix.map((row, i) => (
              <div key={`row-${i}`} className="flex items-center">
                <div
                  className="pr-2 text-right text-xs font-medium capitalize"
                  style={{ width: 80 }}
                >
                  {data.chains[i]}
                </div>
                {row.map((correlation, j) => {
                  const isDiagonal = i === j;
                  return (
                    <div
                      key={`cell-${i}-${j}`}
                      className={cn(
                        'flex items-center justify-center rounded-sm font-mono text-xs',
                        getCorrelationColor(correlation),
                        getCorrelationTextColor(correlation),
                        isDiagonal && 'ring-1 ring-white/30',
                      )}
                      style={{ width: cellSize, height: cellSize }}
                      title={`${data.chains[i]} vs ${data.chains[j]}: ${correlation.toFixed(3)}`}
                    >
                      {correlation.toFixed(2)}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Info className="h-3 w-3" />
            <span>相关性范围: 0.70 - 1.00</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs">低</span>
            <div className="flex gap-0.5">
              <div className="h-4 w-4 rounded-sm bg-red-400" />
              <div className="h-4 w-4 rounded-sm bg-orange-400" />
              <div className="h-4 w-4 rounded-sm bg-yellow-500" />
              <div className="h-4 w-4 rounded-sm bg-green-400" />
              <div className="h-4 w-4 rounded-sm bg-green-600" />
            </div>
            <span className="text-xs">高</span>
          </div>
        </div>
        {data.correlations.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h4 className="mb-2 text-sm font-medium">相关性最低的链对</h4>
            <div className="flex flex-wrap gap-2">
              {data.correlations
                .sort((a, b) => a.correlation - b.correlation)
                .slice(0, 3)
                .map((corr, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-md bg-muted px-2 py-1 text-xs"
                  >
                    <span className="capitalize">{corr.chain1}</span>
                    <span className="text-muted-foreground">↔</span>
                    <span className="capitalize">{corr.chain2}</span>
                    <span
                      className={cn(
                        'font-mono font-medium',
                        corr.correlation < 0.85 ? 'text-yellow-600' : 'text-green-600',
                      )}
                    >
                      {corr.correlation.toFixed(2)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
