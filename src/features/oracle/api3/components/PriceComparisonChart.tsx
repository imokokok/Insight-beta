'use client';

import { useState, useMemo } from 'react';

import { DollarSign } from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import { useIsMobile } from '@/hooks';

import type { ProtocolPricePoint } from '../types/api3';

interface PriceComparisonChartProps {
  pricePoints: ProtocolPricePoint[];
  symbol?: string;
  className?: string;
}

interface ChartData {
  time: string;
  timestamp: string;
  API3: number;
  Chainlink: number;
  Pyth: number;
}

export function PriceComparisonChart({ pricePoints, symbol = 'ETH', className }: PriceComparisonChartProps) {
  const { t } = useI18n();
  const isMobile = useIsMobile();

  const chartData = useMemo<ChartData[]>(() => {
    return pricePoints.map((point) => ({
      time: new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: point.timestamp,
      API3: point.api3Price,
      Chainlink: point.chainlinkPrice,
      Pyth: point.pythPrice,
    }));
  }, [pricePoints]);

  const formatPrice = (price: number): string => {
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border bg-white p-3 shadow-lg">
          <p className="text-xs text-muted-foreground mb-2">
            {new Date(payload[0].payload.timestamp).toLocaleString()}
          </p>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-muted-foreground">{entry.name}</span>
                <span className="text-sm font-semibold">{formatPrice(entry.value)}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          {t('api3.deviation.priceComparisonTitle') || '价格对比图表'}
        </CardTitle>
        <CardDescription>
          {t('api3.deviation.priceComparisonDescription') || `${symbol}/USD 在不同预言机的实时价格对比`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
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
                tickFormatter={(v) => `$${v.toFixed(0)}`}
                domain={['auto', 'auto']}
                width={isMobile ? 50 : 60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line
                type="monotone"
                dataKey="API3"
                name="API3"
                stroke="#3b82f6"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="Chainlink"
                name="Chainlink"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="Pyth"
                name="Pyth"
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="3 3"
                dot={false}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
