'use client';

import {
  TrendingUp,
  Activity,
  AlertTriangle,
  RefreshCw,
  Download,
  Search,
  ChevronRight,
} from 'lucide-react';

import { AutoRefreshControl } from '@/components/common/AutoRefreshControl';
import { ToastContainer, useToast } from '@/components/common/DashboardToast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/input';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { StatCardSkeleton, ChartSkeleton, CardSkeleton, SkeletonList } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  SummaryStats,
  TrendList,
  AnomalyList,
  TrendDetails,
  ProtocolPriceComparison,
  DeviationDistributionChart,
  AnalysisPeriodCard,
} from '@/features/oracle/analytics/deviation';
import { useDeviationAnalytics } from '@/features/oracle/analytics/deviation/hooks';
import { useI18n } from '@/i18n/LanguageProvider';
import { cn } from '@/shared/utils';

interface DeviationContentProps {
  onRefresh?: () => void;
}

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
    refreshInterval,
    setRefreshInterval,
    timeUntilRefresh,
    refresh,
    filteredTrends,
    handleExport,
  } = useDeviationAnalytics();

  const handleRefresh = onRefresh || refresh;

  if (error && !loading && !report) {
    return (
      <div>
        <ErrorBanner error={new Error(error)} onRetry={() => handleRefresh()} title={t('analytics.deviation.failedToLoad')} isRetrying={loading} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
            <span className="text-orange-600">{t('analytics.deviation.pageName')}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('analytics.deviation.pageDescription')}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleRefresh()} disabled={loading}>
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />{t('common.refresh')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!report}>
              <Download className="mr-2 h-4 w-4" />{t('common.export')}
            </Button>
            <AutoRefreshControl isEnabled={autoRefreshEnabled} onToggle={() => setAutoRefreshEnabled(!autoRefreshEnabled)} interval={refreshInterval} onIntervalChange={setRefreshInterval} timeUntilRefresh={timeUntilRefresh} />
          </div>
          <RefreshIndicator lastUpdated={lastUpdated} isRefreshing={loading} onRefresh={handleRefresh} />
        </div>
      </div>

      {loading && !report ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton />
        </div>
      ) : (
        <SummaryStats report={report} />
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="overview"><Activity className="mr-2 h-4 w-4" />{t('analytics.deviation.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="trends"><TrendingUp className="mr-2 h-4 w-4" />{t('analytics.deviation.tabs.trends')} ({filteredTrends.length})</TabsTrigger>
          <TabsTrigger value="anomalies"><AlertTriangle className="mr-2 h-4 w-4" />{t('analytics.deviation.tabs.anomalies')} ({report?.anomalies.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {loading && !report ? <><ChartSkeleton /><CardSkeleton /></> : <><DeviationDistributionChart trends={filteredTrends} /><AnalysisPeriodCard report={report} /></>}
          </div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('analytics.deviation.anomalies.recent')}</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('anomalies')}>{t('analytics.deviation.anomalies.viewAll')}<ChevronRight className="ml-1 h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading && !report ? <SkeletonList count={5} /> : <AnomalyList anomalies={report?.anomalies.slice(0, 5) || []} isLoading={loading} onSelect={(anomaly) => { setSelectedAnomaly(anomaly); setActiveTab('anomalies'); }} />}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder={t('analytics.deviation.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>{t('analytics.deviation.trends.title')}</CardTitle><CardDescription>{t('analytics.deviation.trends.showing', { count: filteredTrends.length, total: report?.trends.length || 0 })}</CardDescription></CardHeader>
              <CardContent>
                <TrendList trends={filteredTrends} isLoading={loading} onSelect={(trend) => { setSelectedTrend(trend); }} />
              </CardContent>
            </Card>
            <div className="space-y-6">
              <TrendDetails selectedTrend={selectedTrend} symbolData={symbolData} />
              <ProtocolPriceComparison dataPoint={selectedAnomaly} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>{t('analytics.deviation.anomalies.title')}</CardTitle><CardDescription>{t('analytics.deviation.anomalies.description')}</CardDescription></CardHeader>
              <CardContent>
                <AnomalyList anomalies={report?.anomalies || []} isLoading={loading} onSelect={setSelectedAnomaly} />
              </CardContent>
            </Card>
            <ProtocolPriceComparison dataPoint={selectedAnomaly} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
