'use client';

import { useState } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  Activity,
  AlertCircle,
  AlertTriangle,
  Search,
  ChevronRight,
  History,
  PieChart as PieChartIcon,
} from 'lucide-react';

import { ToastContainer, useToast } from '@/components/common';
import { Button } from '@/components/ui';
import { Tabs, TabsContent } from '@/components/ui';
import { Input } from '@/components/ui';
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
import {
  ProtocolFilter,
  TimeRangeSelector,
} from '@/features/oracle/analytics/deviation/components/filters';
import { WelcomeGuide } from '@/features/oracle/analytics/deviation/components/onboarding';
import {
  useDeviationAnalytics,
  usePriceHistory,
} from '@/features/oracle/analytics/deviation/hooks';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import { DeviationHeader } from './DeviationHeader';

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
  const summary = report?.summary;

  const handleExport = () => {};

  const getSyncStatus = (): 'idle' | 'syncing' | 'success' | 'error' => {
    if (loading) return 'syncing';
    if (error) return 'error';
    if (lastUpdated) return 'success';
    return 'idle';
  };

  const syncStatus = getSyncStatus();

  if (error && !loading && !report) {
    return (
      <div className="min-h-screen bg-slate-950">
        <DeviationHeader
          totalSymbols={0}
          symbolsWithHighDeviation={0}
          avgDeviationAcrossAll={0}
          mostVolatileSymbol={null}
          lastUpdated={null}
          syncStatus={syncStatus}
          autoRefreshEnabled={autoRefreshEnabled}
          onRefresh={handleRefresh}
          onToggleAutoRefresh={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
        />
        <div className="container mx-auto p-4">
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-4 rounded-full bg-red-500/10 p-4">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <h2 className="mb-2 text-xl font-semibold text-slate-100">
              {t('analytics.deviation.failedToLoad')}
            </h2>
            <p className="mb-4 text-slate-500">{error}</p>
            <button
              onClick={handleRefresh}
              className="rounded-lg bg-blue-600 px-4 py-2 text-slate-50 transition-colors hover:bg-blue-700"
            >
              {t('common.retry')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <DeviationHeader
        totalSymbols={summary?.totalSymbols || 0}
        symbolsWithHighDeviation={summary?.symbolsWithHighDeviation || 0}
        avgDeviationAcrossAll={summary?.avgDeviationAcrossAll || 0}
        mostVolatileSymbol={summary?.mostVolatileSymbol || null}
        lastUpdated={lastUpdated}
        syncStatus={syncStatus}
        autoRefreshEnabled={autoRefreshEnabled}
        onRefresh={handleRefresh}
        onToggleAutoRefresh={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
        onExport={handleExport}
        exportDisabled={syncStatus === 'syncing'}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <WelcomeGuide />
        <ToastContainer toasts={toasts} onRemove={removeToast} />

        <div className="mb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
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
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="border-b border-zinc-800">
              <div className="flex w-full gap-0">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={cn(
                    'group relative flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200',
                    activeTab === 'overview'
                      ? 'bg-zinc-900/30 text-blue-400'
                      : 'text-zinc-400 hover:bg-zinc-900/20 hover:text-zinc-200',
                  )}
                >
                  <Activity
                    className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      activeTab === 'overview' ? 'scale-110' : 'group-hover:scale-110',
                    )}
                  />
                  <span className="hidden sm:inline">{t('analytics.deviation.tabs.overview')}</span>
                  <span className="sm:hidden">
                    {t('analytics.deviation.tabs.overviewShort') ||
                      t('analytics.deviation.tabs.overview')}
                  </span>
                  {activeTab === 'overview' && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('trends')}
                  className={cn(
                    'group relative flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200',
                    activeTab === 'trends'
                      ? 'bg-zinc-900/30 text-emerald-400'
                      : 'text-zinc-400 hover:bg-zinc-900/20 hover:text-zinc-200',
                  )}
                >
                  <TrendingUp
                    className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      activeTab === 'trends' ? 'scale-110' : 'group-hover:scale-110',
                    )}
                  />
                  <span className="hidden sm:inline">{t('analytics.deviation.tabs.trends')}</span>
                  <span className="sm:hidden">
                    {t('analytics.deviation.tabs.trendsShort') ||
                      t('analytics.deviation.tabs.trends')}
                  </span>
                  <span className="ml-1 rounded-full bg-zinc-800/60 px-1.5 py-0.5 text-xs">
                    {filteredTrends.length}
                  </span>
                  {activeTab === 'trends' && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-500"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('anomalies')}
                  className={cn(
                    'group relative flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200',
                    activeTab === 'anomalies'
                      ? 'bg-zinc-900/30 text-orange-400'
                      : 'text-zinc-400 hover:bg-zinc-900/20 hover:text-zinc-200',
                  )}
                >
                  <AlertTriangle
                    className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      activeTab === 'anomalies' ? 'scale-110' : 'group-hover:scale-110',
                    )}
                  />
                  <span className="hidden sm:inline">
                    {t('analytics.deviation.tabs.anomalies')}
                  </span>
                  <span className="sm:hidden">
                    {t('analytics.deviation.tabs.anomaliesShort') ||
                      t('analytics.deviation.tabs.anomalies')}
                  </span>
                  <span className="ml-1 rounded-full bg-zinc-800/60 px-1.5 py-0.5 text-xs">
                    {report?.anomalies.length || 0}
                  </span>
                  {activeTab === 'anomalies' && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-500"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={cn(
                    'group relative flex flex-1 items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-all duration-200',
                    activeTab === 'history'
                      ? 'bg-zinc-900/30 text-purple-400'
                      : 'text-zinc-400 hover:bg-zinc-900/20 hover:text-zinc-200',
                  )}
                >
                  <History
                    className={cn(
                      'h-4 w-4 transition-transform duration-200',
                      activeTab === 'history' ? 'scale-110' : 'group-hover:scale-110',
                    )}
                  />
                  <span className="hidden sm:inline">{t('analytics.deviation.tabs.history')}</span>
                  <span className="sm:hidden">
                    {t('analytics.deviation.tabs.historyShort') ||
                      t('analytics.deviation.tabs.history')}
                  </span>
                  {activeTab === 'history' && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2 }}
                    />
                  )}
                </button>
              </div>
            </div>
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
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:gap-6">
                    {loading && !report ? (
                      <>
                        <div className="h-full animate-pulse rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:rounded-2xl sm:p-6 lg:col-span-6" />
                        <div className="h-full animate-pulse rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:rounded-2xl sm:p-6 lg:col-span-6" />
                        <div className="h-full animate-pulse rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:rounded-2xl sm:p-6 lg:col-span-12" />
                        <div className="h-full animate-pulse rounded-xl border border-slate-800 bg-slate-900/50 p-4 sm:rounded-2xl sm:p-6 lg:col-span-12" />
                      </>
                    ) : (
                      <>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4 }}
                          className="lg:col-span-6"
                        >
                          <AnalyticsCard
                            title={
                              t('analytics.deviation.distribution.title') ||
                              'Deviation Distribution'
                            }
                            icon={<PieChartIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                            description={
                              t('analytics.deviation.distribution.description') ||
                              'Distribution of price deviations across symbols'
                            }
                          >
                            <DeviationDistributionChart trends={filteredTrends} />
                          </AnalyticsCard>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.1 }}
                          className="lg:col-span-6"
                        >
                          <AnalyticsCard
                            title={
                              t('analytics.deviation.analysisPeriod.title') || 'Analysis Period'
                            }
                            icon={<Activity className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                            description={
                              t('analytics.deviation.analysisPeriod.description') ||
                              'Analysis period statistics and metrics'
                            }
                          >
                            <AnalysisPeriodCard report={report} />
                          </AnalyticsCard>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.2 }}
                          className="lg:col-span-12"
                        >
                          <AnalyticsCard
                            title={t('analytics.deviation.heatmap.title') || 'Deviation Heatmap'}
                            icon={<TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                            description={
                              t('analytics.deviation.heatmap.description') ||
                              'Heatmap visualization of price deviations'
                            }
                          >
                            <DeviationHeatmap
                              trends={filteredTrends}
                              anomalies={report?.anomalies}
                            />
                          </AnalyticsCard>
                        </motion.div>
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.3 }}
                          className="lg:col-span-12"
                        >
                          <AnalyticsCard
                            title={t('analytics.deviation.anomalies.recent')}
                            icon={<AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />}
                            description={
                              t('analytics.deviation.anomalies.description') ||
                              'Recent detected price anomalies'
                            }
                          >
                            <div className="mb-4 flex items-center justify-between">
                              <div />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-9 text-slate-300 transition-all duration-200 hover:bg-slate-800 hover:text-slate-100"
                                onClick={() => setActiveTab('anomalies')}
                              >
                                {t('analytics.deviation.anomalies.viewAll')}
                                <ChevronRight className="ml-1 h-4 w-4" />
                              </Button>
                            </div>
                            <AnomalyList
                              anomalies={report?.anomalies.slice(0, 5) || []}
                              isLoading={loading}
                              onSelect={(anomaly) => {
                                setSelectedAnomaly(anomaly);
                                setActiveTab('anomalies');
                              }}
                            />
                          </AnalyticsCard>
                        </motion.div>
                      </>
                    )}
                  </div>
                </TabsContent>
              )}

              {activeTab === 'trends' && (
                <TabsContent value="trends" className="mt-0 space-y-6">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <Input
                      placeholder={t('analytics.deviation.searchPlaceholder')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-10 border-slate-700 bg-slate-900/40 pl-9 text-slate-200 transition-all duration-200 placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <div className="mb-4">
                        <h3 className="text-base font-semibold text-slate-200 sm:text-lg">
                          {t('analytics.deviation.trends.title')}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {t('analytics.deviation.trends.showing', {
                            count: filteredTrends.length,
                            total: report?.trends.length || 0,
                          })}
                        </p>
                      </div>
                      <TrendList
                        trends={filteredTrends}
                        isLoading={loading}
                        onSelect={(trend) => {
                          setSelectedTrend(trend);
                        }}
                      />
                    </div>
                    <div className="space-y-6">
                      <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4">
                        <TrendDetails selectedTrend={selectedTrend} symbolData={symbolData} />
                      </div>
                      <div className="rounded-xl border border-slate-800/60 bg-slate-900/30 p-4">
                        <ProtocolPriceComparison dataPoint={selectedAnomaly} />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )}

              {activeTab === 'anomalies' && (
                <TabsContent value="anomalies" className="mt-0 space-y-6">
                  <div className="grid gap-6 lg:grid-cols-2">
                    <div>
                      <div className="mb-4">
                        <h3 className="text-base font-semibold text-slate-200 sm:text-lg">
                          {t('analytics.deviation.anomalies.title')}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {t('analytics.deviation.anomalies.description')}
                        </p>
                      </div>
                      <AnomalyList
                        anomalies={report?.anomalies || []}
                        isLoading={loading}
                        onSelect={setSelectedAnomaly}
                      />
                    </div>
                    <div>
                      <ProtocolPriceComparison dataPoint={selectedAnomaly} />
                    </div>
                  </div>
                </TabsContent>
              )}

              {activeTab === 'history' && (
                <TabsContent value="history" className="mt-0 space-y-6">
                  <HistoricalTrendContent />
                </TabsContent>
              )}
            </motion.div>
          </AnimatePresence>
        </Tabs>
      </div>
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
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-medium text-slate-300">
          {t('analytics.deviation.selectSymbol')}:
        </span>
        <div className="flex flex-wrap gap-2">
          {symbols.map((symbol) => (
            <button
              key={symbol}
              onClick={() => setSelectedSymbol(symbol)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm transition-all duration-200',
                selectedSymbol === symbol
                  ? 'bg-purple-600 text-white'
                  : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200',
              )}
            >
              {symbol}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <HistoricalPriceChart data={allData} isLoading={isLoading} />
        </div>
        <div>
          <HistoricalDeviationChart data={allData} isLoading={isLoading} />
        </div>
      </div>
    </div>
  );
}

interface AnalyticsCardProps {
  title: string;
  icon: React.ReactNode;
  description?: string;
  children: React.ReactNode;
}

function AnalyticsCard({ title, icon, description, children }: AnalyticsCardProps) {
  return (
    <div className="h-full rounded-xl border border-slate-800/40 bg-slate-900/40 p-4 backdrop-blur-md transition-all duration-300 hover:border-slate-700/60 hover:bg-slate-900/60 sm:rounded-2xl sm:p-6">
      <div className="mb-4 flex items-center gap-2.5 sm:mb-6 sm:gap-3">
        <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400 sm:rounded-xl sm:p-2.5">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-200 sm:text-base">{title}</h3>
          {description && <p className="text-[11px] text-slate-500 sm:text-xs">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}
