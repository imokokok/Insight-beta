'use client';

import { TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { useI18n } from '@/i18n/LanguageProvider';
import type { PriceDeviationPoint } from '../types/deviation';

interface DeviationTrendChartProps {
  dataPoints: PriceDeviationPoint[];
}

export function DeviationTrendChart({ dataPoints }: DeviationTrendChartProps) {
  const { t } = useI18n();
  
  const data = dataPoints
    .slice()
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
    .map((d) => ({
      time: new Date(d.timestamp).toLocaleTimeString(),
      deviation: d.maxDeviationPercent * 100,
      avgPrice: d.avgPrice,
      outlierCount: d.outlierProtocols.length,
    }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          {t('analytics.deviation.chart.deviationTrend')}
        </CardTitle>
        <CardDescription>{t('analytics.deviation.chart.deviationDescription')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="deviationGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="time" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} unit="%" />
              <Tooltip
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
                formatter={(value) => [`${Number(value).toFixed(2)}%`, t('common.maxDeviation')]}
              />
              <Area
                type="monotone"
                dataKey="deviation"
                stroke="#f97316"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#deviationGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
