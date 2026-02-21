'use client';

import { useState, useMemo } from 'react';

import { BarChart3, Activity, Clock, Zap } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

import type { DataSource } from '../types';

interface DataSourcePerformanceComparisonProps {
  sources: DataSource[];
  className?: string;
}

interface MetricConfig {
  key: keyof DataSource;
  label: string;
  icon: React.ReactNode;
  format: (value: number) => string;
  higherIsBetter: boolean;
}

const METRIC_CONFIGS: MetricConfig[] = [
  {
    key: 'reliabilityScore',
    label: '可靠性评分',
    icon: <Activity className="h-4 w-4" />,
    format: (v) => `${v.toFixed(1)}%`,
    higherIsBetter: true,
  },
  {
    key: 'updateFrequency',
    label: '更新频率',
    icon: <Zap className="h-4 w-4" />,
    format: (v) => `${v.toFixed(1)}/h`,
    higherIsBetter: true,
  },
  {
    key: 'lastUpdateLatency',
    label: '更新延迟',
    icon: <Clock className="h-4 w-4" />,
    format: (v) => `${v}ms`,
    higherIsBetter: false,
  },
];

const getBarColor = (value: number, max: number, higherIsBetter: boolean): string => {
  const ratio = higherIsBetter ? value / max : 1 - value / max;
  if (ratio >= 0.8) return 'bg-emerald-500';
  if (ratio >= 0.6) return 'bg-blue-500';
  if (ratio >= 0.4) return 'bg-amber-500';
  return 'bg-red-500';
};

function MetricBarChart({
  sources,
  metric,
}: {
  sources: DataSource[];
  metric: MetricConfig;
}) {
  const values = sources.map((s) => Number(s[metric.key]) || 0);
  const maxValue = Math.max(...values, 1);

  return (
    <div className="space-y-3">
      {sources.map((source, index) => {
        const value = Number(source[metric.key]) || 0;
        const percentage = (value / maxValue) * 100;
        const barColor = getBarColor(value, maxValue, metric.higherIsBetter);

        return (
          <div key={source.sourceId} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium truncate max-w-[200px]">{source.name}</span>
              <span className="font-mono text-muted-foreground">{metric.format(value)}</span>
            </div>
            <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full ${barColor} transition-all duration-500`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function DataSourcePerformanceComparison({
  sources,
  className,
}: DataSourcePerformanceComparisonProps) {
  const [activeMetric, setActiveMetric] = useState<string>('reliabilityScore');

  const currentMetric = useMemo(
    () => METRIC_CONFIGS.find((m) => m.key === activeMetric) || METRIC_CONFIGS[0],
    [activeMetric],
  );

  const sortedSources = useMemo(() => {
    return [...sources].sort((a, b) => {
      const aVal = Number(a[currentMetric.key]) || 0;
      const bVal = Number(b[currentMetric.key]) || 0;
      return currentMetric.higherIsBetter ? bVal - aVal : aVal - bVal;
    });
  }, [sources, currentMetric]);

  if (sources.length < 2) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            数据源性能对比
          </CardTitle>
          <CardDescription>需要至少2个数据源才能进行对比</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              数据源性能对比
            </CardTitle>
            <CardDescription>对比{sources.length}个数据源的关键指标</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeMetric} onValueChange={setActiveMetric}>
          <TabsList className="grid w-full grid-cols-3">
            {METRIC_CONFIGS.map((metric) => (
              <TabsTrigger key={metric.key} value={metric.key} className="flex items-center gap-1.5">
                {metric.icon}
                <span className="hidden sm:inline">{metric.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
          {METRIC_CONFIGS.map((metric) => (
            <TabsContent key={metric.key} value={metric.key} className="pt-4">
              <div className="mb-2 flex items-center justify-between">
                <Badge variant="secondary">
                  排名 1: {sortedSources[0]?.name}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {metric.higherIsBetter ? '越高越好' : '越低越好'}
                </span>
              </div>
              <MetricBarChart sources={sortedSources} metric={metric} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
