'use client';

import { useMemo } from 'react';

import { BarChart3, Clock, Zap, DollarSign, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';

import type { CrossChainComparisonData } from '../types/api3';

interface CrossChainMetricsProps {
  data: CrossChainComparisonData;
  chainColors: Record<string, string>;
  className?: string;
}

export function CrossChainMetrics({ data, chainColors, className }: CrossChainMetricsProps) {
  const formatPrice = (price: number) => {
    if (price >= 1000) return `$${price.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (price >= 1) return `$${price.toFixed(4)}`;
    return `$${price.toFixed(6)}`;
  };

  const formatInterval = (ms: number) => {
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds.toFixed(1)}s`;
    const minutes = seconds / 60;
    return `${minutes.toFixed(1)}m`;
  };

  const formatLatency = (ms: number) => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const priceComparisonData = useMemo(() => {
    return data.dapiData.map((dapi) => ({
      chain: dapi.chain,
      price: dapi.lastPrice,
    }));
  }, [data.dapiData]);

  const updateIntervalData = useMemo(() => {
    return data.dapiData.map((dapi) => ({
      chain: dapi.chain,
      interval: dapi.avgUpdateIntervalMs / 1000,
    }));
  }, [data.dapiData]);

  const latencyData = useMemo(() => {
    return data.dapiData.map((dapi) => ({
      chain: dapi.chain,
      latency: dapi.avgLatencyMs,
    }));
  }, [data.dapiData]);

  const gasCostData = useMemo(() => {
    return data.dapiData.map((dapi) => ({
      chain: dapi.chain,
      cost: dapi.gasCostUsd,
    }));
  }, [data.dapiData]);

  const getBestChain = (key: keyof (typeof data.dapiData)[0], higherIsBetter: boolean = false) => {
    return data.dapiData.reduce((best, current) => {
      const currentValue = current[key] as number;
      const bestValue = best[key] as number;
      return higherIsBetter
        ? currentValue > bestValue
          ? current
          : best
        : currentValue < bestValue
          ? current
          : best;
    });
  };

  const bestPriceChain = getBestChain('lastPrice', false);
  const bestUpdateIntervalChain = getBestChain('avgUpdateIntervalMs', false);
  const bestLatencyChain = getBestChain('avgLatencyMs', false);
  const bestGasCostChain = getBestChain('gasCostUsd', false);
  const bestUptimeChain = getBestChain('uptimePercentage', true);

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          指标对比
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>最低价格</span>
            </div>
            <div className="mt-2">
              <p className="text-lg font-bold">{formatPrice(bestPriceChain.lastPrice)}</p>
              <Badge
                className="mt-1"
                style={{ backgroundColor: chainColors[bestPriceChain.chain] }}
              >
                {bestPriceChain.chain}
              </Badge>
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Zap className="h-4 w-4" />
              <span>最快更新</span>
            </div>
            <div className="mt-2">
              <p className="text-lg font-bold">
                {formatInterval(bestUpdateIntervalChain.avgUpdateIntervalMs)}
              </p>
              <Badge
                className="mt-1"
                style={{ backgroundColor: chainColors[bestUpdateIntervalChain.chain] }}
              >
                {bestUpdateIntervalChain.chain}
              </Badge>
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Activity className="h-4 w-4" />
              <span>最低延迟</span>
            </div>
            <div className="mt-2">
              <p className="text-lg font-bold">{formatLatency(bestLatencyChain.avgLatencyMs)}</p>
              <Badge
                className="mt-1"
                style={{ backgroundColor: chainColors[bestLatencyChain.chain] }}
              >
                {bestLatencyChain.chain}
              </Badge>
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <DollarSign className="h-4 w-4" />
              <span>最低 Gas</span>
            </div>
            <div className="mt-2">
              <p className="text-lg font-bold">${bestGasCostChain.gasCostUsd.toFixed(2)}</p>
              <Badge
                className="mt-1"
                style={{ backgroundColor: chainColors[bestGasCostChain.chain] }}
              >
                {bestGasCostChain.chain}
              </Badge>
            </div>
          </div>
          <div className="rounded-lg border p-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>最高可用性</span>
            </div>
            <div className="mt-2">
              <p className="text-lg font-bold">{bestUptimeChain.uptimePercentage.toFixed(2)}%</p>
              <Badge
                className="mt-1"
                style={{ backgroundColor: chainColors[bestUptimeChain.chain] }}
              >
                {bestUptimeChain.chain}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-lg border p-4">
            <h4 className="mb-4 text-sm font-medium text-muted-foreground">当前价格对比</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priceComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="chain"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickFormatter={(v) => formatPrice(v)}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [formatPrice(Number(value) || 0), '价格']}
                  />
                  <Bar dataKey="price" radius={[4, 4, 0, 0]}>
                    {priceComparisonData.map((entry, index) => (
                      <rect key={`cell-${index}`} fill={chainColors[entry.chain]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="mb-4 text-sm font-medium text-muted-foreground">平均更新间隔 (秒)</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={updateIntervalData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="chain"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [`${Number(value).toFixed(1)}s`, '间隔']}
                  />
                  <Bar dataKey="interval" radius={[4, 4, 0, 0]}>
                    {updateIntervalData.map((entry, index) => (
                      <rect key={`cell-${index}`} fill={chainColors[entry.chain]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="mb-4 text-sm font-medium text-muted-foreground">平均延迟 (毫秒)</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={latencyData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="chain"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [`${Number(value).toFixed(0)}ms`, '延迟']}
                  />
                  <Bar dataKey="latency" radius={[4, 4, 0, 0]}>
                    {latencyData.map((entry, index) => (
                      <rect key={`cell-${index}`} fill={chainColors[entry.chain]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-lg border p-4">
            <h4 className="mb-4 text-sm font-medium text-muted-foreground">Gas 成本 (USD)</h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gasCostData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="chain"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                    formatter={(value) => [`$${Number(value).toFixed(2)}`, '成本']}
                  />
                  <Bar dataKey="cost" radius={[4, 4, 0, 0]}>
                    {gasCostData.map((entry, index) => (
                      <rect key={`cell-${index}`} fill={chainColors[entry.chain]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
