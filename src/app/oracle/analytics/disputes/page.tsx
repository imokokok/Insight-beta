'use client';

import { RefreshCw, Gavel, Clock, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';

import { AutoRefreshControl } from '@/components/common/AutoRefreshControl';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { ToastContainer, useToast } from '@/components/common/DashboardToast';
import { Button } from '@/components/ui';
import { ErrorBanner } from '@/components/ui';
import { RefreshIndicator } from '@/components/ui';
import { Card, CardContent } from '@/components/ui';
import { DisputeContent } from '@/features/oracle/analytics/disputes';
import { ExportButton } from '@/features/oracle/analytics/disputes/components/export';
import { WelcomeGuide } from '@/features/oracle/analytics/disputes/components/onboarding';
import { TVLOverviewCard } from '@/features/oracle/analytics/disputes/components/tvl';
import { useDisputeAnalytics } from '@/features/oracle/analytics/disputes/hooks';
import { useI18n } from '@/i18n';

function InsightCard({
  icon,
  title,
  value,
  trend,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  color: string;
}) {
  return (
    <Card className="min-w-[140px] flex-1">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className={`rounded-lg p-2 ${color}`}>{icon}</div>
          {trend && (
            <TrendingUp
              className={`h-4 w-4 ${
                trend === 'up'
                  ? 'text-green-500'
                  : trend === 'down'
                    ? 'rotate-180 text-red-500'
                    : 'text-gray-400'
              }`}
            />
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{title}</p>
        </div>
      </CardContent>
    </Card>
  );
}

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

  const insightCards = report
    ? [
        {
          icon: <AlertCircle className="h-4 w-4 text-amber-600" />,
          title: t('analytics:disputes.insights.activeDisputes'),
          value: report.summary.activeDisputes,
          trend: report.summary.activeDisputes > 3 ? ('up' as const) : ('neutral' as const),
          color: 'bg-amber-100',
        },
        {
          icon: <DollarSign className="h-4 w-4 text-purple-600" />,
          title: t('analytics:disputes.insights.pendingBonds'),
          value: `${(report.summary.totalBonded / 1000).toFixed(1)}K`,
          color: 'bg-purple-100',
        },
        {
          icon: <Gavel className="h-4 w-4 text-blue-600" />,
          title: t('analytics:disputes.insights.todayDisputes'),
          value: report.recentActivity.length,
          trend: 'up' as const,
          color: 'bg-blue-100',
        },
        {
          icon: <Clock className="h-4 w-4 text-green-600" />,
          title: t('analytics:disputes.insights.avgResolution'),
          value: `${report.summary.avgResolutionTimeHours}h`,
          color: 'bg-green-100',
        },
      ]
    : [];

  const breadcrumbItems = [{ label: t('nav.oracle'), href: '/oracle' }, { label: 'UMA 分析' }];

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <Breadcrumb items={breadcrumbItems} />
      <WelcomeGuide />
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
            <Gavel className="h-6 w-6 text-purple-600" />
            <span>{t('analytics:disputes.pageName')}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('analytics:disputes.pageDescription')}
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
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
        <div className="flex flex-wrap gap-4">
          {insightCards.map((card, index) => (
            <InsightCard key={index} {...card} />
          ))}
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
