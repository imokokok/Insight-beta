'use client';

import { useMemo } from 'react';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import type { PriceHistoryRecord } from '@/features/oracle/analytics/deviation/hooks/usePriceHistory';
import { useI18n } from '@/i18n';

interface HistoricalDeviationChartProps {
  data: PriceHistoryRecord[];
  isLoading?: boolean;
}

const protocolColors: Record<string, string> = {
  chainlink: '#3b82f6',
  pyth: '#a855f7',
  redstone: '#ef4444',
};

export function HistoricalDeviationChart({ data, isLoading }: HistoricalDeviationChartProps) {
  const { t } = useI18n();

  const chartData = useMemo(() => {
    const grouped = new Map<string, Record<string, string | number>>();

    data.forEach((record) => {
      if (!record.deviation) return;

      const date = new Date(record.timestamp).toLocaleDateString();
      const key = date;

      if (!grouped.has(key)) {
        grouped.set(key, { date });
      }

      const entry = grouped.get(key)!;
      const existingDeviation = (entry[record.protocol] as number) ?? 0;
      entry[record.protocol] = Math.max(existingDeviation, record.deviation * 100);
    });

    return Array.from(grouped.values())
      .map((item) => ({
        ...item,
        date: item.date as string,
      }))
      .slice(-30);
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('analytics.deviation.historicalDeviationTitle')}</CardTitle>
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
          <CardTitle>{t('analytics.deviation.historicalDeviationTitle')}</CardTitle>
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
        <CardTitle>{t('analytics.deviation.historicalDeviationTitle')}</CardTitle>
        <CardDescription>{t('analytics.deviation.historicalDeviationDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                className="text-muted-foreground"
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
                label={{
                  value: '%',
                  angle: -90,
                  position: 'insideLeft',
                }}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                }}
                formatter={(value) => [`${Number(value).toFixed(3)}%`, '']}
              />
              {Object.entries(protocolColors).map(([protocol, color]) => (
                <Bar
                  key={protocol}
                  dataKey={protocol}
                  name={protocol.charAt(0).toUpperCase() + protocol.slice(1)}
                  fill={color}
                  opacity={0.8}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
