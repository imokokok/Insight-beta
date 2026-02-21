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
} from 'recharts';

import { Tabs, TabsList, TabsTrigger } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { useIsMobile } from '@/hooks';
import { useI18n } from '@/i18n';

import type { ProtocolPricePoint } from '../types/api3';

interface Api3DeviationTrendChartProps {
  pricePoints: ProtocolPricePoint[];
  className?: string;
}

interface ChartData {
  time: string;
  timestamp: string;
  api3VsChainlink: number;
  api3VsPyth: number;
}

export function Api3DeviationTrendChart({ pricePoints, className }: Api3DeviationTrendChartProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const [chartType, setChartType] = useState<'line' | 'area'>('line');

  const chartData = useMemo<ChartData[]>(() => {
    return pricePoints.map((point) => {
      const api3VsChainlink =
        ((point.api3Price - point.chainlinkPrice) / point.chainlinkPrice) * 100;
      const api3VsPyth = ((point.api3Price - point.pythPrice) / point.pythPrice) * 100;
      return {
        time: new Date(point.timestamp).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        timestamp: point.timestamp,
        api3VsChainlink,
        api3VsPyth,
      };
    });
  }, [pricePoints]);

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
                  {entry.name === 'api3VsChainlink' ? 'API3 vs Chainlink' : 'API3 vs Pyth'}
                </span>
                <span className="text-sm font-semibold">{entry.value.toFixed(4)}%</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  const ChartComponent = chartType === 'line' ? LineChart : AreaChart;
  const DataComponent = chartType === 'line' ? Line : Area;

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              {t('api3.deviation.trendTitle') || '偏差趋势图表'}
            </CardTitle>
            <CardDescription>
              {t('api3.deviation.trendDescription') || 'API3 与其他预言机价格偏差的时间序列'}
            </CardDescription>
          </div>
          <Tabs value={chartType} onValueChange={(v) => setChartType(v as 'line' | 'area')}>
            <TabsList>
              <TabsTrigger value="line">折线图</TabsTrigger>
              <TabsTrigger value="area">面积图</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent data={chartData}>
              {chartType === 'area' && (
                <defs>
                  <linearGradient id="chainlinkGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="pythGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
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
                unit="%"
                width={isMobile ? 40 : 50}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <DataComponent
                type="monotone"
                dataKey="api3VsChainlink"
                name="API3 vs Chainlink"
                stroke="#3b82f6"
                strokeWidth={2}
                fill={chartType === 'area' ? 'url(#chainlinkGradient)' : 'none'}
                dot={false}
                activeDot={{ r: 5 }}
              />
              <DataComponent
                type="monotone"
                dataKey="api3VsPyth"
                name="API3 vs Pyth"
                stroke="#f59e0b"
                strokeWidth={2}
                fill={chartType === 'area' ? 'url(#pythGradient)' : 'none'}
                dot={false}
                activeDot={{ r: 5 }}
              />
            </ChartComponent>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
