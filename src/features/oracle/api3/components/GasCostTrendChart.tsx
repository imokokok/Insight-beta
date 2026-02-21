'use client';

import { useState, useMemo } from 'react';

import { TrendingUp } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from 'recharts';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { useIsMobile } from '@/hooks';
import { useI18n } from '@/i18n';

import type { GasCostTrendPoint } from '../types/api3';

interface GasCostTrendChartProps {
  trend: GasCostTrendPoint[];
  className?: string;
}

interface ChartData {
  time: string;
  timestamp: string;
  gasUsed: number;
  costUsd: number;
  transactionCount: number;
}

export function GasCostTrendChart({ trend, className }: GasCostTrendChartProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [metricType, setMetricType] = useState<'gas' | 'cost' | 'transactions'>('cost');

  const chartData = useMemo<ChartData[]>(() => {
    return trend.map((point) => ({
      time: new Date(point.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      timestamp: point.timestamp,
      gasUsed: point.gasUsed,
      costUsd: point.costUsd,
      transactionCount: point.transactionCount,
    }));
  }, [trend]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{
      value: number;
      name: string;
      color: string;
      payload: { timestamp: string };
    }>;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-white p-3 shadow-lg">
          <p className="mb-2 text-xs text-muted-foreground">
            {new Date(payload[0]!.payload.timestamp).toLocaleString()}
          </p>
          <div className="space-y-1">
            {payload.map((entry, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-muted-foreground">
                  {entry.name === 'gasUsed'
                    ? 'Gas Used'
                    : entry.name === 'costUsd'
                      ? 'Cost (USD)'
                      : 'Transactions'}
                </span>
                <span className="text-sm font-semibold">
                  {entry.name === 'gasUsed'
                    ? entry.value.toLocaleString()
                    : entry.name === 'costUsd'
                      ? `$${entry.value.toFixed(4)}`
                      : entry.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const getChartComponent = () => {
    switch (chartType) {
      case 'bar':
        return BarChart;
      case 'area':
        return AreaChart;
      default:
        return LineChart;
    }
  };

  const getDataComponent = () => {
    switch (chartType) {
      case 'bar':
        return Bar;
      case 'area':
        return Area;
      default:
        return Line;
    }
  };

  const getDataKey = () => {
    switch (metricType) {
      case 'gas':
        return 'gasUsed';
      case 'transactions':
        return 'transactionCount';
      default:
        return 'costUsd';
    }
  };

  const getYAxisUnit = () => {
    switch (metricType) {
      case 'gas':
        return '';
      case 'transactions':
        return '';
      default:
        return '$';
    }
  };

  const getColor = () => {
    switch (metricType) {
      case 'gas':
        return '#8b5cf6';
      case 'transactions':
        return '#10b981';
      default:
        return '#f59e0b';
    }
  };

  const getName = () => {
    switch (metricType) {
      case 'gas':
        return 'Gas Used';
      case 'transactions':
        return 'Transactions';
      default:
        return 'Cost (USD)';
    }
  };

  const ChartComponent = getChartComponent();
  const DataComponent = getDataComponent();

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t('api3.gas.trendTitle') || 'Gas 成本趋势'}
            </CardTitle>
            <CardDescription>
              {t('api3.gas.trendDescription') || 'Gas 消耗和成本的时间序列分析'}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Tabs
              value={metricType}
              onValueChange={(v) => setMetricType(v as 'gas' | 'cost' | 'transactions')}
            >
              <TabsList>
                <TabsTrigger value="cost">成本</TabsTrigger>
                <TabsTrigger value="gas">Gas</TabsTrigger>
                <TabsTrigger value="transactions">交易</TabsTrigger>
              </TabsList>
            </Tabs>
            <Tabs
              value={chartType}
              onValueChange={(v) => setChartType(v as 'line' | 'area' | 'bar')}
            >
              <TabsList>
                <TabsTrigger value="line">折线</TabsTrigger>
                <TabsTrigger value="area">面积</TabsTrigger>
                <TabsTrigger value="bar">柱状</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent data={chartData}>
              {chartType === 'area' && (
                <defs>
                  <linearGradient id="gasGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={getColor()} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={getColor()} stopOpacity={0} />
                  </linearGradient>
                </defs>
              )}
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="time"
                tick={{ fontSize: isMobile ? 9 : 11 }}
                interval="preserveStartEnd"
                className="text-muted-foreground"
              />
              <YAxis
                tick={{ fontSize: isMobile ? 10 : 12 }}
                className="text-muted-foreground"
                unit={getYAxisUnit()}
                width={isMobile ? 40 : 50}
                tickFormatter={(value) => {
                  if (metricType === 'gas') {
                    return value >= 1000000
                      ? `${(value / 1000000).toFixed(1)}M`
                      : value >= 1000
                        ? `${(value / 1000).toFixed(0)}K`
                        : value;
                  }
                  return value;
                }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <DataComponent
                type="monotone"
                dataKey={getDataKey()}
                name={getName()}
                stroke={getColor()}
                strokeWidth={2}
                fill={
                  chartType === 'area'
                    ? 'url(#gasGradient)'
                    : chartType === 'bar'
                      ? getColor()
                      : 'none'
                }
                dot={chartType === 'line' ? false : undefined}
                activeDot={{ r: 5 }}
              />
            </ChartComponent>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
