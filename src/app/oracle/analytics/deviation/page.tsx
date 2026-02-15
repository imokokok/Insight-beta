'use client';

import { useState, useCallback } from 'react';
import {
  TrendingUp,
  Activity,
  AlertTriangle,
  RefreshCw,
  Download,
  Search,
  ChevronRight,
} from 'lucide-react';
import { ToastContainer, useToast } from '@/components/common/DashboardToast';
import { AutoRefreshControl } from '@/components/common/AutoRefreshControl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/input';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { StatCardSkeleton, ChartSkeleton, CardSkeleton, SkeletonList } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAutoRefreshWithCountdown, useDataCache } from '@/hooks';
import { logger } from '@/shared/logger';
import { fetchApiData, cn } from '@/shared/utils';
import {
  SummaryStats,
  TrendList,
  AnomalyList,
  TrendDetails,
  ProtocolPriceComparison,
  DeviationDistributionChart,
  AnalysisPeriodCard,
} from '@/features/oracle/analytics/deviation';
import type { DeviationReport, DeviationTrend, PriceDeviationPoint } from '@/features/oracle/analytics/deviation/types/deviation';

export default function DeviationAnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<DeviationReport | null>(null);
  const [selectedTrend, setSelectedTrend] = useState<DeviationTrend | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<PriceDeviationPoint | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [symbolData, setSymbolData] = useState<PriceDeviationPoint[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { toasts, removeToast, success, error: showError } = useToast();
  const { getCachedData, setCachedData } = useDataCache<{ report: DeviationReport }>({ key: 'deviation_dashboard', ttl: 5 * 60 * 1000 });

  const { isEnabled: autoRefreshEnabled, setIsEnabled: setAutoRefreshEnabled, refreshInterval, setRefreshInterval, timeUntilRefresh, refresh } = useAutoRefreshWithCountdown({
    onRefresh: () => fetchReport(false),
    interval: 60000,
    enabled: true,
    pauseWhenHidden: true,
  });

  const fetchReport = useCallback(
    async (showToast = true) => {
      try {
        setLoading(true);
        setError(null);
        const cached = getCachedData();
        if (cached && !lastUpdated) {
          setReport(cached.report);
          setLoading(false);
        }
        const response = await fetchApiData<{ data: DeviationReport }>('/api/oracle/analytics/deviation?type=report');
        setReport(response.data);
        setLastUpdated(new Date());
        setCachedData({ report: response.data });
        if (showToast) success('Data refreshed', 'Deviation report has been updated');
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch deviation report';
        setError(errorMessage);
        showError('Failed to refresh', errorMessage);
        logger.error('Failed to fetch deviation report', { error: err });
      } finally {
        setLoading(false);
      }
    },
    [getCachedData, setCachedData, lastUpdated, success, showError],
  );

  const fetchSymbolTrend = useCallback(async (symbol: string) => {
    try {
      const response = await fetchApiData<{ data: { dataPoints: PriceDeviationPoint[] } }>(
        `/api/oracle/analytics/deviation?type=trend&symbol=${symbol}`,
      );
      setSymbolData(response.data.dataPoints || []);
    } catch (err) {
      logger.error('Failed to fetch symbol trend', { error: err, symbol });
    }
  }, []);

  const filteredTrends = report?.trends.filter(
    (trend) =>
      !searchQuery ||
      trend.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      trend.recommendation.toLowerCase().includes(searchQuery.toLowerCase()),
  ) || [];

  const handleExport = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deviation-report-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (error && !loading && !report) {
    return (
      <div className="container mx-auto p-6">
        <ErrorBanner error={new Error(error)} onRetry={() => fetchReport()} title="Failed to load deviation report" isRetrying={loading} />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
            <span className="text-orange-600">Price Deviation Analytics</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Cross-protocol price deviation analysis and trend monitoring</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!report}>
              <Download className="mr-2 h-4 w-4" />Export
            </Button>
            <AutoRefreshControl isEnabled={autoRefreshEnabled} onToggle={() => setAutoRefreshEnabled(!autoRefreshEnabled)} interval={refreshInterval} onIntervalChange={setRefreshInterval} timeUntilRefresh={timeUntilRefresh} />
          </div>
          <RefreshIndicator lastUpdated={lastUpdated} isRefreshing={loading} onRefresh={refresh} />
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
          <TabsTrigger value="overview"><Activity className="mr-2 h-4 w-4" />Overview</TabsTrigger>
          <TabsTrigger value="trends"><TrendingUp className="mr-2 h-4 w-4" />Trends ({filteredTrends.length})</TabsTrigger>
          <TabsTrigger value="anomalies"><AlertTriangle className="mr-2 h-4 w-4" />Anomalies ({report?.anomalies.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {loading && !report ? <><ChartSkeleton /><CardSkeleton /></> : <><DeviationDistributionChart trends={filteredTrends} /><AnalysisPeriodCard report={report} /></>}
          </div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent High Deviations</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('anomalies')}>View All<ChevronRight className="ml-1 h-4 w-4" /></Button>
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
                <Input placeholder="Search by symbol or recommendation... (⌘F)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
            </CardContent>
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>Deviation Trends</CardTitle><CardDescription>Showing {filteredTrends.length} of {report?.trends.length || 0} symbols</CardDescription></CardHeader>
              <CardContent>
                <TrendList trends={filteredTrends} isLoading={loading} onSelect={(trend) => { setSelectedTrend(trend); fetchSymbolTrend(trend.symbol); }} />
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
              <CardHeader><CardTitle>All Anomalies</CardTitle><CardDescription>High deviation events across all symbols</CardDescription></CardHeader>
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
