'use client';

import { useMemo } from 'react';

import { motion } from 'framer-motion';
import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
  ComposedChart,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n';

import type { PublisherHistoryPoint } from '../types/pyth';

interface PublisherHistoryChartProps {
  data: PublisherHistoryPoint[];
  publisherName: string;
  isLoading?: boolean;
}

export function PublisherHistoryChart({
  data,
  publisherName,
  isLoading,
}: PublisherHistoryChartProps) {
  const { t } = useI18n();

  const { chartData, avgTrustScore, anomalyPoints } = useMemo(() => {
    const formattedData = data.map((point) => ({
      date: new Date(point.timestamp).toLocaleDateString(),
      trustScore: point.trustScore,
      avgTrustScore: point.avgTrustScore,
      isAnomaly: point.isAnomaly,
    }));

    const totalScore = formattedData.reduce((sum, point) => sum + point.trustScore, 0);
    const average = formattedData.length > 0 ? totalScore / formattedData.length : 0;

    const anomalies = formattedData
      .filter((point) => point.isAnomaly)
      .map((point) => ({
        date: point.date,
        trustScore: point.trustScore,
      }));

    return {
      chartData: formattedData,
      avgTrustScore: average,
      anomalyPoints: anomalies,
    };
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('oracle.pyth.publisherHistoryTitle')}</CardTitle>
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
          <CardTitle>{t('oracle.pyth.publisherHistoryTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            {t('oracle.pyth.noPublisherHistoryData')}
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
          <CardTitle>
            {publisherName} {t('oracle.pyth.trustScoreTrend')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
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
                <ReferenceLine
                  y={avgTrustScore}
                  stroke="#f59e0b"
                  strokeDasharray="5 5"
                  label={{
                    value: `${t('oracle.pyth.avgTrustScore')}: ${avgTrustScore.toFixed(1)}`,
                    position: 'right',
                    fill: '#f59e0b',
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="trustScore"
                  name={t('oracle.pyth.trustScore')}
                  stroke="#a855f7"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
                <Scatter
                  name={t('oracle.pyth.anomaly')}
                  data={anomalyPoints}
                  fill="#ef4444"
                  shape="circle"
                  r={6}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
