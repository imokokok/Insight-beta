'use client';

import { forwardRef } from 'react';
import type { ComponentPropsWithoutRef } from 'react';

import { AlertTriangle, RefreshCw, Download } from 'lucide-react';
import { Search, Filter } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';

import { StatCard, EmptyAlertsListState } from '@/components/common';
import { AutoRefreshControl } from '@/components/common/AutoRefreshControl';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { Input } from '@/components/ui/input';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertListSkeleton, StatCardSkeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

const ListContainer = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<'div'>>(
  ({ style, children, ...props }, ref) => (
    <div ref={ref} {...props} style={style} className="space-y-3 pr-2">
      {children}
    </div>
  ),
);
ListContainer.displayName = 'ListContainer';

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
    fetchData,
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
    handleExport,
  } = useAlertsPage();

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
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
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
            icon={<sourceIcons.all className="h-5 w-5" />}
            color="red"
          />
          <StatCard
            title={t('alerts.stats.priceAnomaly')}
            value={data?.summary.bySource.price_anomaly || 0}
            icon={<sourceIcons.price_anomaly className="h-5 w-5" />}
            color="purple"
          />
          <StatCard
            title={t('alerts.stats.crossChain')}
            value={data?.summary.bySource.cross_chain || 0}
            icon={<sourceIcons.cross_chain className="h-5 w-5" />}
            color="cyan"
          />
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList className="grid w-full grid-cols-7 lg:w-auto">
            <TabsTrigger value="all">
              <sourceIcons.all className="mr-2 h-4 w-4" />
              {t('alerts.tabs.all')}
            </TabsTrigger>
            <TabsTrigger value="price_anomaly">
              <sourceIcons.price_anomaly className="mr-2 h-4 w-4" />
              {t('alerts.tabs.priceAnomaly')}
            </TabsTrigger>
            <TabsTrigger value="cross_chain">
              <sourceIcons.cross_chain className="mr-2 h-4 w-4" />
              {t('alerts.tabs.crossChain')}
            </TabsTrigger>
            <TabsTrigger value="security">
              <sourceIcons.security className="mr-2 h-4 w-4" />
              {t('alerts.tabs.security')}
            </TabsTrigger>
            <TabsTrigger value="rules">
              <sourceIcons.all className="mr-2 h-4 w-4" />
              {t('alerts.tabs.rules')}
            </TabsTrigger>
            <TabsTrigger value="channels">
              <sourceIcons.all className="mr-2 h-4 w-4" />
              {t('alerts.tabs.channels')}
            </TabsTrigger>
            <TabsTrigger value="analysis">
              <sourceIcons.all className="mr-2 h-4 w-4" />
              {t('alerts.tabs.analysis')}
            </TabsTrigger>
          </TabsList>
        </div>

        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t('alerts.searchPlaceholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
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
          </CardContent>
        </Card>

        <TabsContent value={activeTab} className="space-y-6">
          <AlertBatchActions
            selectedAlerts={selectedAlerts}
            onClearSelection={deselectAll}
            onBatchActionComplete={handleBatchActionComplete}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {(() => {
                      const Icon = sourceIcons[activeTab as keyof typeof sourceIcons];
                      return Icon ? (
                        <Icon className="h-5 w-5" />
                      ) : (
                        <sourceIcons.all className="h-5 w-5" />
                      );
                    })()}
                    {t('alerts.cards.alertList')}
                    <Badge variant="secondary" className="ml-2">
                      {filteredAlerts.length}
                    </Badge>
                  </CardTitle>
                  {filteredAlerts.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isAllSelected}
                        onCheckedChange={toggleSelectAll}
                        className={cn(isIndeterminate && 'opacity-50')}
                      />
                      <span className="text-sm text-muted-foreground">
                        {isAllSelected
                          ? t('alerts.batchActions.deselectAll')
                          : t('alerts.batchActions.selectAll')}
                      </span>
                    </div>
                  )}
                </div>
                <CardDescription>
                  {t('alerts.cards.showingAlerts', {
                    count: filteredAlerts.length,
                    total: data?.alerts.length || 0,
                  })}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading && !data ? (
                  <AlertListSkeleton count={5} />
                ) : filteredAlerts.length === 0 ? (
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
                ) : groupMode !== 'none' && alertGroups.length > 0 ? (
                  <div className="max-h-[600px] space-y-3 overflow-y-auto pr-2">
                    <AlertGroupList
                      groups={alertGroups}
                      selectedAlertId={selectedAlert?.id}
                      onAlertClick={setSelectedAlert}
                      isSelected={isSelected}
                      toggleSelection={toggleSelection}
                    />
                  </div>
                ) : (
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
                )}
              </CardContent>
            </Card>

            <AlertDetailPanel alert={selectedAlert} />
          </div>
        </TabsContent>

        <TabsContent value="rules" className="space-y-6">
          <AlertRulesList
            rules={rules}
            loading={rulesLoading}
            onToggle={toggleRule}
            onDelete={deleteRule}
            onCreate={createRule}
            onUpdate={updateRule}
          />
        </TabsContent>

        <TabsContent value="channels" className="space-y-6">
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

        <TabsContent value="analysis" className="space-y-6">
          <ResponseTimeStats />
          <AlertTrendChart
            data={historyData?.trend || []}
            stats={historyData?.stats || null}
            timeRange={historyTimeRange}
            groupBy={historyGroupBy}
            onTimeRangeChange={setHistoryTimeRange}
            onGroupByChange={setHistoryGroupBy}
            loading={historyLoading}
          />
          <AlertHeatmap data={historyData?.heatmap || []} loading={historyLoading} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
