'use client';

import { useMemo } from 'react';

import { motion } from 'framer-motion';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Scatter,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n';

import type { ConfidenceHistoryPoint, ConfidenceHistoryResponse } from '../types/pyth';

interface ConfidenceIntervalChartProps {
  data: ConfidenceHistoryPoint[];
  symbol: string;
  isLoading?: boolean;
}

export function ConfidenceIntervalChart({ data, symbol, isLoading }: ConfidenceIntervalChartProps) {
  const { t } = useI18n();

  const chartData = useMemo(() => {
    return data.map((point) => ({
      time: new Date(point.timestamp).toLocaleString(),
      confidence: point.confidence,
      avgConfidence: point.avgConfidence,
      isAnomaly: point.isAnomaly,
    }));
  }, [data]);

  const anomalyPoints = useMemo(() => {
    return chartData.filter((point) => point.isAnomaly);
  }, [chartData]);

  const overallAvgConfidence = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, point) => acc + point.confidence, 0);
    return sum / chartData.length;
  }, [chartData]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('oracle.pyth.confidenceIntervalTitle')}</CardTitle>
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
          <CardTitle>{t('oracle.pyth.confidenceIntervalTitle')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-muted-foreground">
            {t('oracle.pyth.noConfidenceData')}
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
            {symbol} {t('oracle.pyth.confidenceIntervalTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="time"
                  tick={{ fontSize: 10 }}
                  className="text-muted-foreground"
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 12 }}
                  className="text-muted-foreground"
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                  formatter={(value) => [`${Number(value).toFixed(2)}%`, '']}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="confidence"
                  name={t('oracle.pyth.confidence')}
                  fill="#a855f7"
                  fillOpacity={0.3}
                  stroke="#a855f7"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="avgConfidence"
                  name={t('oracle.pyth.avgConfidence')}
                  stroke="#3b82f6"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                />
                <ReferenceLine
                  y={overallAvgConfidence}
                  stroke="#22c55e"
                  strokeDasharray="3 3"
                  label={{
                    value: t('oracle.pyth.overallAvg'),
                    position: 'right',
                    fontSize: 10,
                    fill: '#22c55e',
                  }}
                />
                <Scatter
                  name={t('oracle.pyth.anomalyPoints')}
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

export type { ConfidenceHistoryPoint, ConfidenceHistoryResponse };
