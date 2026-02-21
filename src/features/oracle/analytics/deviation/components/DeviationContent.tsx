'use client';

import { useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  RefreshCw,
  Search,
  ChevronRight,
  BarChart3,
  Zap,
  History,
} from 'lucide-react';

import { AutoRefreshControl } from '@/components/common/AutoRefreshControl';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { ToastContainer, useToast } from '@/components/common/DashboardToast';
import { StatCard, StatCardGroup, DashboardStatsSection } from '@/components/common/StatCard';
import { Button } from '@/components/ui';
import { ErrorBanner } from '@/components/ui';
import { RefreshIndicator } from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Input } from '@/components/ui';
import { StatCardSkeleton, ChartSkeleton, CardSkeleton, SkeletonList } from '@/components/ui';
import {
  TrendList,
  AnomalyList,
  TrendDetails,
  ProtocolPriceComparison,
  DeviationDistributionChart,
  DeviationHeatmap,
  AnalysisPeriodCard,
} from '@/features/oracle/analytics/deviation';
import { HistoricalDeviationChart } from '@/features/oracle/analytics/deviation/components/charts/HistoricalDeviationChart';
import { HistoricalPriceChart } from '@/features/oracle/analytics/deviation/components/charts/HistoricalPriceChart';
import { ExportButton } from '@/features/oracle/analytics/deviation/components/export';
import {
  ProtocolFilter,
  TimeRangeSelector,
} from '@/features/oracle/analytics/deviation/components/filters';
import {
  WelcomeGuide,
  HelpTooltip,
} from '@/features/oracle/analytics/deviation/components/onboarding';
import {
  useDeviationAnalytics,
  usePriceHistory,
} from '@/features/oracle/analytics/deviation/hooks';
import { useIsMobile } from '@/hooks';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

interface DeviationContentProps {
  onRefresh?: () => void;
}

const tabContentVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

export function DeviationContent({ onRefresh }: DeviationContentProps) {
  const { t } = useI18n();
  const { toasts, removeToast } = useToast();
  const isMobile = useIsMobile();

  const {
    loading,
    report,
    selectedTrend,
    setSelectedTrend,
    selectedAnomaly,
    setSelectedAnomaly,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    symbolData,
    lastUpdated,
    error,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    refreshInterval,
    setRefreshInterval,
    timeUntilRefresh,
    refresh,
    filteredTrends,
    timeRange,
    timeRangePreset,
    customStartTime,
    customEndTime,
    setTimeRangePreset,
    setCustomTimeRange,
    selectedProtocols,
    isAllProtocolsSelected,
    toggleProtocol,
    toggleAllProtocols,
  } = useDeviationAnalytics();

  const handleRefresh = onRefresh || refresh;

  const breadcrumbItems = [
    { label: t('nav.oracleAnalytics'), href: '/oracle/analytics' },
    { label: t('analytics.deviation.pageName') },
  ];

  if (error && !loading && !report) {
    return (
      <div className="space-y-6">
        <Breadcrumb items={breadcrumbItems} />
        <ErrorBanner
          error={new Error(error)}
          onRetry={() => handleRefresh()}
          title={t('analytics.deviation.failedToLoad')}
          isRetrying={loading}
        />
      </div>
    );
  }

  const summary = report?.summary;

  const enhancedStats = summary
    ? [
        {
          title: t('analytics:deviation.summary.totalSymbols'),
          value: summary.totalSymbols,
          icon: <BarChart3 className="h-5 w-5" />,
          color: 'blue' as const,
          tooltip: t('analytics.deviation.help.totalSymbols'),
        },
        {
          title: t('analytics:deviation.summary.highDeviation'),
          value: summary.symbolsWithHighDeviation,
          icon: <AlertTriangle className="h-5 w-5" />,
          color: 'red' as const,
          tooltip: t('analytics.deviation.help.highDeviation'),
        },
        {
          title: t('analytics:deviation.summary.avgDeviation'),
          value: `${(summary.avgDeviationAcrossAll * 100).toFixed(2)}%`,
          icon: <Activity className="h-5 w-5" />,
          color: 'amber' as const,
          tooltip: t('analytics.deviation.help.avgDeviation'),
        },
        {
          title: t('analytics:deviation.summary.mostVolatile'),
          value: summary.mostVolatileSymbol || 'N/A',
          icon: <Zap className="h-5 w-5" />,
          color: 'purple' as const,
          tooltip: t('analytics.deviation.help.mostVolatile'),
        },
      ]
    : [];

  return (
    <div className="space-y-4 sm:space-y-6">
      <Breadcrumb items={breadcrumbItems} />

      <WelcomeGuide />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold sm:gap-3 sm:text-xl lg:text-2xl xl:text-3xl">
            <span className="text-orange-600">{t('analytics.deviation.pageName')}</span>
            <HelpTooltip content={t('analytics.deviation.help.pageOverview')} side="right" />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('analytics.deviation.pageDescription')}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-10 sm:h-9"
              onClick={() => handleRefresh()}
              disabled={loading}
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
              {t('common.refresh')}
            </Button>
            <ExportButton report={report} disabled={loading} />
            <AutoRefreshControl
              isEnabled={autoRefreshEnabled}
              onToggle={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              interval={refreshInterval}
              onIntervalChange={setRefreshInterval}
              timeUntilRefresh={timeUntilRefresh}
            />
          </div>
          <RefreshIndicator
            lastUpdated={lastUpdated}
            isRefreshing={loading}
            onRefresh={handleRefresh}
          />
        </div>
      </div>

      <Card className="border-border/50 bg-gradient-to-r from-card to-muted/20">
        <CardContent className="p-3 sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:gap-4">
            <TimeRangeSelector
              preset={timeRangePreset}
              timeRange={timeRange}
              customStartTime={customStartTime}
              customEndTime={customEndTime}
              onPresetChange={setTimeRangePreset}
              onCustomRangeChange={setCustomTimeRange}
            />
            <ProtocolFilter
              selectedProtocols={selectedProtocols}
              isAllSelected={isAllProtocolsSelected}
              onToggleProtocol={toggleProtocol}
              onToggleAll={toggleAllProtocols}
            />
          </div>
        </CardContent>
      </Card>

      <DashboardStatsSection
        title={t('analytics.deviation.summary.title')}
        icon={<BarChart3 className="h-4 w-4" />}
        color="blue"
        className="overflow-hidden"
      >
        {loading && !report ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </div>
        ) : (
          <StatCardGroup columns={isMobile ? 2 : 4} gap="md">
            {enhancedStats.map((stat, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.3 }}
              >
                <StatCard
                  title={stat.title}
                  value={stat.value}
                  icon={stat.icon}
                  color={stat.color}
                  tooltip={stat.tooltip}
                  variant="detailed"
                />
              </motion.div>
            ))}
          </StatCardGroup>
        )}
      </DashboardStatsSection>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-lg bg-muted/30 p-1"
        >
          <TabsList className="grid w-full grid-cols-4 bg-transparent">
            <TabsTrigger value="overview" className="h-11 text-xs sm:h-10 sm:text-sm">
              <Activity className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('analytics.deviation.tabs.overview')}</span>
              <span className="sm:hidden">
                {t('analytics.deviation.tabs.overviewShort') ||
                  t('analytics.deviation.tabs.overview')}
              </span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="h-11 text-xs sm:h-10 sm:text-sm">
              <TrendingUp className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('analytics.deviation.tabs.trends')}</span>
              <span className="sm:hidden">
                {t('analytics.deviation.tabs.trendsShort') || t('analytics.deviation.tabs.trends')}
              </span>
              <span className="ml-1">({filteredTrends.length})</span>
            </TabsTrigger>
            <TabsTrigger value="anomalies" className="h-11 text-xs sm:h-10 sm:text-sm">
              <AlertTriangle className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('analytics.deviation.tabs.anomalies')}</span>
              <span className="sm:hidden">
                {t('analytics.deviation.tabs.anomaliesShort') ||
                  t('analytics.deviation.tabs.anomalies')}
              </span>
              <span className="ml-1">({report?.anomalies.length || 0})</span>
            </TabsTrigger>
            <TabsTrigger value="history" className="h-11 text-xs sm:h-10 sm:text-sm">
              <History className="mr-1 h-3 w-3 sm:mr-2 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t('analytics.deviation.tabs.history')}</span>
              <span className="sm:hidden">
                {t('analytics.deviation.tabs.historyShort') ||
                  t('analytics.deviation.tabs.history')}
              </span>
            </TabsTrigger>
          </TabsList>
        </motion.div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={tabContentVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'overview' && (
              <TabsContent value="overview" className="mt-0 space-y-4 sm:space-y-6">
                <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                  {loading && !report ? (
                    <>
                      <ChartSkeleton />
                      <CardSkeleton />
                    </>
                  ) : (
                    <>
                      <DeviationDistributionChart trends={filteredTrends} />
                      <AnalysisPeriodCard report={report} />
                    </>
                  )}
                </div>
                {loading && !report ? (
                  <ChartSkeleton />
                ) : (
                  <DeviationHeatmap trends={filteredTrends} anomalies={report?.anomalies} />
                )}
                <Card>
                  <CardHeader className="p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base sm:text-lg">
                        {t('analytics.deviation.anomalies.recent')}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-10 sm:h-9"
                        onClick={() => setActiveTab('anomalies')}
                      >
                        {t('analytics.deviation.anomalies.viewAll')}
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                    {loading && !report ? (
                      <SkeletonList count={5} />
                    ) : (
                      <AnomalyList
                        anomalies={report?.anomalies.slice(0, 5) || []}
                        isLoading={loading}
                        onSelect={(anomaly) => {
                          setSelectedAnomaly(anomaly);
                          setActiveTab('anomalies');
                        }}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            )}

            {activeTab === 'trends' && (
              <TabsContent value="trends" className="mt-0 space-y-4 sm:space-y-6">
                <Card>
                  <CardContent className="p-3 sm:p-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder={t('analytics.deviation.searchPlaceholder')}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-11 pl-9 sm:h-10"
                      />
                    </div>
                  </CardContent>
                </Card>
                <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="text-base sm:text-lg">
                        {t('analytics.deviation.trends.title')}
                      </CardTitle>
                      <CardDescription>
                        {t('analytics.deviation.trends.showing', {
                          count: filteredTrends.length,
                          total: report?.trends.length || 0,
                        })}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                      <TrendList
                        trends={filteredTrends}
                        isLoading={loading}
                        onSelect={(trend) => {
                          setSelectedTrend(trend);
                        }}
                      />
                    </CardContent>
                  </Card>
                  <div className="space-y-4 sm:space-y-6">
                    <TrendDetails selectedTrend={selectedTrend} symbolData={symbolData} />
                    <ProtocolPriceComparison dataPoint={selectedAnomaly} />
                  </div>
                </div>
              </TabsContent>
            )}

            {activeTab === 'anomalies' && (
              <TabsContent value="anomalies" className="mt-0 space-y-4 sm:space-y-6">
                <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
                  <Card>
                    <CardHeader className="p-4 sm:p-6">
                      <CardTitle className="text-base sm:text-lg">
                        {t('analytics.deviation.anomalies.title')}
                      </CardTitle>
                      <CardDescription>
                        {t('analytics.deviation.anomalies.description')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
                      <AnomalyList
                        anomalies={report?.anomalies || []}
                        isLoading={loading}
                        onSelect={setSelectedAnomaly}
                      />
                    </CardContent>
                  </Card>
                  <ProtocolPriceComparison dataPoint={selectedAnomaly} />
                </div>
              </TabsContent>
            )}

            {activeTab === 'history' && (
              <TabsContent value="history" className="mt-0 space-y-4 sm:space-y-6">
                <HistoricalTrendContent />
              </TabsContent>
            )}
          </motion.div>
        </AnimatePresence>
      </Tabs>
    </div>
  );
}

function HistoricalTrendContent() {
  const { t } = useI18n();
  const [selectedSymbol, setSelectedSymbol] = useState('ETH/USD');

  const symbols = ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'MATIC/USD'];

  const { data: chainlinkData, isLoading: loadingChainlink } = usePriceHistory(
    'chainlink',
    selectedSymbol,
    { limit: 500 },
  );
  const { data: pythData, isLoading: loadingPyth } = usePriceHistory('pyth', selectedSymbol, {
    limit: 500,
  });
  const { data: redstoneData, isLoading: loadingRedstone } = usePriceHistory(
    'redstone',
    selectedSymbol,
    { limit: 500 },
  );

  const allData = [...chainlinkData, ...pythData, ...redstoneData];
  const isLoading = loadingChainlink || loadingPyth || loadingRedstone;

  return (
    <>
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('analytics.deviation.selectSymbol')}:</span>
              <div className="flex flex-wrap gap-1">
                {symbols.map((symbol) => (
                  <Button
                    key={symbol}
                    variant={selectedSymbol === symbol ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedSymbol(symbol)}
                  >
                    {symbol}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <HistoricalPriceChart data={allData} isLoading={isLoading} />
      <HistoricalDeviationChart data={allData} isLoading={isLoading} />
    </>
  );
}
