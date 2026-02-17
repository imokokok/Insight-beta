'use client';

import { useMemo } from 'react';

import { TrendingUp } from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  Line,
  ComposedChart,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useI18n } from '@/i18n';

import type { DisputeTrend } from '../types/disputes';

interface DisputeTrendChartProps {
  trends: DisputeTrend[];
}

function predictFuture(data: { total: number }[], days: number): number[] {
  if (data.length < 3) return [];
  
  const values = data.map(d => d.total);
  const n = values.length;
  
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i]!;
    sumXY += i * values[i]!;
    sumX2 += i * i;
  }
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  const predictions: number[] = [];
  for (let i = 0; i < days; i++) {
    const predicted = slope * (n + i) + intercept;
    predictions.push(Math.max(0, Math.round(predicted)));
  }
  
  return predictions;
}

interface ChartDataItem {
  date: string;
  total: number;
  active: number;
  resolved: number;
  isPrediction: boolean;
  index: number;
}

export function DisputeTrendChart({ trends }: DisputeTrendChartProps) {
  const { t } = useI18n();
  
  const { historicalData, combinedData } = useMemo(() => {
    const sorted = trends
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    const historical: ChartDataItem[] = sorted.map((d, index) => ({
      date: new Date(d.timestamp).toLocaleDateString(),
      total: d.totalDisputes,
      active: d.activeDisputes,
      resolved: d.resolvedDisputes,
      isPrediction: false,
      index,
    }));
    
    const predictions = predictFuture(historical, 7);
    
    const lastDate = sorted.length > 0 ? new Date(sorted[sorted.length - 1]!.timestamp) : new Date();
    const predicted: ChartDataItem[] = predictions.map((value, index) => {
      const futureDate = new Date(lastDate);
      futureDate.setDate(futureDate.getDate() + index + 1);
      return {
        date: futureDate.toLocaleDateString(),
        total: value,
        active: 0,
        resolved: 0,
        isPrediction: true,
        index: historical.length + index,
      };
    });
    
    return {
      historicalData: historical,
      combinedData: [...historical, ...predicted],
    };
  }, [trends]);

  const lastHistoricalIndex = historicalData.length - 1;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t('analytics:disputes.chart.disputeTrend')}
        </CardTitle>
        <CardDescription>{t('analytics:disputes.chart.disputeTrendDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={combinedData}>
              <defs>
                <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="activeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 10 }} 
                interval="preserveStartEnd"
                tickFormatter={(value: string, index: number) => {
                  if (index === lastHistoricalIndex + 1) return '';
                  return value;
                }}
              />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <Area
                type="monotone"
                dataKey={(d: ChartDataItem) => d.isPrediction ? undefined : d.total}
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#totalGradient)"
                name="Total"
              />
              <Area
                type="monotone"
                dataKey={(d: ChartDataItem) => d.isPrediction ? undefined : d.active}
                stroke="#f59e0b"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#activeGradient)"
                name="Active"
              />
              <Line
                type="monotone"
                dataKey={(d: ChartDataItem) => d.isPrediction ? d.total : undefined}
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                name="predicted"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500" />
            <span className="text-muted-foreground">{t('analytics:disputes.chart.historical')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-purple-500 border-dashed" style={{ borderStyle: 'dashed' }} />
            <span className="text-muted-foreground">{t('analytics:disputes.chart.predicted')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
