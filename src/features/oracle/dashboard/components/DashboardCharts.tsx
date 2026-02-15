'use client';

import { Activity, TrendingUp, BarChart3, Clock } from 'lucide-react';

import { EnhancedAreaChart, EnhancedLineChart, EnhancedBarChart } from '@/components/charts';
import { CHART_COLORS } from '@/components/charts';
import { ChartCard } from '@/components/common/ChartCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/i18n/LanguageProvider';
import { formatNumber } from '@/shared/utils';

import type { ChartDataPoint, ComparisonDataPoint } from '../types/dashboard';

interface DashboardChartsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isMobile: boolean;
  stats: any;
  priceChartConfig: any;
  comparisonChartConfig: any;
  latencyChartConfig: any;
  priceTrendData: ChartDataPoint[];
  comparisonData: ComparisonDataPoint[];
  latencyData: ChartDataPoint[];
}

export function DashboardCharts({
  activeTab,
  setActiveTab,
  isMobile,
  stats,
  priceChartConfig,
  comparisonChartConfig,
  latencyChartConfig,
  priceTrendData,
  comparisonData,
  latencyData,
}: DashboardChartsProps) {
  const { t } = useI18n();

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
      <TabsList className="w-full justify-start overflow-x-auto lg:w-auto">
        <TabsTrigger value="overview" className="gap-1 sm:gap-2">
          <Zap className="h-4 w-4" />
          <span className="hidden sm:inline">{t('dashboard.tabs.overview')}</span>
          <span className="sm:hidden">{t('dashboard.tabs.overview')}</span>
        </TabsTrigger>
        <TabsTrigger value="trends" className="gap-1 sm:gap-2">
          <TrendingUp className="h-4 w-4" />
          <span className="hidden sm:inline">{t('dashboard.tabs.trends')}</span>
          <span className="sm:hidden">{t('dashboard.tabs.trends')}</span>
        </TabsTrigger>
        <TabsTrigger value="comparison" className="gap-1 sm:gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">{t('dashboard.tabs.comparison')}</span>
          <span className="sm:hidden">{t('dashboard.tabs.compare')}</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-3 sm:space-y-4">
        <div className="grid gap-3 sm:gap-4 xl:grid-cols-3">
          <div className="order-2 xl:order-1 xl:col-span-2">
            <ChartCard
              title={t('dashboard.charts.priceTrends')}
              description={t('dashboard.charts.priceTrendsDesc')}
              icon={<TrendingUp className="h-5 w-5" />}
            >
              <EnhancedAreaChart
                data={priceChartConfig.data}
                dataKey={priceChartConfig.dataKey}
                color={priceChartConfig.color}
                height={isMobile ? 200 : 280}
                valueFormatter={priceChartConfig.valueFormatter}
                labelFormatter={priceChartConfig.labelFormatter}
                showGrid
                gradient
              />
            </ChartCard>
          </div>

          <div className="order-1 xl:order-2">
            <ChartCard
              title={t('dashboard.charts.quickStats')}
              description={t('dashboard.charts.quickStatsDesc')}
              icon={<Activity className="h-5 w-5" />}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-card/50 p-3">
                  <span className="text-sm text-muted-foreground">{t('dashboard.metrics.activeProtocols')}</span>
                  <span className="text-lg font-bold text-foreground">{stats?.totalProtocols ?? 8}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-card/50 p-3">
                  <span className="text-sm text-muted-foreground">{t('dashboard.metrics.totalFeeds')}</span>
                  <span className="text-lg font-bold text-foreground">{stats?.totalPriceFeeds ?? 156}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-card/50 p-3">
                  <span className="text-sm text-muted-foreground">{t('dashboard.metrics.avgUpdateTime')}</span>
                  <span className="text-lg font-bold text-foreground">{stats?.avgLatency ?? 450}ms</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-card/50 p-3">
                  <span className="text-sm text-muted-foreground">{t('dashboard.metrics.healthScore')}</span>
                  <span className="text-lg font-bold text-success">98.5%</span>
                </div>
              </div>
            </ChartCard>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          <ChartCard
            title={t('dashboard.charts.latencyDistribution')}
            description={t('dashboard.charts.latencyDistributionDesc')}
            icon={<Clock className="h-5 w-5" />}
          >
            <EnhancedLineChart
              data={latencyChartConfig.data}
              lines={latencyChartConfig.lines}
              height={isMobile ? 180 : 220}
              valueFormatter={latencyChartConfig.valueFormatter}
              showGrid
            />
          </ChartCard>

          <ChartCard
            title={t('dashboard.charts.protocolComparison')}
            description={t('dashboard.charts.protocolComparisonDesc')}
            icon={<BarChart3 className="h-5 w-5" />}
          >
            <EnhancedBarChart
              data={comparisonChartConfig.data}
              bars={comparisonChartConfig.bars}
              height={isMobile ? 180 : 220}
              valueFormatter={comparisonChartConfig.valueFormatter}
              showGrid
            />
          </ChartCard>
        </div>
      </TabsContent>

      <TabsContent value="trends" className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <ChartCard
            title={t('dashboard.charts.priceMovement24h')}
            description={t('dashboard.charts.priceMovement24hDesc')}
            icon={<TrendingUp className="h-5 w-5" />}
          >
            <EnhancedAreaChart
              data={priceTrendData}
              dataKey="value"
              color={CHART_COLORS.primary.DEFAULT}
              height={300}
              valueFormatter={(v) => `$${formatNumber(v, 2)}`}
              showGrid
              gradient
            />
          </ChartCard>

          <ChartCard
            title={t('dashboard.charts.latencyTrends')}
            description={t('dashboard.charts.latencyTrendsDesc')}
            icon={<Clock className="h-5 w-5" />}
          >
            <EnhancedLineChart
              data={latencyData}
              lines={[
                {
                  dataKey: 'value',
                  name: t('dashboard.metrics.latency'),
                  color: CHART_COLORS.semantic.warning.DEFAULT,
                },
              ]}
              height={300}
              valueFormatter={(v) => `${formatNumber(v, 0)}ms`}
              showGrid
            />
          </ChartCard>
        </div>
      </TabsContent>

      <TabsContent value="comparison" className="space-y-4">
        <ChartCard
          title={t('dashboard.charts.protocolPerformanceComparison')}
          description={t('dashboard.charts.protocolPerformanceComparisonDesc')}
          icon={<BarChart3 className="h-5 w-5" />}
        >
          <EnhancedBarChart
            data={comparisonData}
            bars={[
              { dataKey: 'latency', name: t('dashboard.metrics.latencyMs'), color: CHART_COLORS.series[0] },
              { dataKey: 'accuracy', name: t('dashboard.metrics.accuracyPercent'), color: CHART_COLORS.series[1] },
              { dataKey: 'uptime', name: t('dashboard.metrics.uptimePercent'), color: CHART_COLORS.series[2] },
            ]}
            height={400}
            valueFormatter={(v) => formatNumber(v, 1)}
            showGrid
            showLegend
          />
        </ChartCard>
      </TabsContent>
    </Tabs>
  );
}

function Zap({ className }: { className?: string }) {
  return <TrendingUp className={className} />;
}
