'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';

import { AlertTriangle, Activity, TrendingUp, RefreshCw, Download, Search } from 'lucide-react';

import { StatCard } from '@/components/common';
import { AutoRefreshControl } from '@/components/common/AutoRefreshControl';
import { useToast } from '@/components/common/DashboardToast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/input';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { SkeletonList, StatCardSkeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAutoRefreshWithCountdown, useDataCache } from '@/hooks';
import { useI18n } from '@/i18n/LanguageProvider';
import { logger } from '@/shared/logger';
import { fetchApiData, cn, formatTime } from '@/shared/utils';

interface AnomalyData {
  id: string;
  timestamp: string;
  symbol: string;
  protocols: string[];
  prices: Record<string, number>;
  avgPrice: number;
  deviation: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  outlierProtocols: string[];
}

interface AnomalyTrend {
  symbol: string;
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  anomalyCount: number;
  avgDeviation: number;
  maxDeviation: number;
}

interface AnomalyReport {
  generatedAt: string;
  period: { start: string; end: string };
  summary: {
    totalAnomalies: number;
    highSeverityCount: number;
    avgDeviation: number;
    mostAffectedSymbol: string;
  };
  anomalies: AnomalyData[];
  trends: AnomalyTrend[];
}

const severityColors: Record<string, string> = {
  low: 'bg-green-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  critical: 'bg-red-500',
};

function AnomalyCard({ anomaly, onClick, t }: { anomaly: AnomalyData; onClick: () => void; t: (key: string) => string }) {
  return (
    <button type="button" onClick={onClick} className="w-full cursor-pointer rounded-lg border p-4 text-left transition-all hover:border-orange-500 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{anomaly.symbol}</span>
            <Badge className={severityColors[anomaly.severity]}>{anomaly.severity}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{formatTime(anomaly.timestamp)}</p>
          <div className="flex flex-wrap gap-1">
            {anomaly.outlierProtocols.map((protocol) => (
              <Badge key={protocol} variant="secondary" className="text-xs">{protocol}</Badge>
            ))}
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-red-500">{(anomaly.deviation * 100).toFixed(2)}%</p>
          <p className="text-xs text-muted-foreground">{t('common.deviation')}</p>
        </div>
      </div>
    </button>
  );
}

export default function AnomaliesAnalyticsPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<AnomalyReport | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<AnomalyData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { success, error: showError } = useToast();
  const { getCachedData, setCachedData } = useDataCache<{ report: AnomalyReport }>({ key: 'anomalies_dashboard', ttl: 5 * 60 * 1000 });
  const { isEnabled: autoRefreshEnabled, setIsEnabled: setAutoRefreshEnabled, refreshInterval, setRefreshInterval, timeUntilRefresh, refresh } = useAutoRefreshWithCountdown({ onRefresh: () => fetchReport(false), interval: 60000, enabled: true, pauseWhenHidden: true });

  const fetchReport = useCallback(async (showToast = true) => {
    try {
      setLoading(true);
      setError(null);
      const cached = getCachedData();
      if (cached && !lastUpdated) { setReport(cached.report); setLoading(false); }
      const response = await fetchApiData<{ data: AnomalyReport }>('/api/oracle/analytics/anomalies?type=report');
      setReport(response.data);
      setLastUpdated(new Date());
      setCachedData({ report: response.data });
      if (showToast) success(t('analytics.anomalies.dataRefreshed'), t('analytics.anomalies.dataRefreshedDesc'));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch anomalies report';
      setError(errorMessage);
      showError(t('analytics.anomalies.failedToRefresh'), errorMessage);
      logger.error('Failed to fetch anomalies report', { error: err });
    } finally { setLoading(false); }
  }, [getCachedData, setCachedData, lastUpdated, success, showError, t]);

  const filteredAnomalies = useMemo(() => report?.anomalies.filter(a => !searchQuery || a.symbol.toLowerCase().includes(searchQuery.toLowerCase())) || [], [report, searchQuery]);
  const handleExport = () => { if (!report) return; const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `anomalies-report-${new Date().toISOString()}.json`; a.click(); URL.revokeObjectURL(url); };

  useEffect(() => { fetchReport(false); }, [fetchReport]);

  if (error && !loading && !report) { return (<div className="container mx-auto p-6"><ErrorBanner error={new Error(error)} onRetry={() => fetchReport()} title={t('analytics.anomalies.failedToLoad')} isRetrying={loading} /></div>); }

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl"><span className="text-orange-600">{t('analytics.anomalies.pageTitle')}</span></h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('analytics.anomalies.pageDescription')}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}><RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />{t('common.refresh')}</Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!report}><Download className="mr-2 h-4 w-4" />{t('common.export')}</Button>
            <AutoRefreshControl isEnabled={autoRefreshEnabled} onToggle={() => setAutoRefreshEnabled(!autoRefreshEnabled)} interval={refreshInterval} onIntervalChange={setRefreshInterval} timeUntilRefresh={timeUntilRefresh} />
          </div>
          <RefreshIndicator lastUpdated={lastUpdated} isRefreshing={loading} onRefresh={refresh} />
        </div>
      </div>

      {loading && !report ? (<div className="grid grid-cols-2 gap-4 md:grid-cols-4"><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /><StatCardSkeleton /></div>) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard title={t('analytics.anomalies.stats.totalAnomalies')} value={report?.summary.totalAnomalies || 0} icon={<AlertTriangle className="h-5 w-5" />} color="red" />
          <StatCard title={t('analytics.anomalies.stats.highSeverity')} value={report?.summary.highSeverityCount || 0} icon={<AlertTriangle className="h-5 w-5" />} color="amber" />
          <StatCard title={t('analytics.anomalies.stats.avgDeviation')} value={report ? `${(report.summary.avgDeviation * 100).toFixed(2)}%` : '0%'} icon={<Activity className="h-5 w-5" />} color="amber" />
          <StatCard title={t('analytics.anomalies.stats.mostAffected')} value={report?.summary.mostAffectedSymbol || t('common.na')} icon={<TrendingUp className="h-5 w-5" />} color="purple" />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-auto">
          <TabsTrigger value="overview"><AlertTriangle className="mr-2 h-4 w-4" />{t('analytics.anomalies.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="anomalies"><Activity className="mr-2 h-4 w-4" />{t('analytics.anomalies.tabs.allAnomalies')} ({filteredAnomalies.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader><CardTitle>{t('analytics.anomalies.cards.recentAnomalies')}</CardTitle><CardDescription>{t('analytics.anomalies.cards.recentAnomaliesDesc')}</CardDescription></CardHeader>
            <CardContent>
              {loading && !report ? <SkeletonList count={5} /> : (
                <div className="space-y-3">
                  {filteredAnomalies.slice(0, 10).map((anomaly) => (<AnomalyCard key={anomaly.id} anomaly={anomaly} onClick={() => setSelectedAnomaly(anomaly)} t={t} />))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="anomalies" className="space-y-6">
          <Card><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder={t('analytics.anomalies.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div></CardContent></Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader><CardTitle>{t('analytics.anomalies.cards.allAnomalies')}</CardTitle><CardDescription>{t('analytics.anomalies.cards.showingAnomalies', { count: filteredAnomalies.length, total: report?.anomalies.length || 0 })}</CardDescription></CardHeader>
              <CardContent>
                {loading && !report ? <SkeletonList count={10} /> : (<div className="space-y-3">{filteredAnomalies.map((anomaly) => (<AnomalyCard key={anomaly.id} anomaly={anomaly} onClick={() => setSelectedAnomaly(anomaly)} t={t} />))}</div>)}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>{t('analytics.anomalies.cards.anomalyDetails')}</CardTitle></CardHeader>
              <CardContent>
                {selectedAnomaly ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">{t('common.symbol')}</span><span className="font-semibold">{selectedAnomaly.symbol}</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">{t('common.severity')}</span><Badge className={severityColors[selectedAnomaly.severity]}>{selectedAnomaly.severity}</Badge></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">{t('common.deviation')}</span><span className="font-semibold">{(selectedAnomaly.deviation * 100).toFixed(2)}%</span></div>
                    <div className="flex items-center justify-between"><span className="text-muted-foreground">{t('common.time')}</span><span className="font-semibold">{formatTime(selectedAnomaly.timestamp)}</span></div>
                    <div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-muted-foreground">{t('common.outlierProtocols')}</p><div className="mt-2 flex flex-wrap gap-1">{selectedAnomaly.outlierProtocols.map(p => <Badge key={p} variant="secondary">{p}</Badge>)}</div></div>
                  </div>
                ) : (<div className="py-12 text-center text-muted-foreground">{t('analytics.anomalies.selectAnomaly')}</div>)}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
