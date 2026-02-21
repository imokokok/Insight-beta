'use client';

import { useMemo } from 'react';

import { motion } from 'framer-motion';
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

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useI18n } from '@/i18n';

import type { TrendDataPoint } from '../hooks/useReliabilityScores';

interface ReliabilityTrendChartProps {
  data: TrendDataPoint[];
  protocol: string;
  isLoading?: boolean;
}

const protocolColors: Record<string, string> = {
  chainlink: '#3b82f6',
  pyth: '#a855f7',
  redstone: '#ef4444',
  uma: '#22c55e',
};

export function ReliabilityTrendChart({ data, protocol, isLoading }: ReliabilityTrendChartProps) {
  const { t } = useI18n();

  const chartData = useMemo(() => {
    return data.map((point) => ({
      date: new Date(point.date).toLocaleDateString(),
      score: point.score,
    }));
  }, [data]);

  const color = protocolColors[protocol.toLowerCase()] ?? '#6b7280';

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('oracle.reliability.trendTitle')}</CardTitle>
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
          <CardTitle>{t('oracle.reliability.trendTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            {t('oracle.reliability.noTrendData')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card>
        <CardHeader>
          <CardTitle className="capitalize">
            {protocol} {t('oracle.reliability.trendTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="score"
                  name={t('oracle.reliability.score')}
                  stroke={color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
