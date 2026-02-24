'use client';

import { forwardRef, useMemo } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

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

import { AutoRefreshControl } from '@/components/common/AutoRefreshControl';
import { EmptyAlertsListState } from '@/components/common/EmptyState';
import { KpiGrid } from '@/components/common/KpiCard';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { ErrorBanner } from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Input } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { AlertListSkeleton } from '@/components/ui';
import {
  AlertCard,
  AlertDetailPanel,
  AlertRulesList,
  AlertBatchActions,
  AlertGroupSelector,
  AlertGroupList,
  AlertTrendChart,
  AlertHeatmap,
  NotificationChannels,
  ResponseTimeStats,
} from '@/features/alerts/components';
import { useAlertsPage, sourceIcons } from '@/features/alerts/hooks';
import type { AlertSeverity, AlertStatus } from '@/features/alerts/hooks/useAlerts';
import { useI18n } from '@/i18n/LanguageProvider';
import { cn } from '@/shared/utils';
import type { KpiCardData, KpiStatus } from '@/types/shared/kpi';

const ListContainer = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
  ({ style, children, ...props }, ref) => (
    <div ref={ref} {...props} style={style} className="space-y-3 pr-2">
      {children}
    </div>
  ),
);
ListContainer.displayName = 'ListContainer';

type HealthStatus = 'healthy' | 'warning' | 'critical';

function TopStatusBar({
  healthStatus,
  isConnected,
  lastUpdateTime,
  onRefresh,
  isAutoRefreshEnabled,
  onToggleAutoRefresh,
  onExport,
  isRefreshing,
}: {
  healthStatus: HealthStatus;
  isConnected: boolean;
  lastUpdateTime?: Date | null;
  onRefresh?: () => void;
  isAutoRefreshEnabled?: boolean;
  onToggleAutoRefresh?: () => void;
  onExport?: () => void;
  isRefreshing?: boolean;
}) {
  const { t } = useI18n();
  const healthConfig: Record<HealthStatus, { label: string; color: string; bgColor: string }> = {
    healthy: { label: t('common.status.healthy'), color: 'text-success', bgColor: 'bg-success/20' },
    warning: { label: t('common.status.warning'), color: 'text-warning', bgColor: 'bg-warning/20' },
    critical: { label: t('common.status.critical'), color: 'text-error', bgColor: 'bg-error/20' },
  };

  const config = healthConfig[healthStatus];

  const formatTime = (time: Date) => {
    return time.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <div className="flex h-12 items-center justify-between border-b border-border/20 px-4 md:px-6">
      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">
            {t('alerts.systemStatus')}
          </span>
          <Badge variant="outline" className={cn('gap-1.5 border-0', config.bgColor, config.color)}>
            <span
              className={cn(
                'h-2 w-2 rounded-full',
                config.color.replace('text-', 'bg-'),
                healthStatus === 'healthy' && 'animate-pulse',
              )}
            />
            {config.label}
          </Badge>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-sm font-medium text-muted-foreground">连接</span>
          <div className="flex items-center gap-1.5">
            <span className={cn('relative flex h-2 w-2', isConnected && 'animate-pulse')}>
              {isConnected && (
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
              )}
              <span
                className={cn(
                  'relative inline-flex h-2 w-2 rounded-full',
                  isConnected ? 'bg-success' : 'bg-error',
                )}
              />
            </span>
            <span
              className={cn('text-xs font-medium', isConnected ? 'text-success' : 'text-error')}
            >
              {isConnected ? '已连接' : '断开'}
            </span>
          </div>
        </div>

        {lastUpdateTime && (
          <div className="hidden items-center gap-2 md:flex">
            <span className="text-sm font-medium text-muted-foreground">更新于</span>
            <span className="font-mono text-xs text-foreground">{formatTime(lastUpdateTime)}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleAutoRefresh}
          className={cn(
            'gap-1.5 text-xs',
            isAutoRefreshEnabled ? 'text-primary' : 'text-muted-foreground',
          )}
        >
          <Activity className="h-4 w-4" />
          <span className="hidden sm:inline">{isAutoRefreshEnabled ? '自动' : '手动'}</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="gap-1.5 text-xs"
        >
          <Activity className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          <span className="hidden sm:inline">刷新</span>
        </Button>

        <Button variant="outline" size="sm" onClick={onExport} className="gap-1.5 text-xs">
          <Activity className="h-4 w-4" />
          <span className="hidden sm:inline">导出</span>
        </Button>
      </div>
    </div>
  );
}

export default function AlertsCenterPage() {
  const { t } = useI18n();
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
  }, [data?.summary, t]);

  if (error && !loading && !data) {
    return (
      <div className="min-h-screen bg-[#0A0F1C] p-6">
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
    <div className="min-h-screen bg-[#0A0F1C] pb-16 md:pb-0">
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

      <div className="container mx-auto space-y-3 p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold sm:text-xl lg:text-2xl">
              <Bell className="h-5 w-5 text-primary" />
              <span>{t('alerts.pageTitle') || '告警中心'}</span>
              <Badge
                variant="outline"
                className={cn(
                  'border-0',
                  healthStatus === 'healthy'
                    ? 'bg-success/20 text-success'
                    : healthStatus === 'warning'
                      ? 'bg-warning/20 text-warning'
                      : 'bg-error/20 text-error',
                )}
              >
                {healthStatus === 'healthy' ? '正常' : healthStatus === 'warning' ? '警告' : '异常'}
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

        {loading && !data ? (
          <KpiGrid
            kpis={[
              { value: '-', label: '' },
              { value: '-', label: '' },
              { value: '-', label: '' },
              { value: '-', label: '' },
            ]}
            loading
          />
        ) : (
          <KpiGrid kpis={kpiData} />
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-3">
          <div className="rounded-lg border border-border/30 bg-[rgba(15,23,42,0.8)] p-2 backdrop-blur-sm">
            <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                <sourceIcons.all className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('alerts.tabs.all')}</span>
                <span className="sm:hidden">全部</span>
              </TabsTrigger>
              <TabsTrigger value="price_anomaly" className="text-xs sm:text-sm">
                <AlertTriangle className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('alerts.tabs.priceAnomaly')}</span>
                <span className="sm:hidden">价格</span>
              </TabsTrigger>
              <TabsTrigger value="cross_chain" className="text-xs sm:text-sm">
                <Activity className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('alerts.tabs.crossChain')}</span>
                <span className="sm:hidden">跨链</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="text-xs sm:text-sm">
                <AlertCircle className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('alerts.tabs.security')}</span>
                <span className="sm:hidden">安全</span>
              </TabsTrigger>
              <TabsTrigger value="rules" className="text-xs sm:text-sm">
                <CheckCircle className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('alerts.tabs.rules')}</span>
                <span className="sm:hidden">规则</span>
              </TabsTrigger>
              <TabsTrigger value="channels" className="text-xs sm:text-sm">
                <Bell className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('alerts.tabs.channels')}</span>
                <span className="sm:hidden">通道</span>
              </TabsTrigger>
              <TabsTrigger value="analysis" className="text-xs sm:text-sm">
                <Activity className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">{t('alerts.tabs.analysis')}</span>
                <span className="sm:hidden">分析</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="rounded-lg border border-border/30 bg-[rgba(15,23,42,0.8)] p-3 backdrop-blur-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('alerts.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select
                  value={filterSeverity}
                  onValueChange={(v) => setFilterSeverity(v as AlertSeverity | 'all')}
                >
                  <SelectTrigger className="h-9 w-28">
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
                  <SelectTrigger className="h-9 w-28">
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

          <TabsContent value={activeTab} className="space-y-3">
            <AlertBatchActions
              selectedAlerts={selectedAlerts}
              onClearSelection={deselectAll}
              onBatchActionComplete={handleBatchActionComplete}
            />

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-lg border border-border/30 bg-[rgba(15,23,42,0.8)] backdrop-blur-sm">
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
                    <AlertListSkeleton count={5} />
                  ) : filteredAlerts.length === 0 ? (
                    <div className="p-4">
                      <EmptyAlertsListState
                        isFiltered={
                          searchQuery !== '' || filterSeverity !== 'all' || filterStatus !== 'all'
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
                  ) : (
                    <div className="p-2">
                      <Virtuoso
                        data={filteredAlerts}
                        style={{ height: '600px' }}
                        components={{
                          List: ListContainer,
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

              <AlertDetailPanel alert={selectedAlert} />
            </div>
          </TabsContent>

          <TabsContent value="rules" className="space-y-3">
            <AlertRulesList
              rules={rules}
              loading={rulesLoading}
              onToggle={toggleRule}
              onDelete={deleteRule}
              onCreate={createRule}
              onUpdate={updateRule}
            />
          </TabsContent>

          <TabsContent value="channels" className="space-y-3">
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
          </TabsContent>

          <TabsContent value="analysis" className="space-y-3">
            <ResponseTimeStats />
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
            <AlertHeatmap data={historyData?.heatmap || []} loading={historyLoading} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
