'use client';

import {
  RefreshCw,
  Download,
  Gavel,
} from 'lucide-react';

import { AutoRefreshControl } from '@/components/common/AutoRefreshControl';
import { ToastContainer, useToast } from '@/components/common/DashboardToast';
import { Button } from '@/components/ui/button';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { RefreshIndicator } from '@/components/ui/RefreshIndicator';
import { useI18n } from '@/i18n';

import {
  DisputeContent,
} from '@/features/oracle/analytics/disputes';
import { useDisputeAnalytics } from '@/features/oracle/analytics/disputes/hooks';

export default function DisputeAnalyticsPage() {
  const { t } = useI18n();
  const { toasts, removeToast } = useToast();
  
  const {
    loading,
    report,
    selectedDispute,
    setSelectedDispute,
    selectedDisputer,
    setSelectedDisputer,
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
    handleExport,
  } = useDisputeAnalytics();

  if (error && !loading && !report) {
    return (
      <div className="container mx-auto p-6">
        <ErrorBanner error={new Error(error)} onRetry={() => refresh()} title={t('analytics:disputes.failedToLoad')} isRetrying={loading} />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
            <Gavel className="h-6 w-6 text-purple-600" />
            <span>{t('analytics:disputes.pageName')}</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('analytics:disputes.pageDescription')}</p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => refresh()} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading && 'animate-spin'}`} />
              {t('common.refresh')}
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!report}>
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
        selectedDispute={selectedDispute}
        setSelectedDispute={setSelectedDispute}
        selectedDisputer={selectedDisputer}
        setSelectedDisputer={setSelectedDisputer}
      />
    </div>
  );
}
