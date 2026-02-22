'use client';

import { RefreshCw, Gavel, Clock, DollarSign, AlertCircle } from 'lucide-react';

import { AutoRefreshControl } from '@/components/common/AutoRefreshControl';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { ToastContainer, useToast } from '@/components/common/DashboardToast';
import { UnifiedStatsPanel } from '@/components/common/StatCard';
import { Button } from '@/components/ui';
import { ErrorBanner } from '@/components/ui';
import { RefreshIndicator } from '@/components/ui';
import { DisputeContent } from '@/features/oracle/analytics/disputes';
import { ExportButton } from '@/features/oracle/analytics/disputes/components/export';
import { WelcomeGuide } from '@/features/oracle/analytics/disputes/components/onboarding';
import { TVLOverviewCard } from '@/features/oracle/analytics/disputes/components/tvl';
import { useDisputeAnalytics } from '@/features/oracle/analytics/disputes/hooks';
import { useI18n } from '@/i18n';

export default function DisputeAnalyticsPage() {
  const { t } = useI18n();
  const { toasts, removeToast } = useToast();

  const {
    loading,
    report,
    selectedDispute,
    setSelectedDispute,
    activeTab,
    setActiveTab,
    searchQuery,
    setSearchQuery,
    filterStatus,
    setFilterStatus,
    lastUpdated,
    error,
    autoRefreshEnabled,
    setAutoRefreshEnabled,
    refreshInterval,
    setRefreshInterval,
    timeUntilRefresh,
    refresh,
    filteredDisputes,
    filteredTrends,
    timeRangePreset,
    setTimeRangePreset,
    selectedProtocols,
    setSelectedProtocols,
    selectedChains,
    setSelectedChains,
    availableProtocols,
    availableChains,
  } = useDisputeAnalytics();

  if (error && !loading && !report) {
    return (
      <div className="container mx-auto p-6">
        <ErrorBanner
          error={new Error(error)}
          onRetry={() => refresh()}
          title={t('analytics:disputes.failedToLoad')}
          isRetrying={loading}
        />
      </div>
    );
  }

  const breadcrumbItems = [{ label: t('nav.oracle'), href: '/oracle' }, { label: 'UMA 分析' }];

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbItems} />
      <WelcomeGuide />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex-1">
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
            <Gavel className="h-6 w-6 text-purple-600" />
            <span>{t('analytics:disputes.pageName')}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('analytics:disputes.pageDescription')}
          </p>
        </div>
        <div className="flex flex-col gap-3 lg:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading && 'animate-spin'}`} />
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
          <RefreshIndicator lastUpdated={lastUpdated} isRefreshing={loading} onRefresh={refresh} />
        </div>
      </div>

      {report && (
        <div className="rounded-xl border border-border/30 bg-card/30 p-4">
          <UnifiedStatsPanel
            title="争议统计概览"
            icon={<Gavel className="h-4 w-4" />}
            items={[
              {
                title: t('analytics:disputes.insights.activeDisputes'),
                value: report.summary.activeDisputes,
                icon: <AlertCircle className="h-4 w-4" />,
                status: report.summary.activeDisputes > 5 ? 'warning' : 'healthy',
                trend:
                  report.summary.activeDisputes > 3
                    ? { value: report.summary.activeDisputes, isPositive: false, label: '活跃' }
                    : undefined,
              },
              {
                title: t('analytics:disputes.insights.pendingBonds'),
                value: `${(report.summary.totalBonded / 1000).toFixed(1)}K`,
                icon: <DollarSign className="h-4 w-4" />,
                color: 'blue',
              },
              {
                title: t('analytics:disputes.insights.todayDisputes'),
                value: report.recentActivity.length,
                icon: <Gavel className="h-4 w-4" />,
                color: 'purple',
                trend: { value: report.recentActivity.length, isPositive: true, label: '今日' },
              },
              {
                title: t('analytics:disputes.insights.avgResolution'),
                value: `${report.summary.avgResolutionTimeHours}h`,
                icon: <Clock className="h-4 w-4" />,
                color: 'cyan',
              },
            ]}
            columns={4}
          />
        </div>
      )}

      <TVLOverviewCard />

      <DisputeContent
        report={report}
        loading={loading}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
        filteredDisputes={filteredDisputes}
        filteredTrends={filteredTrends}
        selectedDispute={selectedDispute}
        setSelectedDispute={setSelectedDispute}
        timeRangePreset={timeRangePreset}
        setTimeRangePreset={setTimeRangePreset}
        selectedProtocols={selectedProtocols}
        setSelectedProtocols={setSelectedProtocols}
        selectedChains={selectedChains}
        setSelectedChains={setSelectedChains}
        availableProtocols={availableProtocols}
        availableChains={availableChains}
      />
    </div>
  );
}
