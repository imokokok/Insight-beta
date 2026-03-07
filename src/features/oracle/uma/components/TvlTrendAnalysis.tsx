'use client';

import { useMemo, useState } from 'react';

import {
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { formatTime } from '@/shared/utils/format/date';
import { cn } from '@/shared/utils/ui';

interface TvlDataPoint {
  timestamp: string;
  tvl: number;
  assertionCount?: number;
}

interface TvlTrendAnalysisProps {
  tvlData: TvlDataPoint[];
  isLoading?: boolean;
}

type TimeRange = '1h' | '24h' | '7d' | '30d' | '90d';

const TIME_RANGES: { value: TimeRange; label: string; points: number }[] = [
  { value: '1h', label: '1 小时', points: 60 },
  { value: '24h', label: '24 小时', points: 96 },
  { value: '7d', label: '7 天', points: 168 },
  { value: '30d', label: '30 天', points: 180 },
  { value: '90d', label: '90 天', points: 180 },
];

export function TvlTrendAnalysis({ tvlData, isLoading }: TvlTrendAnalysisProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [showAssertions, setShowAssertions] = useState(false);

  const filteredData = useMemo(() => {
    if (!tvlData || tvlData.length === 0) return [];

    const rangeConfig = TIME_RANGES.find((r) => r.value === timeRange);
    if (!rangeConfig) return tvlData;

    const now = new Date();
    let hours: number;
    switch (timeRange) {
      case '1h':
        hours = 1;
        break;
      case '24h':
        hours = 24;
        break;
      case '7d':
        hours = 168;
        break;
      case '30d':
        hours = 720;
        break;
      case '90d':
        hours = 2160;
        break;
      default:
        hours = 168;
    }

    const cutoffTime = new Date(now.getTime() - hours * 60 * 60 * 1000);
    return tvlData
      .filter((point) => new Date(point.timestamp) >= cutoffTime)
      .slice(-rangeConfig.points);
  }, [tvlData, timeRange]);

  const tvlStats = useMemo(() => {
    if (filteredData.length === 0) return null;

    const tvlValues = filteredData.map((d) => d.tvl);
    const currentTvl = tvlValues[tvlValues.length - 1] || 0;
    const previousTvl = tvlValues[0] || 0;
    const change = currentTvl - previousTvl;
    const changePercent = previousTvl > 0 ? (change / previousTvl) * 100 : 0;

    const maxTvl = Math.max(...tvlValues);
    const minTvl = Math.min(...tvlValues);
    const avgTvl = tvlValues.reduce((sum, val) => sum + val, 0) / tvlValues.length;

    return {
      currentTvl,
      change,
      changePercent,
      maxTvl,
      minTvl,
      avgTvl,
    };
  }, [filteredData]);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number; name: string; color?: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length > 0) {
      return (
        <div className="rounded-lg border border-border bg-card p-3 text-sm shadow-lg">
          <p className="mb-2 font-semibold">{formatTime(label || '')}</p>
          {payload.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color || '#3b82f6' }}
              />
              <span className="text-muted-foreground">{item.name}:</span>
              <span className="font-semibold">
                {item.name === 'TVL'
                  ? `$${item.value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
                  : item.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">TVL 趋势分析</h3>
            <p className="text-sm text-muted-foreground">总锁仓价值历史趋势</p>
          </div>
        </div>
        <div className="flex h-80 items-center justify-center">
          <div className="text-sm text-muted-foreground">加载中...</div>
        </div>
      </div>
    );
  }

  if (!tvlData || tvlData.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">TVL 趋势分析</h3>
            <p className="text-sm text-muted-foreground">总锁仓价值历史趋势</p>
          </div>
        </div>
        <div className="flex h-80 items-center justify-center text-sm text-muted-foreground">
          暂无 TVL 数据
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">TVL 趋势分析</h3>
          <p className="text-sm text-muted-foreground">总锁仓价值历史趋势</p>
        </div>
        <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGES.map((range) => (
              <SelectItem key={range.value} value={range.value}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {tvlStats && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">当前 TVL</div>
            <div className="text-xl font-bold">
              $
              {tvlStats.currentTvl.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">变化量</div>
            <div
              className={cn(
                'text-xl font-bold',
                tvlStats.change >= 0 ? 'text-green-500' : 'text-red-500',
              )}
            >
              {tvlStats.change >= 0 ? '+' : ''}$
              {Math.abs(tvlStats.change).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">变化率</div>
            <div
              className={cn(
                'text-xl font-bold',
                tvlStats.changePercent >= 0 ? 'text-green-500' : 'text-red-500',
              )}
            >
              {tvlStats.changePercent >= 0 ? '+' : ''}
              {tvlStats.changePercent.toFixed(2)}%
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">最高 TVL</div>
            <div className="text-xl font-bold">
              $
              {tvlStats.maxTvl.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-3">
            <div className="text-xs text-muted-foreground">平均 TVL</div>
            <div className="text-xl font-bold">
              $
              {tvlStats.avgTvl.toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </div>
          </div>
        </div>
      )}

      <div className="mb-4 flex items-center gap-2">
        <label className="text-sm text-muted-foreground">显示断言数量</label>
        <input
          type="checkbox"
          checked={showAssertions}
          onChange={(e) => setShowAssertions(e.target.checked)}
          className="h-4 w-4"
        />
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {showAssertions ? (
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="colorTvl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => formatTime(value)}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                yAxisId="left"
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                tick={{ fontSize: 12 }}
              />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="tvl"
                name="TVL"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorTvl)"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="assertionCount"
                name="断言数"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
              />
            </AreaChart>
          ) : (
            <AreaChart data={filteredData}>
              <defs>
                <linearGradient id="colorTvlSimple" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={(value) => formatTime(value)}
                tick={{ fontSize: 12 }}
              />
              <YAxis
                tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                tick={{ fontSize: 12 }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="tvl"
                name="TVL"
                stroke="#3b82f6"
                fillOpacity={1}
                fill="url(#colorTvlSimple)"
              />
              <ReferenceLine
                y={tvlStats?.avgTvl || 0}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                label={{ value: '平均', fontSize: 12, fill: '#64748b' }}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        数据更新时间：{formatTime(new Date().toISOString())}
      </div>
    </div>
  );
}
