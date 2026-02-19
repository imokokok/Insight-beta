'use client';

import { useMemo } from 'react';

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
import type { PriceHistoryRecord } from '@/features/oracle/analytics/deviation/hooks/usePriceHistory';
import { useI18n } from '@/i18n';

interface HistoricalPriceChartProps {
  data: PriceHistoryRecord[];
  isLoading?: boolean;
}

const protocolColors: Record<string, string> = {
  chainlink: '#3b82f6',
  pyth: '#a855f7',
  redstone: '#ef4444',
};

export function HistoricalPriceChart({ data, isLoading }: HistoricalPriceChartProps) {
  const { t } = useI18n();

  const chartData = useMemo(() => {
    const grouped = new Map<string, Record<string, string | number>>();

    data.forEach((record) => {
      const date = new Date(record.timestamp).toLocaleDateString();
      const key = `${record.timestamp}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          timestamp: record.timestamp,
          date,
        });
      }

      const entry = grouped.get(key)!;
      entry[`${record.protocol}_price`] = record.price;
      if (record.source_price) {
        entry['reference'] = record.source_price;
      }
    });

    return Array.from(grouped.values())
      .map((item) => ({
        ...item,
        date: item.date as string,
        timestamp: item.timestamp as string,
      }))
      .sort(
        (a, b) =>
          new Date(a.timestamp as string).getTime() - new Date(b.timestamp as string).getTime(),
      );
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('analytics.deviation.historicalPriceTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 animate-pulse rounded bg-muted" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('analytics.deviation.historicalPriceTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            {t('analytics.deviation.noHistoricalData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('analytics.deviation.historicalPriceTitle')}</CardTitle>
        <CardDescription>{t('analytics.deviation.historicalPriceDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value) => [`$${Number(value).toFixed(2)}`, '']}
              />
              <Legend />
              {Object.entries(protocolColors).map(([protocol, color]) => (
                <Line
                  key={protocol}
                  type="monotone"
                  dataKey={`${protocol}_price`}
                  name={protocol.charAt(0).toUpperCase() + protocol.slice(1)}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              ))}
              <Line
                type="monotone"
                dataKey="reference"
                name="Reference"
                stroke="#6b7280"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
