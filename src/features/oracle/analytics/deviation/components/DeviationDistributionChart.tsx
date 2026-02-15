'use client';

import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { useI18n } from '@/i18n/LanguageProvider';
import type { DeviationTrend } from '../types/deviation';

interface DeviationDistributionChartProps {
  trends: DeviationTrend[];
}

export function DeviationDistributionChart({ trends }: DeviationDistributionChartProps) {
  const { t } = useI18n();
  
  const data = trends
    .slice(0, 10)
    .sort((a, b) => b.avgDeviation - a.avgDeviation)
    .map((t) => ({
      symbol: t.symbol,
      deviation: t.avgDeviation * 100,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          {t('analytics.deviation.chart.deviationDistribution')}
        </CardTitle>
        <CardDescription>{t('analytics.deviation.chart.deviationDistributionDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                dataKey="symbol"
                tick={{ fontSize: 12 }}
                angle={-45}
                textAnchor="end"
                height={80}
              />
              <YAxis tick={{ fontSize: 12 }} unit="%" />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(value) => [`${Number(value).toFixed(2)}%`, t('common.avgDeviation')]}
              />
              <Bar dataKey="deviation" fill="#f97316" radius={[4, 4, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.deviation > 2 ? '#ef4444' : '#f97316'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
