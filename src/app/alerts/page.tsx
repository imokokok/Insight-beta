'use client';

import { useState, useMemo, useCallback, useEffect } from 'react';

import {
  AlertTriangle,
  RefreshCw,
  Download,
  Search,
  Filter,
  Network,
  Shield,
  TrendingUp,
  Activity,
} from 'lucide-react';

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAutoRefreshWithCountdown, useDataCache } from '@/hooks';
import { useI18n } from '@/i18n/LanguageProvider';
import { logger } from '@/shared/logger';
import { fetchApiData, cn } from '@/shared/utils';

import { AlertCard, AlertDetailPanel } from '@/features/alerts/components';
import type { UnifiedAlert, AlertSeverity, AlertSource, AlertStatus } from '@/features/alerts/hooks/useAlerts';

interface AlertsData {
  alerts: UnifiedAlert[];
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    active: number;
    resolved: number;
    bySource: {
      price_anomaly: number;
      cross_chain: number;
      security: number;
    };
  };
}

const sourceIcons: Record<AlertSource | 'all', typeof AlertTriangle> = {
  all: Activity,
  price_anomaly: TrendingUp,
  cross_chain: Network,
  security: Shield,
};

export default function AlertsCenterPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AlertsData | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<UnifiedAlert | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<AlertStatus | 'all'>('all');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { success, error: showError } = useToast();
  const { getCachedData, setCachedData } = useDataCache<{ data: AlertsData }>({
    key: 'alerts_center',
    ttl: 2 * 60 * 1000,
  });
  const {
    isEnabled: autoRefreshEnabled,
    setIsEnabled: setAutoRefreshEnabled,
    refreshInterval,
    setRefreshInterval,
    timeUntilRefresh,
    refresh,
  } = useAutoRefreshWithCountdown({
    onRefresh: () => fetchData(false),
    interval: 30000,
    enabled: true,
    pauseWhenHidden: true,
  });

  const fetchData = useCallback(
    async (showToast = true) => {
      try {
        setLoading(true);
        setError(null);
        const cached = getCachedData();
        if (cached && !lastUpdated) {
          setData(cached.data);
          setLoading(false);
        }
        const response = await fetchApiData<{ data: AlertsData }>('/api/alerts');
        setData(response.data);
        setLastUpdated(new Date());
        setCachedData({ data: response.data });
        if (showToast) {
          success(t('alerts.dataRefreshed'), t('alerts.dataRefreshedDesc'));
        }
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch alerts';
        setError(errorMessage);
        showError(t('alerts.failedToRefresh'), errorMessage);
        logger.error('Failed to fetch alerts', { error: err });
      } finally {
        setLoading(false);
      }
    },
    [getCachedData, setCachedData, lastUpdated, success, showError, t],
  );

  const filteredAlerts = useMemo(() => {
    if (!data?.alerts) return [];

    let alerts = data.alerts;

    if (activeTab !== 'all') {
      alerts = alerts.filter((a) => a.source === activeTab);
    }

    if (filterSeverity !== 'all') {
      alerts = alerts.filter((a) => a.severity === filterSeverity);
    }

    if (filterStatus !== 'all') {
      alerts = alerts.filter((a) => a.status === filterStatus);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      alerts = alerts.filter(
        (a) =>
          a.title.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query) ||
          a.symbol?.toLowerCase().includes(query) ||
          a.chainA?.toLowerCase().includes(query) ||
          a.chainB?.toLowerCase().includes(query),
      );
    }

    return alerts;
  }, [data, activeTab, filterSeverity, filterStatus, searchQuery]);

  const handleExport = useCallback(() => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alerts-export-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  if (error && !loading && !data) {
    return (
      <div className="container mx-auto p-6">
        <ErrorBanner
          error={new Error(error)}
          onRetry={() => fetchData()}
          title={t('alerts.failedToLoad')}
          isRetrying={loading}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
            <AlertTriangle className="h-8 w-8 text-red-500" />
            <span className="text-red-600">{t('alerts.pageTitle')}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('alerts.pageDescription')}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
              <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
              {t('common.refresh')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!data}>
              <Download className="mr-2 h-4 w-4" />
              {t('common.export')}
            </Button>
            <AutoRefreshControl
              isEnabled={autoRefreshEnabled}
              onToggle={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              interval={refreshInterval}
              onIntervalChange={setRefreshInterval}
              timeUntilRefresh={timeUntilRefresh}
            />
          </div>
          <RefreshIndicator lastUpdated={lastUpdated} isRefreshing={loading} onRefresh={refresh} />
        </div>
      </div>

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-6">
          <StatCard
            title={t('alerts.stats.total')}
            value={data?.summary.total || 0}
            icon={<AlertTriangle className="h-5 w-5" />}
            color="blue"
          />
          <StatCard
            title={t('alerts.stats.critical')}
            value={data?.summary.critical || 0}
            icon={<AlertTriangle className="h-5 w-5" />}
            color="red"
          />
          <StatCard
            title={t('alerts.stats.high')}
            value={data?.summary.high || 0}
            icon={<AlertTriangle className="h-5 w-5" />}
            color="amber"
          />
          <StatCard
            title={t('alerts.stats.active')}
            value={data?.summary.active || 0}
            icon={<Activity className="h-5 w-5" />}
            color="red"
          />
          <StatCard
            title={t('alerts.stats.priceAnomaly')}
            value={data?.summary.bySource.price_anomaly || 0}
            icon={<TrendingUp className="h-5 w-5" />}
            color="purple"
          />
          <StatCard
            title={t('alerts.stats.crossChain')}
            value={data?.summary.bySource.cross_chain || 0}
            icon={<Network className="h-5 w-5" />}
            color="cyan"
          />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="all">
              <Activity className="mr-2 h-4 w-4" />
              {t('alerts.tabs.all')}
            </TabsTrigger>
            <TabsTrigger value="price_anomaly">
              <TrendingUp className="mr-2 h-4 w-4" />
              {t('alerts.tabs.priceAnomaly')}
            </TabsTrigger>
            <TabsTrigger value="cross_chain">
              <Network className="mr-2 h-4 w-4" />
              {t('alerts.tabs.crossChain')}
            </TabsTrigger>
            <TabsTrigger value="security">
              <Shield className="mr-2 h-4 w-4" />
              {t('alerts.tabs.security')}
            </TabsTrigger>
          </TabsList>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('alerts.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={filterSeverity}
                  onValueChange={(v) => setFilterSeverity(v as AlertSeverity | 'all')}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('alerts.filters.allSeverity')}</SelectItem>
                    <SelectItem value="critical">{t('alerts.filters.critical')}</SelectItem>
                    <SelectItem value="high">{t('alerts.filters.high')}</SelectItem>
                    <SelectItem value="medium">{t('alerts.filters.medium')}</SelectItem>
                    <SelectItem value="low">{t('alerts.filters.low')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={filterStatus}
                  onValueChange={(v) => setFilterStatus(v as AlertStatus | 'all')}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('alerts.filters.allStatus')}</SelectItem>
                    <SelectItem value="active">{t('alerts.filters.active')}</SelectItem>
                    <SelectItem value="investigating">{t('alerts.filters.investigating')}</SelectItem>
                    <SelectItem value="resolved">{t('alerts.filters.resolved')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <TabsContent value={activeTab} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {(() => {
                    const Icon = sourceIcons[activeTab as AlertSource | 'all'];
                    return <Icon className="h-5 w-5" />;
                  })()}
                  {t('alerts.cards.alertList')}
                  <Badge variant="secondary" className="ml-2">
                    {filteredAlerts.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {t('alerts.cards.showingAlerts', {
                    count: filteredAlerts.length,
                    total: data?.alerts.length || 0,
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading && !data ? (
                  <SkeletonList count={5} />
                ) : filteredAlerts.length === 0 ? (
                  <div className="py-12 text-center text-muted-foreground">
                    <AlertTriangle className="mx-auto h-8 w-8 opacity-50" />
                    <p className="mt-2">{t('alerts.noAlerts')}</p>
                  </div>
                ) : (
                  <div className="max-h-[600px] space-y-3 overflow-y-auto pr-2">
                    {filteredAlerts.map((alert) => (
                      <AlertCard
                        key={alert.id}
                        alert={alert}
                        onClick={() => setSelectedAlert(alert)}
                        isSelected={selectedAlert?.id === alert.id}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <AlertDetailPanel alert={selectedAlert} />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
