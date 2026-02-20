'use client';

import { memo, useMemo } from 'react';

import { Droplets, TrendingUp, TrendingDown } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/shared/utils';

import type { LiquidityResponse } from '../types';

const CHAIN_COLORS: Record<string, string> = {
  ethereum: '#627eea',
  bsc: '#f0b90b',
  polygon: '#8247e5',
  avalanche: '#e84142',
  arbitrum: '#28a0f0',
  optimism: '#ff0420',
  base: '#0052ff',
};

interface LiquidityDistributionProps {
  data?: LiquidityResponse;
  isLoading?: boolean;
  height?: number;
}

function formatLiquidity(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

export const LiquidityDistribution = memo(function LiquidityDistribution({
  data,
  isLoading,
  height = 300,
}: LiquidityDistributionProps) {
  const chartData = useMemo(() => {
    if (!data?.chains) return [];
    return data.chains
      .sort((a, b) => b.totalLiquidity - a.totalLiquidity)
      .map((chain) => ({
        chain: chain.chain,
        displayName: chain.displayName,
        liquidity: chain.totalLiquidity,
        change24h: chain.liquidityChange24h,
        color: CHAIN_COLORS[chain.chain] || '#94a3b8',
      }));
  }, [data]);

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

  if (!data || chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            跨链流动性分布
          </CardTitle>
          <CardDescription>暂无流动性数据</CardDescription>
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
              <Droplets className="h-5 w-5" />
              跨链流动性分布
            </CardTitle>
            <CardDescription>各链总流动性分析</CardDescription>
          </div>
          {data.summary && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                总流动性: {formatLiquidity(data.summary.totalLiquidity)}
              </Badge>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#e5e7eb"
                horizontal={true}
                vertical={false}
              />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                tickFormatter={(value) => formatLiquidity(value)}
              />
              <YAxis type="category" dataKey="displayName" tick={{ fontSize: 11 }} width={80} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  backgroundColor: 'white',
                }}
                formatter={(value) => {
                  const numValue = typeof value === 'number' ? value : 0;
                  return [formatLiquidity(numValue), '流动性'];
                }}
                labelFormatter={(label) => String(label)}
              />
              <Bar dataKey="liquidity" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {chartData.slice(0, 4).map((item) => (
            <div
              key={item.chain}
              className="flex items-center gap-2 rounded-md bg-muted px-2 py-1 text-xs"
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="font-medium">{item.displayName}</span>
              <span className="ml-auto font-mono">{formatLiquidity(item.liquidity)}</span>
              {item.change24h >= 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
            </div>
          ))}
        </div>
        {data.summary && (
          <div className="mt-4 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span>
                最高流动性: <span className="font-medium capitalize">{data.summary.topChain}</span>
              </span>
              <span>平均流动性: {formatLiquidity(data.summary.avgLiquidity)}</span>
            </div>
            <span>
              24h 变化:
              <span
                className={cn(
                  'ml-1 font-medium',
                  data.summary.liquidityChange24h >= 0 ? 'text-green-600' : 'text-red-600',
                )}
              >
                {data.summary.liquidityChange24h >= 0 ? '+' : ''}
                {data.summary.liquidityChange24h.toFixed(2)}%
              </span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
