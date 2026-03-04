'use client';

import type { ComponentPropsWithoutRef } from 'react';
import { lazy, Suspense, useMemo } from 'react';
import { forwardRef } from 'react';

import { AnimatePresence, motion } from 'framer-motion';
import {
  Search,
  Filter,
  Bell,
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  Activity,
} from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';

import { AutoRefreshControl, EmptyAlertsListState, KpiGrid } from '@/components/common';
import { ListContainer } from '@/components/common/layout';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { ErrorBanner } from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Input } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { AlertListSkeleton } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';
import {
  AlertCard,
  AlertGroupSelector,
  AlertGroupList,
  MobileAlertCard,
  MobileAlertDetailSheet,
  TopStatusBar,
} from '@/features/alerts/components';
import { useAlertsPage, sourceIcons } from '@/features/alerts/hooks';
import type { AlertSeverity, AlertStatus } from '@/features/alerts/hooks/useAlerts';
import { useIsMobile } from '@/hooks';
import { useI18n } from '@/i18n/LanguageProvider';
import { cn } from '@/shared/utils';
import type { KpiCardData, KpiStatus } from '@/types/shared/kpi';

const AlertDetailPanel = lazy(() =>
  import('@/features/alerts/components').then((mod) => ({ default: mod.AlertDetailPanel })),
);
const AlertRulesList = lazy(() =>
  import('@/features/alerts/components').then((mod) => ({ default: mod.AlertRulesList })),
);
const AlertBatchActions = lazy(() =>
  import('@/features/alerts/components').then((mod) => ({ default: mod.AlertBatchActions })),
);
const NotificationChannels = lazy(() =>
  import('@/features/alerts/components').then((mod) => ({ default: mod.NotificationChannels })),
);
const AlertTrendChart = lazy(() =>
  import('@/features/alerts/components').then((mod) => ({ default: mod.AlertTrendChart })),
);
const AlertHeatmap = lazy(() =>
  import('@/features/alerts/components').then((mod) => ({ default: mod.AlertHeatmap })),
);
const ResponseTimeStats = lazy(() =>
  import('@/features/alerts/components').then((mod) => ({ default: mod.ResponseTimeStats })),
);

function LoadingFallback({ height = '200px' }: { height?: string }) {
  return (
    <div
      className="relative flex items-center justify-center rounded-lg border border-border/30 bg-gradient-to-br from-background via-muted/5 to-background"
      style={{ height }}
    >
      <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
      <div className="relative flex flex-col items-center gap-3">
        <div className="border-3 h-10 w-10 animate-spin rounded-full border-primary/30 border-t-primary shadow-lg shadow-primary/20" />
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

const AlertListContainer = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
  ({ style, children, ...props }, ref) => (
    <ListContainer ref={ref} style={style} {...props} className="pr-2">
      {children}
    </ListContainer>
  ),
);
AlertListContainer.displayName = 'AlertListContainer';

type HealthStatus = 'healthy' | 'warning' | 'critical';

const healthStatusConfig: Record<HealthStatus, { label: string; color: string; bgColor: string }> =
  {
    healthy: {
      label: 'alerts.statusLabels.healthy',
      color: 'text-success',
      bgColor: 'bg-success/20',
    },
    warning: {
      label: 'alerts.statusLabels.warning',
      color: 'text-warning',
      bgColor: 'bg-warning/20',
    },
    critical: {
      label: 'alerts.statusLabels.critical',
      color: 'text-error',
      bgColor: 'bg-error/20',
    },
  };

export default function AlertsCenterPage() {
  const { t } = useI18n();
  const isMobile = useIsMobile();
  const {
    loading,
    data,
    selectedAlert,
    setSelectedAlert,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    filterSeverity,
    setFilterSeverity,
    filterStatus,
    setFilterStatus,
    lastUpdated,
    error,
    sortMode,
    setSortMode,
    groupMode,
    setGroupMode,
    historyTimeRange,
    setHistoryTimeRange,
    historyGroupBy,
    setHistoryGroupBy,
    rules,
    rulesLoading,
    createRule,
    updateRule,
    deleteRule,
    toggleRule,
    channels,
    channelsLoading,
    fetchChannels,
    createChannel,
    updateChannel,
    deleteChannel,
    toggleChannel,
    testChannel,
    historyData,
    historyLoading,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    refreshInterval,
    setRefreshInterval,
    timeUntilRefresh,
    refresh,
    filteredAlerts,
    alertGroups,
    selectedAlerts,
    isAllSelected,
    isIndeterminate,
    toggleSelection,
    deselectAll,
    toggleSelectAll,
    isSelected,
    handleBatchActionComplete,
    exportToJSON,
  } = useAlertsPage();

  const healthStatus: HealthStatus = useMemo(() => {
    if (!data?.summary) return 'healthy';
    const { critical, active } = data.summary;
    if (critical > 0 || active > 5) return 'critical';
    if (active > 0) return 'warning';
    return 'healthy';
  }, [data?.summary]);

  const kpiData: KpiCardData[] = useMemo(() => {
    if (!data?.summary) {
      return [
        { value: '-', label: t('alerts.stats.total'), trend: 'neutral' },
        { value: '-', label: t('alerts.stats.critical'), trend: 'neutral' },
        { value: '-', label: t('alerts.stats.high'), trend: 'neutral' },
        { value: '-', label: t('alerts.stats.active'), trend: 'neutral' },
      ];
    }

    const { summary } = data;
    return [
      {
        value: summary.total,
        label: t('alerts.stats.total'),
        trend: 'neutral',
        status: 'neutral' as KpiStatus,
      },
      {
        value: summary.critical,
        label: t('alerts.stats.critical'),
        trend: summary.critical > 0 ? 'up' : 'neutral',
        status: (summary.critical > 0 ? 'error' : 'success') as KpiStatus,
      },
      {
        value: summary.high,
        label: t('alerts.stats.high'),
        trend: summary.high > 0 ? 'up' : 'neutral',
        status: (summary.high > 0 ? 'warning' : 'success') as KpiStatus,
      },
      {
        value: summary.active,
        label: t('alerts.stats.active'),
        trend: summary.active > 0 ? 'up' : 'neutral',
        status: (summary.active > 0 ? 'error' : 'success') as KpiStatus,
      },
    ];
  }, [data, t]);

  if (error && !loading && !data) {
    return (
      <div className="min-h-screen p-3 sm:p-4">
        <ErrorBanner
          error={new Error(error)}
          onRetry={() => refresh()}
          title={t('alerts.failedToLoad')}
          isRetrying={loading}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16 md:pb-0">
      <TopStatusBar
        healthStatus={healthStatus}
        isConnected={true}
        lastUpdateTime={lastUpdated}
        onRefresh={refresh}
        isAutoRefreshEnabled={autoRefreshEnabled}
        onToggleAutoRefresh={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
        onExport={exportToJSON}
        isRefreshing={loading}
      />

      <div className="container mx-auto space-y-3 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-base font-bold sm:text-xl lg:text-2xl">
              <Bell className="h-5 w-5 text-primary" />
              <span>{t('alerts.pageTitle') || '告警中心'}</span>
              <Badge
                variant="outline"
                className={cn(
                  'border-0 text-xs sm:text-sm',
                  healthStatusConfig[healthStatus].bgColor,
                  healthStatusConfig[healthStatus].color,
                )}
              >
                {t(healthStatusConfig[healthStatus].label)}
              </Badge>
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t('alerts.pageDescription') || '实时监控和管理系统告警'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={refresh} disabled={loading}>
              <Activity className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
              {t('common.refresh')}
            </Button>
            <AutoRefreshControl
              isEnabled={autoRefreshEnabled}
              onToggle={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              interval={refreshInterval}
              onIntervalChange={setRefreshInterval}
              timeUntilRefresh={timeUntilRefresh}
            />
          </div>
        </div>

        <KpiGrid kpis={loading && !data ? kpiData : kpiData} loading={loading && !data} />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <div className="relative overflow-x-auto rounded-lg border border-border/30 p-2 backdrop-blur-sm">
            <TabsList className="scrollbar-hide relative flex w-full gap-1 overflow-x-auto bg-transparent">
              <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-8 bg-gradient-to-l from-background to-transparent opacity-0 transition-opacity [.overflow-x-auto:hover>&]:opacity-100" />
              <TooltipProvider>
                <div className="flex items-center gap-1 px-1 py-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger
                        value="all"
                        className="min-h-[40px] px-3 py-2 text-xs sm:text-sm"
                      >
                        <sourceIcons.all className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">{t('alerts.tabs.all')}</span>
                        <span className="sm:hidden">{t('alerts.tabs.allShort')}</span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{t('alerts.tabs.allDesc')}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger
                        value="price_anomaly"
                        className="min-h-[40px] px-3 py-2 text-xs sm:text-sm"
                      >
                        <AlertTriangle className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">{t('alerts.tabs.priceAnomaly')}</span>
                        <span className="sm:hidden">{t('alerts.tabs.priceAnomalyShort')}</span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{t('alerts.tabs.priceAnomalyDesc')}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger
                        value="cross_chain"
                        className="min-h-[40px] px-3 py-2 text-xs sm:text-sm"
                      >
                        <Activity className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">{t('alerts.tabs.crossChain')}</span>
                        <span className="sm:hidden">{t('alerts.tabs.crossChainShort')}</span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{t('alerts.tabs.crossChainDesc')}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger
                        value="security"
                        className="min-h-[40px] px-3 py-2 text-xs sm:text-sm"
                      >
                        <AlertCircle className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">{t('alerts.tabs.security')}</span>
                        <span className="sm:hidden">{t('alerts.tabs.securityShort')}</span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{t('alerts.tabs.securityDesc')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="mx-2 h-6 w-px self-center bg-border/50" />
                <div className="flex items-center gap-1 px-1 py-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger
                        value="rules"
                        className="min-h-[40px] px-3 py-2 text-xs sm:text-sm"
                      >
                        <CheckCircle className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">{t('alerts.tabs.rules')}</span>
                        <span className="sm:hidden">{t('alerts.tabs.rulesShort')}</span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{t('alerts.tabs.rulesDesc')}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger
                        value="channels"
                        className="min-h-[40px] px-3 py-2 text-xs sm:text-sm"
                      >
                        <Bell className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">{t('alerts.tabs.channels')}</span>
                        <span className="sm:hidden">{t('alerts.tabs.channelsShort')}</span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{t('alerts.tabs.channelsDesc')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="mx-2 h-6 w-px self-center bg-border/50" />
                <div className="flex items-center gap-1 px-1 py-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <TabsTrigger
                        value="analysis"
                        className="min-h-[40px] px-3 py-2 text-xs sm:text-sm"
                      >
                        <Activity className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        <span className="hidden sm:inline">{t('alerts.tabs.analysis')}</span>
                        <span className="sm:hidden">{t('alerts.tabs.analysisShort')}</span>
                      </TabsTrigger>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{t('alerts.tabs.analysisDesc')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
            </TabsList>
          </div>

          <div className="rounded-lg border border-border/30 p-3 backdrop-blur-sm">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('alerts.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-10 pl-9 text-sm"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={filterSeverity}
                  onValueChange={(v) => setFilterSeverity(v as AlertSeverity | 'all')}
                >
                  <SelectTrigger className="h-9 w-full sm:w-28">
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
                  <SelectTrigger className="h-9 w-full sm:w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('alerts.filters.allStatus')}</SelectItem>
                    <SelectItem value="active">{t('alerts.filters.active')}</SelectItem>
                    <SelectItem value="investigating">
                      {t('alerts.filters.investigating')}
                    </SelectItem>
                    <SelectItem value="resolved">{t('alerts.filters.resolved')}</SelectItem>
                  </SelectContent>
                </Select>
                <AlertGroupSelector
                  groupMode={groupMode}
                  onGroupModeChange={setGroupMode}
                  sortMode={sortMode}
                  onSortModeChange={setSortMode}
                />
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.15 }}
            >
              {activeTab !== 'rules' && activeTab !== 'channels' && activeTab !== 'analysis' && (
                <TabsContent value={activeTab} className="space-y-3">
                  <Suspense fallback={<AlertListSkeleton className="h-12" />}>
                    <AlertBatchActions
                      selectedAlerts={selectedAlerts}
                      onClearSelection={deselectAll}
                      onBatchActionComplete={handleBatchActionComplete}
                    />
                  </Suspense>

                  <div className={cn('grid gap-3 sm:grid-cols-1 lg:grid-cols-2')}>
                    <div className="rounded-lg border border-border/30 backdrop-blur-sm">
                      <div className="border-b border-border/20 p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {(() => {
                              const Icon = sourceIcons[activeTab as keyof typeof sourceIcons];
                              return Icon ? (
                                <Icon className="h-4 w-4" />
                              ) : (
                                <sourceIcons.all className="h-4 w-4" />
                              );
                            })()}
                            <h3 className="text-sm font-semibold text-foreground">
                              {t('alerts.cards.alertList')}
                            </h3>
                            <Badge variant="secondary" className="ml-1 text-xs">
                              {filteredAlerts.length}
                            </Badge>
                          </div>
                          {filteredAlerts.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Checkbox
                                checked={isAllSelected}
                                onCheckedChange={toggleSelectAll}
                                className={cn(isIndeterminate && 'opacity-50')}
                              />
                              <span className="text-xs text-muted-foreground">
                                {isAllSelected
                                  ? t('alerts.batchActions.deselectAll')
                                  : t('alerts.batchActions.selectAll')}
                              </span>
                            </div>
                          )}
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {t('alerts.cards.showingAlerts', {
                            count: filteredAlerts.length,
                            total: data?.alerts.length || 0,
                          })}
                        </p>
                      </div>
                      <div>
                        {loading && !data ? (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                          >
                            <AlertListSkeleton count={5} />
                          </motion.div>
                        ) : filteredAlerts.length === 0 ? (
                          <div className="p-4">
                            <EmptyAlertsListState
                              isFiltered={
                                searchQuery !== '' ||
                                filterSeverity !== 'all' ||
                                filterStatus !== 'all'
                              }
                              onClearFilters={() => {
                                setSearchQuery('');
                                setFilterSeverity('all');
                                setFilterStatus('all');
                              }}
                              onRefresh={refresh}
                            />
                          </div>
                        ) : groupMode !== 'none' && alertGroups.length > 0 ? (
                          <div className="max-h-[600px] space-y-3 overflow-y-auto p-2 pr-2">
                            <AlertGroupList
                              groups={alertGroups}
                              selectedAlertId={selectedAlert?.id}
                              onAlertClick={setSelectedAlert}
                              isSelected={isSelected}
                              toggleSelection={toggleSelection}
                            />
                          </div>
                        ) : isMobile ? (
                          <div className="space-y-2 p-2">
                            {filteredAlerts.map((alert) => (
                              <MobileAlertCard
                                key={alert.id}
                                alert={alert}
                                onClick={() => setSelectedAlert(alert)}
                                isSelected={selectedAlert?.id === alert.id}
                                showCheckbox
                                isChecked={isSelected(alert.id)}
                                onCheckChange={() => toggleSelection(alert.id)}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="p-2">
                            <Virtuoso
                              data={filteredAlerts}
                              style={{ height: '600px' }}
                              components={{
                                List: AlertListContainer,
                              }}
                              itemContent={(_index, alert) => (
                                <AlertCard
                                  key={alert.id}
                                  alert={alert}
                                  onClick={() => setSelectedAlert(alert)}
                                  isSelected={selectedAlert?.id === alert.id}
                                  showCheckbox
                                  isChecked={isSelected(alert.id)}
                                  onCheckChange={() => toggleSelection(alert.id)}
                                />
                              )}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {!isMobile && (
                      <Suspense fallback={<LoadingFallback height="600px" />}>
                        <AlertDetailPanel alert={selectedAlert} />
                      </Suspense>
                    )}
                  </div>
                </TabsContent>
              )}

              {activeTab === 'rules' && (
                <TabsContent value="rules" className="space-y-3">
                  <Suspense fallback={<LoadingFallback height="400px" />}>
                    <AlertRulesList
                      rules={rules}
                      loading={rulesLoading}
                      onToggle={toggleRule}
                      onDelete={deleteRule}
                      onCreate={createRule}
                      onUpdate={updateRule}
                    />
                  </Suspense>
                </TabsContent>
              )}

              {activeTab === 'channels' && (
                <TabsContent value="channels" className="space-y-3">
                  <Suspense fallback={<LoadingFallback height="400px" />}>
                    <NotificationChannels
                      channels={channels}
                      loading={channelsLoading}
                      fetchChannels={fetchChannels}
                      createChannel={createChannel}
                      updateChannel={updateChannel}
                      deleteChannel={deleteChannel}
                      toggleChannel={toggleChannel}
                      testChannel={testChannel}
                    />
                  </Suspense>
                </TabsContent>
              )}

              {activeTab === 'analysis' && (
                <TabsContent value="analysis" className="space-y-3">
                  <Suspense fallback={<LoadingFallback height="300px" />}>
                    <ResponseTimeStats />
                  </Suspense>
                  <Suspense fallback={<LoadingFallback height="400px" />}>
                    <AlertTrendChart
                      data={historyData?.trend || []}
                      stats={historyData?.stats || null}
                      timeRange={historyTimeRange}
                      groupBy={historyGroupBy}
                      onTimeRangeChange={setHistoryTimeRange}
                      onGroupByChange={setHistoryGroupBy}
                      loading={historyLoading}
                      previousStats={historyData?.previousStats}
                    />
                  </Suspense>
                  <Suspense fallback={<LoadingFallback height="400px" />}>
                    <AlertHeatmap data={historyData?.heatmap || []} loading={historyLoading} />
                  </Suspense>
                </TabsContent>
              )}
            </motion.div>
          </AnimatePresence>
        </Tabs>

        {isMobile && (
          <MobileAlertDetailSheet
            alert={selectedAlert}
            isOpen={!!selectedAlert}
            onClose={() => setSelectedAlert(null)}
          />
        )}
      </div>
    </div>
  );
}
