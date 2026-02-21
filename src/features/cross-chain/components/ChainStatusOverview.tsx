'use client';

import { memo, useMemo } from 'react';

import { Activity, Clock, Server, Wifi, WifiOff } from 'lucide-react';
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

import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { cn } from '@/shared/utils';
import { formatTime } from '@/shared/utils/format/date';

import type { ChainStatusResponse } from '../types';

const CHAIN_COLORS: Record<string, string> = {
  ethereum: '#627eea',
  bsc: '#f0b90b',
  polygon: '#8247e5',
  avalanche: '#e84142',
  arbitrum: '#28a0f0',
  optimism: '#ff0420',
  base: '#0052ff',
};

interface ChainStatusOverviewProps {
  data?: ChainStatusResponse;
  isLoading?: boolean;
  height?: number;
}

function formatResponseTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export const ChainStatusOverview = memo(function ChainStatusOverview({
  data,
  isLoading,
  height = 300,
}: ChainStatusOverviewProps) {
  const chartData = useMemo(() => {
    if (!data?.chains) return [];
    return data.chains
      .sort((a, b) => a.responseTimeMs - b.responseTimeMs)
      .map((chain) => ({
        chain: chain.chain,
        displayName: chain.displayName,
        responseTimeMs: chain.responseTimeMs,
        staleMinutes: chain.staleMinutes,
        status: chain.status,
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
            <Server className="h-5 w-5" />
            链状态概览
          </CardTitle>
          <CardDescription>暂无链状态数据</CardDescription>
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
              <Server className="h-5 w-5" />
              链状态概览
            </CardTitle>
            <CardDescription>各链响应时间与数据新鲜度</CardDescription>
          </div>
          {data.summary && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                健康链: {data.summary.healthyChains}/{data.summary.totalChains}
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
                tickFormatter={(value) => formatResponseTime(value)}
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
                  return [formatResponseTime(numValue), '响应时间'];
                }}
                labelFormatter={(label) => String(label)}
              />
              <Bar dataKey="responseTimeMs" radius={[0, 4, 4, 0]}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.status === 'healthy' ? entry.color : '#94a3b8'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">
          {chartData.slice(0, 4).map((item) => (
            <div
              key={item.chain}
              className={cn(
                'flex items-center gap-2 rounded-md px-2 py-1 text-xs',
                item.status === 'healthy' && 'bg-green-500/10',
                item.status === 'degraded' && 'bg-amber-500/10',
                item.status === 'offline' && 'bg-red-500/10',
              )}
            >
              {item.status === 'healthy' ? (
                <Wifi className="h-3 w-3 text-green-600" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-600" />
              )}
              <span className="font-medium">{item.displayName}</span>
              <span className="ml-auto font-mono text-muted-foreground">
                {formatResponseTime(item.responseTimeMs)}
              </span>
            </div>
          ))}
        </div>
        {data.summary && (
          <div className="mt-4 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <Activity className="h-3 w-3" />
                平均响应: {formatResponseTime(data.summary.avgResponseTimeMs)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                最新更新: {formatTime(data.summary.lastUpdated)}
              </span>
            </div>
            <span>
              健康率:
              <span
                className={cn(
                  'ml-1 font-medium',
                  data.summary.healthRate >= 90
                    ? 'text-green-600'
                    : data.summary.healthRate >= 70
                      ? 'text-amber-600'
                      : 'text-red-600',
                )}
              >
                {data.summary.healthRate.toFixed(0)}%
              </span>
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
