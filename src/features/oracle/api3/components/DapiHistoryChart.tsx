'use client';

import { useState, useMemo } from 'react';

import { TrendingUp, Clock, Activity } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { useI18n } from '@/i18n';
import { CHART_GRID } from '@/lib/chart-config';
import { formatTime } from '@/shared/utils';

interface DapiHistoryPoint {
  timestamp: string;
  value: number;
  updateCount: number;
  avgDelay: number;
}

interface DapiHistoryChartProps {
  dapiName: string;
  history: DapiHistoryPoint[];
  isLoading?: boolean;
}

type TimeRange = '1h' | '24h' | '7d' | '30d';

interface FilteredDataPoint {
  time: string;
  timestamp: string;
  value: number;
  updateCount: number;
  avgDelay: number;
}

export function DapiHistoryChart({ dapiName, history, isLoading }: DapiHistoryChartProps) {
  const { t } = useI18n();
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const chartData = useMemo(() => {
    if (!history || history.length === 0) return [];

    const now = new Date();
    let filterHours = 24;

    switch (timeRange) {
      case '1h':
        filterHours = 1;
        break;
      case '24h':
        filterHours = 24;
        break;
      case '7d':
        filterHours = 24 * 7;
        break;
      case '30d':
        filterHours = 24 * 30;
        break;
    }

    const cutoffTime = new Date(now.getTime() - filterHours * 60 * 60 * 1000);

    return history
      .filter((point) => new Date(point.timestamp) >= cutoffTime)
      .map((point) => ({
        time: formatTime(point.timestamp, {
          hour: '2-digit',
          minute: '2-digit',
          second: timeRange === '1h' ? '2-digit' : undefined,
        }),
        timestamp: point.timestamp,
        value: point.value,
        updateCount: point.updateCount,
        avgDelay: point.avgDelay,
      }));
  }, [history, timeRange]);

  const stats = useMemo(() => {
    if (chartData.length === 0) return null;

    const values = chartData.map((d) => d.value);
    const delays = chartData.map((d) => d.avgDelay);
    const updates = chartData.map((d) => d.updateCount);

    const currentValue = values[values.length - 1];
    const startValue = values[0];
    const change = currentValue - startValue;
    const changePercent = ((change / startValue) * 100).toFixed(2);

    const avgDelay = delays.reduce((a, b) => a + b, 0) / delays.length;
    const totalUpdates = updates.reduce((a, b) => a + b, 0);

    return {
      currentValue,
      change,
      changePercent,
      avgDelay: Math.round(avgDelay),
      totalUpdates,
    };
  }, [chartData]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      value: number;
      payload: {
        timestamp: string;
        value: number;
        updateCount: number;
        avgDelay: number;
      };
    }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0]!.payload;
      return (
        <div className="rounded-lg border bg-white p-3 shadow-lg dark:bg-slate-800">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            {new Date(data.timestamp).toLocaleString()}
          </p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500" />
              <span className="text-xs text-muted-foreground">价格:</span>
              <span className="text-sm font-bold">{data.value.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <span className="text-xs text-muted-foreground">更新次数:</span>
              <span className="text-sm font-medium">{data.updateCount}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-purple-500" />
              <span className="text-xs text-muted-foreground">平均延迟:</span>
              <span className="text-sm font-medium">{data.avgDelay.toFixed(0)}ms</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dapiName} 历史趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-80 items-center justify-center text-muted-foreground">
            加载中...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{dapiName} 历史趋势</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-80 items-center justify-center text-muted-foreground">
            暂无历史数据
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
              <TrendingUp className="h-5 w-5 text-blue-500" />
              {dapiName} 历史趋势
            </CardTitle>
            <CardDescription>查看 dAPI 的历史价格、更新频率和延迟趋势</CardDescription>
          </div>
          <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as TimeRange)}>
            <TabsList>
              <TabsTrigger value="1h">1 小时</TabsTrigger>
              <TabsTrigger value="24h">24 小时</TabsTrigger>
              <TabsTrigger value="7d">7 天</TabsTrigger>
              <TabsTrigger value="30d">30 天</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {/* 统计卡片 */}
        {stats && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-sm text-muted-foreground">当前价格</span>
              </div>
              <div className="mt-2 text-2xl font-bold">{stats.currentValue.toFixed(2)}</div>
              <div
                className={`mt-1 text-xs ${stats.change >= 0 ? 'text-green-600' : 'text-red-600'}`}
              >
                {stats.change >= 0 ? '+' : ''}
                {stats.changePercent}%
              </div>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-green-500" />
                <span className="text-sm text-muted-foreground">总更新次数</span>
              </div>
              <div className="mt-2 text-2xl font-bold">{stats.totalUpdates}</div>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-purple-500" />
                <span className="text-sm text-muted-foreground">平均延迟</span>
              </div>
              <div className="mt-2 text-2xl font-bold">{stats.avgDelay}ms</div>
            </div>

            <div className="rounded-lg border bg-card p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-orange-500" />
                <span className="text-sm text-muted-foreground">数据点</span>
              </div>
              <div className="mt-2 text-2xl font-bold">{chartData.length}</div>
            </div>
          </div>
        )}

        {/* 价格趋势图 */}
        <div className="mb-6">
          <h4 className="mb-3 text-sm font-semibold">价格趋势</h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="valueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray={CHART_GRID.strokeDasharray}
                  className={CHART_GRID.className}
                  vertical={CHART_GRID.vertical}
                />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 11 }}
                  interval="preserveStartEnd"
                  className="text-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  domain={['auto', 'auto']}
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  name="价格"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#valueGradient)"
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 更新频率图 */}
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h4 className="mb-3 text-sm font-semibold">更新频率</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray={CHART_GRID.strokeDasharray}
                    className={CHART_GRID.className}
                    vertical={CHART_GRID.vertical}
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="updateCount"
                    name="更新次数"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-sm font-semibold">延迟趋势</h4>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid
                    strokeDasharray={CHART_GRID.strokeDasharray}
                    className={CHART_GRID.className}
                    vertical={CHART_GRID.vertical}
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 10 }}
                    interval="preserveStartEnd"
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" unit="ms" />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="avgDelay"
                    name="平均延迟"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
