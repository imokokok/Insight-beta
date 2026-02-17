'use client';

import { useMemo } from 'react';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useI18n } from '@/i18n';

import type { Dispute } from '../../types/disputes';

interface DisputeResultChartProps {
  disputes: Dispute[];
}

const COLORS = {
  active: '#f59e0b',
  success: '#22c55e',
  failed: '#ef4444',
};

interface ChartDataItem {
  name: string;
  value: number;
  color: string;
}

export function DisputeResultChart({ disputes }: DisputeResultChartProps) {
  const { t } = useI18n();

  const chartData = useMemo(() => {
    const active = disputes.filter((d) => d.status === 'active').length;
    const success = disputes.filter(
      (d) => d.status === 'resolved' && d.resolutionResult === true
    ).length;
    const failed = disputes.filter(
      (d) => d.status === 'resolved' && d.resolutionResult === false
    ).length;

    return [
      { name: t('analytics:disputes.chart.resultActive'), value: active, color: COLORS.active },
      { name: t('analytics:disputes.chart.resultSuccess'), value: success, color: COLORS.success },
      { name: t('analytics:disputes.chart.resultFailed'), value: failed, color: COLORS.failed },
    ].filter((item) => item.value > 0);
  }, [disputes, t]);

  const total = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; payload: ChartDataItem }>;
  }) => {
    if (active && payload && payload.length > 0) {
      const item = payload[0];
      if (!item) return null;
      const percentage = total > 0 ? ((item.value / total) * 100).toFixed(1) : '0';
      return (
        <div className="rounded-lg border bg-white p-3 text-sm shadow-lg">
          <p className="mb-1 font-semibold" style={{ color: item.payload.color }}>
            {item.name}
          </p>
          <p className="text-gray-600">
            {t('analytics:disputes.chart.count')}: {item.value}
          </p>
          <p className="text-gray-600">
            {t('analytics:disputes.chart.percentage')}: {percentage}%
          </p>
        </div>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('analytics:disputes.chart.resultDistribution')}</CardTitle>
          <CardDescription>{t('analytics:disputes.chart.resultDistributionDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-sm text-gray-400">
            {t('analytics:disputes.disputes.empty')}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('analytics:disputes.chart.resultDistribution')}</CardTitle>
        <CardDescription>{t('analytics:disputes.chart.resultDistributionDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                layout="horizontal"
                align="center"
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          {chartData.map((item) => (
            <div key={item.name} className="rounded-lg bg-gray-50 p-3">
              <div className="text-2xl font-bold" style={{ color: item.color }}>
                {item.value}
              </div>
              <div className="text-xs text-gray-500">{item.name}</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
