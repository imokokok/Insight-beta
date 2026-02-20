'use client';

import { useMemo, memo } from 'react';

import { motion } from 'framer-motion';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/i18n';
import {
  CHART_COLORS,
  CHART_DIMENSIONS,
  CHART_ANIMATIONS,
  getSeriesColor,
} from '@/lib/design-system/tokens/visualization';
import { cn, formatNumber } from '@/shared/utils';
import { PROTOCOL_DISPLAY_NAMES, type OracleProtocol } from '@/types/oracle';

export interface ChartProtocolMetrics {
  protocol: OracleProtocol;
  latency: number;
  accuracy: number;
  updateFrequency: number;
  priceDeviation: number;
}

interface CompareChartsProps {
  metrics: ChartProtocolMetrics[];
  className?: string;
}

const PROTOCOL_COLORS: Record<OracleProtocol, string> = {
  chainlink: '#375BD2',
  pyth: '#EC255A',
  redstone: '#FF4444',
  uma: '#FF6B35',
  api3: '#6366F1',
  band: '#5E6AD2',
};

const MetricLabels: Record<string, string> = {
  latency: 'comparison.protocolCompare.metrics.latency',
  accuracy: 'comparison.protocolCompare.metrics.accuracy',
  updateFrequency: 'comparison.protocolCompare.metrics.updateFrequency',
  priceDeviation: 'comparison.protocolCompare.metrics.priceDeviation',
};

const metricKeys = ['latency', 'accuracy', 'updateFrequency', 'priceDeviation'] as const;

export const CompareCharts = memo(function CompareCharts({
  metrics,
  className,
}: CompareChartsProps) {
  const { t } = useI18n();

  const radarData = useMemo(() => {
    if (metrics.length === 0) return [];

    return metricKeys.map((key) => {
      const item: { metric: string; fullMark: number; [key: string]: string | number } = {
        metric: t(MetricLabels[key] ?? key),
        fullMark: 100,
      };

      metrics.forEach((m) => {
        let normalizedValue: number;
        if (key === 'latency' || key === 'priceDeviation') {
          const maxVal = Math.max(...metrics.map((p) => p[key]));
          normalizedValue = maxVal > 0 ? ((maxVal - m[key]) / maxVal) * 100 : 100;
        } else {
          normalizedValue = m[key];
        }
        item[m.protocol] = Math.max(0, Math.min(100, normalizedValue));
      });

      return item;
    });
  }, [metrics, t]);

  const barData = useMemo(() => {
    return metrics.map((m) => ({
      name: PROTOCOL_DISPLAY_NAMES[m.protocol],
      protocol: m.protocol,
      latency: m.latency,
      accuracy: m.accuracy,
      updateFrequency: m.updateFrequency,
      priceDeviation: m.priceDeviation,
    }));
  }, [metrics]);

  const CustomTooltip = useMemo(() => {
    return function TooltipContent({
      active,
      payload,
      label,
    }: {
      active?: boolean;
      payload?: Array<{ value: number; dataKey: string; color: string; name: string }>;
      label?: string;
    }) {
      if (!active || !payload?.length) return null;

      return (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-primary/10 bg-white p-4 shadow-xl"
        >
          <p className="mb-2 text-sm font-semibold text-gray-900">{label}</p>
          <div className="space-y-1.5">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="flex-1 text-sm text-gray-600">{entry.name}</span>
                <span className="text-sm font-bold text-gray-900">
                  {formatNumber(entry.value, 1)}
                  {entry.dataKey === 'accuracy' || entry.dataKey === 'updateFrequency' ? '%' : ''}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      );
    };
  }, []);

  if (metrics.length === 0) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">{t('comparison.protocolCompare.selectToCompare')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <Tabs defaultValue="radar" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="radar">{t('comparison.protocolCompare.radarChart')}</TabsTrigger>
          <TabsTrigger value="bar">{t('comparison.protocolCompare.barChart')}</TabsTrigger>
        </TabsList>

        <TabsContent value="radar" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t('comparison.protocolCompare.radarTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={CHART_DIMENSIONS.height.lg}>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke={CHART_COLORS.grid.line} />
                  <PolarAngleAxis
                    dataKey="metric"
                    tick={{ fill: CHART_COLORS.grid.text, fontSize: 12 }}
                  />
                  <PolarRadiusAxis
                    angle={30}
                    domain={[0, 100]}
                    tick={{ fill: CHART_COLORS.grid.text, fontSize: 10 }}
                  />
                  {metrics.map((m, index) => (
                    <Radar
                      key={m.protocol}
                      name={PROTOCOL_DISPLAY_NAMES[m.protocol]}
                      dataKey={m.protocol}
                      stroke={PROTOCOL_COLORS[m.protocol] || getSeriesColor(index)}
                      fill={PROTOCOL_COLORS[m.protocol] || getSeriesColor(index)}
                      fillOpacity={0.2}
                      strokeWidth={2}
                      animationDuration={CHART_ANIMATIONS.chart.animationDuration}
                    />
                  ))}
                  <Legend />
                  <Tooltip content={<CustomTooltip />} />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bar" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('comparison.protocolCompare.barTitle')}</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={CHART_DIMENSIONS.height.lg}>
                <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid.line} />
                  <XAxis dataKey="name" tick={{ fill: CHART_COLORS.grid.text, fontSize: 12 }} />
                  <YAxis tick={{ fill: CHART_COLORS.grid.text, fontSize: 12 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar
                    dataKey="latency"
                    name={t('comparison.protocolCompare.metrics.latency')}
                    fill={CHART_COLORS.semantic.warning.DEFAULT}
                    radius={[4, 4, 0, 0]}
                    animationDuration={CHART_ANIMATIONS.chart.animationDuration}
                  />
                  <Bar
                    dataKey="accuracy"
                    name={t('comparison.protocolCompare.metrics.accuracy')}
                    fill={CHART_COLORS.semantic.success.DEFAULT}
                    radius={[4, 4, 0, 0]}
                    animationDuration={CHART_ANIMATIONS.chart.animationDuration}
                  />
                  <Bar
                    dataKey="updateFrequency"
                    name={t('comparison.protocolCompare.metrics.updateFrequency')}
                    fill={CHART_COLORS.primary.DEFAULT}
                    radius={[4, 4, 0, 0]}
                    animationDuration={CHART_ANIMATIONS.chart.animationDuration}
                  />
                  <Bar
                    dataKey="priceDeviation"
                    name={t('comparison.protocolCompare.metrics.priceDeviation')}
                    fill={CHART_COLORS.semantic.error.DEFAULT}
                    radius={[4, 4, 0, 0]}
                    animationDuration={CHART_ANIMATIONS.chart.animationDuration}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
});
