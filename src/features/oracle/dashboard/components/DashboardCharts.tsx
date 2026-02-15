'use client';

import { Activity, TrendingUp, BarChart3, Clock } from 'lucide-react';

import { EnhancedAreaChart, EnhancedLineChart, EnhancedBarChart } from '@/components/charts';
import { CHART_COLORS } from '@/components/charts';
import { ChartCard } from '@/components/common/ChartCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
      <TabsList className="w-full justify-start overflow-x-auto lg:w-auto">
        <TabsTrigger value="overview" className="gap-1 sm:gap-2">
          <Zap className="h-4 w-4" />
          <span className="hidden sm:inline">Overview</span>
          <span className="sm:hidden">Overview</span>
        </TabsTrigger>
        <TabsTrigger value="trends" className="gap-1 sm:gap-2">
          <TrendingUp className="h-4 w-4" />
          <span className="hidden sm:inline">Trends</span>
          <span className="sm:hidden">Trends</span>
        </TabsTrigger>
        <TabsTrigger value="comparison" className="gap-1 sm:gap-2">
          <BarChart3 className="h-4 w-4" />
          <span className="hidden sm:inline">Comparison</span>
          <span className="sm:hidden">Compare</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="space-y-3 sm:space-y-4">
        <div className="grid gap-3 sm:gap-4 xl:grid-cols-3">
          <div className="order-2 xl:order-1 xl:col-span-2">
            <ChartCard
              title="Price Trends"
              description="Real-time price updates across all protocols"
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
              title="Quick Stats"
              description="Key metrics at a glance"
              icon={<Activity className="h-5 w-5" />}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-card/50 p-3">
                  <span className="text-sm text-muted-foreground">Active Protocols</span>
                  <span className="text-lg font-bold text-foreground">{stats?.totalProtocols ?? 8}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-card/50 p-3">
                  <span className="text-sm text-muted-foreground">Total Feeds</span>
                  <span className="text-lg font-bold text-foreground">{stats?.totalPriceFeeds ?? 156}</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-card/50 p-3">
                  <span className="text-sm text-muted-foreground">Avg Update Time</span>
                  <span className="text-lg font-bold text-foreground">{stats?.avgLatency ?? 450}ms</span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-card/50 p-3">
                  <span className="text-sm text-muted-foreground">Health Score</span>
                  <span className="text-lg font-bold text-success">98.5%</span>
                </div>
              </div>
            </ChartCard>
          </div>
        </div>

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
          <ChartCard
            title="Latency Distribution"
            description="Response time across protocols"
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
            title="Protocol Comparison"
            description="Performance metrics by protocol"
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
            title="24h Price Movement"
            description="Price changes over the last 24 hours"
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
            title="Latency Trends"
            description="Network latency over time"
            icon={<Clock className="h-5 w-5" />}
          >
            <EnhancedLineChart
              data={latencyData}
              lines={[
                {
                  dataKey: 'value',
                  name: 'Latency',
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
          title="Protocol Performance Comparison"
          description="Compare key metrics across protocols"
          icon={<BarChart3 className="h-5 w-5" />}
        >
          <EnhancedBarChart
            data={comparisonData}
            bars={[
              { dataKey: 'latency', name: 'Latency (ms)', color: CHART_COLORS.series[0] },
              { dataKey: 'accuracy', name: 'Accuracy (%)', color: CHART_COLORS.series[1] },
              { dataKey: 'uptime', name: 'Uptime (%)', color: CHART_COLORS.series[2] },
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
