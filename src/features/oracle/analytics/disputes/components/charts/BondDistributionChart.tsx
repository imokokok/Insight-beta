'use client';

import { useMemo } from 'react';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import { formatNumber } from '@/shared/utils';
import type { Dispute, DisputeTrend } from '@/types/oracle/dispute';

interface BondDistributionChartProps {
  disputes: Dispute[];
  trends?: DisputeTrend[];
}

const BOND_RANGES = [
  { min: 0, max: 500, label: '0-500', color: '#93c5fd' },
  { min: 500, max: 1000, label: '500-1K', color: '#60a5fa' },
  { min: 1000, max: 5000, label: '1K-5K', color: '#3b82f6' },
  { min: 5000, max: Infinity, label: '5K+', color: '#1d4ed8' },
];

interface DistributionItem {
  name: string;
  range: string;
  count: number;
  totalBond: number;
  color: string;
}

export function BondDistributionChart({ disputes, trends }: BondDistributionChartProps) {
  const { t } = useI18n();

  const distributionData = useMemo(() => {
    const distribution = BOND_RANGES.map((range) => ({
      name: range.label,
      range: `${range.min}-${range.max === Infinity ? '+' : range.max}`,
      count: 0,
      totalBond: 0,
      color: range.color,
    }));

    disputes.forEach((dispute) => {
      const bond = dispute.bond + dispute.disputeBond;
      for (let i = 0; i < BOND_RANGES.length; i++) {
        const range = BOND_RANGES[i];
        const dist = distribution[i];
        if (range && dist && bond >= range.min && bond < range.max) {
          dist.count++;
          dist.totalBond += bond;
          break;
        }
      }
    });

    return distribution.filter(
      (d) => d.count > 0 || distribution.every((item) => item.count === 0),
    );
  }, [disputes]);

  const trendData = useMemo(() => {
    if (!trends || trends.length === 0) return null;

    return trends
      .slice()
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
      .slice(-14)
      .map((trend) => ({
        date: new Date(trend.timestamp).toLocaleDateString(),
        disputes: trend.totalDisputes,
      }));
  }, [trends]);

  const totalBond = useMemo(() => {
    return disputes.reduce((sum, d) => sum + d.bond + d.disputeBond, 0);
  }, [disputes]);

  const avgBond = useMemo(() => {
    if (disputes.length === 0) return 0;
    return totalBond / disputes.length;
  }, [disputes, totalBond]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: DistributionItem }>;
  }) => {
    if (active && payload && payload.length > 0) {
      const item = payload[0];
      if (!item) return null;
      const data = item.payload;
      return (
        <div className="rounded-lg border bg-white p-3 text-sm shadow-lg">
          <p className="mb-1 font-semibold" style={{ color: data.color }}>
            {data.name} {t('analytics:disputes.chart.bondUnit')}
          </p>
          <p className="text-gray-600">
            {t('analytics:disputes.chart.disputeCount')}: {data.count}
          </p>
          <p className="text-gray-600">
            {t('analytics:disputes.chart.totalBond')}: {formatNumber(data.totalBond, 2)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (disputes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('analytics:disputes.chart.bondDistribution')}</CardTitle>
          <CardDescription>{t('analytics:disputes.chart.bondDistributionDesc')}</CardDescription>
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
        <CardTitle>{t('analytics:disputes.chart.bondDistribution')}</CardTitle>
        <CardDescription>{t('analytics:disputes.chart.bondDistributionDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-blue-50 p-3">
            <div className="text-sm text-gray-500">{t('analytics:disputes.chart.totalBonded')}</div>
            <div className="text-xl font-bold text-blue-600">{formatNumber(totalBond, 2)}</div>
          </div>
          <div className="rounded-lg bg-indigo-50 p-3">
            <div className="text-sm text-gray-500">{t('analytics:disputes.chart.avgBond')}</div>
            <div className="text-xl font-bold text-indigo-600">{formatNumber(avgBond, 2)}</div>
          </div>
        </div>

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distributionData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59, 130, 246, 0.1)' }} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {distributionData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {trendData && trendData.length > 0 && (
          <>
            <div className="mb-2 mt-6 text-sm font-medium text-gray-700">
              {t('analytics:disputes.chart.bondTrend')}
            </div>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={trendData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="date" tick={{ fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9 }} axisLine={false} tickLine={false} hide />
                  <Tooltip
                    contentStyle={{
                      borderRadius: '8px',
                      border: 'none',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                      fontSize: '11px',
                    }}
                  />
                  <Bar
                    dataKey="disputes"
                    fill="#3b82f6"
                    radius={[2, 2, 0, 0]}
                    opacity={0.6}
                    name={t('analytics:disputes.chart.disputes')}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
