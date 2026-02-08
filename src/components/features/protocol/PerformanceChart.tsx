'use client';

import { useMemo, useState } from 'react';

import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/i18n';

export interface PerformanceDataPoint {
  timestamp: number;
  accuracy: number;
  latency: number;
  uptime: number;
}

interface PerformanceChartProps {
  data: PerformanceDataPoint[];
  loading?: boolean;
  className?: string;
}

export function PerformanceChart({ data, loading, className }: PerformanceChartProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'accuracy' | 'latency' | 'uptime'>('accuracy');

  const formattedData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      time: new Date(point.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      date: new Date(point.timestamp).toLocaleDateString(),
    }));
  }, [data]);

  const stats = useMemo(() => {
    if (data.length === 0) return null;

    const avgAccuracy = data.reduce((sum, d) => sum + d.accuracy, 0) / data.length;
    const avgLatency = data.reduce((sum, d) => sum + d.latency, 0) / data.length;
    const avgUptime = data.reduce((sum, d) => sum + d.uptime, 0) / data.length;

    const minAccuracy = Math.min(...data.map((d) => d.accuracy));
    const maxLatency = Math.max(...data.map((d) => d.latency));
    const minUptime = Math.min(...data.map((d) => d.uptime));

    return {
      avgAccuracy,
      avgLatency,
      avgUptime,
      minAccuracy,
      maxLatency,
      minUptime,
    };
  }, [data]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  if (data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{t('protocol:performance.title')}</CardTitle>
        </CardHeader>
        <CardContent className="flex h-[300px] flex-col items-center justify-center">
          <p className="text-muted-foreground">{t('protocol:performance.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">{t('protocol:performance.title')}</CardTitle>
          {stats && (
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="space-y-1">
                <span className="text-muted-foreground text-xs">
                  {t('protocol:performance.avgAccuracy')}
                </span>
                <p className="text-emerald-600 font-semibold">{stats.avgAccuracy.toFixed(2)}%</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground text-xs">
                  {t('protocol:performance.avgLatency')}
                </span>
                <p className="text-blue-600 font-semibold">{stats.avgLatency.toFixed(0)}ms</p>
              </div>
              <div className="space-y-1">
                <span className="text-muted-foreground text-xs">
                  {t('protocol:performance.avgUptime')}
                </span>
                <p className="text-purple-600 font-semibold">{stats.avgUptime.toFixed(2)}%</p>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
          <TabsList className="mb-4 grid w-full grid-cols-3">
            <TabsTrigger value="accuracy">{t('protocol:performance.accuracy')}</TabsTrigger>
            <TabsTrigger value="latency">{t('protocol:performance.latency')}</TabsTrigger>
            <TabsTrigger value="uptime">{t('protocol:performance.uptime')}</TabsTrigger>
          </TabsList>

          <TabsContent value="accuracy" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedData}>
                <defs>
                  <linearGradient id="accuracyGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[95, 100]}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`${Number(value).toFixed(2)}%`, t('protocol:metrics.accuracy')]}
                />
                <Area
                  type="monotone"
                  dataKey="accuracy"
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#accuracyGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="latency" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={formattedData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}ms`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`${Number(value)}ms`, t('protocol:metrics.latency')]}
                />
                <Line
                  type="monotone"
                  dataKey="latency"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </TabsContent>

          <TabsContent value="uptime" className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={formattedData}>
                <defs>
                  <linearGradient id="uptimeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  domain={[99, 100]}
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`${Number(value).toFixed(3)}%`, t('protocol:metrics.uptime')]}
                />
                <Area
                  type="monotone"
                  dataKey="uptime"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#uptimeGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
