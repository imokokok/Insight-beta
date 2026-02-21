'use client';

import { Activity } from 'lucide-react';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { DashboardPageHeader } from '@/components/common/PageHeader';
import { EmptyDashboardState, RefreshIndicator } from '@/components/ui';
import { ErrorBanner } from '@/components/ui';
import { useOracleDashboard } from '@/features/oracle/dashboard';
import { DashboardCharts } from '@/features/oracle/dashboard/components/DashboardCharts';
import { DashboardStats as DashboardStatsComponent } from '@/features/oracle/dashboard/components/DashboardStats';
import { useI18n } from '@/i18n/LanguageProvider';

interface OracleDashboardProps {
  className?: string;
}

export function OracleDashboard({ className }: OracleDashboardProps) {
  const { t } = useI18n();
  const {
    activeTab,
    setActiveTab,
    stats,
    setSidebarOpen,
    isMobile,
    priceTrendData,
    comparisonData,
    latencyData,
    lastUpdated,
    isRefreshing,
    isError,
    error,
    refresh,
    priceChartConfig,
    comparisonChartConfig,
    latencyChartConfig,
    statCardsData,
    scaleCardsData,
  } = useOracleDashboard();

  return (
    <ErrorBoundary>
      <div className={className}>
        <DashboardPageHeader
          title={t('dashboard.pageTitle')}
          description={t('dashboard.pageDescription')}
          icon={<Activity className="h-5 w-5 text-primary" />}
          refreshControl={
            <RefreshIndicator
              lastUpdated={lastUpdated}
              isRefreshing={isRefreshing}
              onRefresh={refresh}
            />
          }
          onMobileMenuClick={() => setSidebarOpen(true)}
        />

        <div className="relative mt-4">
          {isError && error && (
            <div className="mb-6">
              <ErrorBanner
                error={error}
                onRetry={refresh}
                title={t('dashboard.failedToLoad')}
                isRetrying={isRefreshing}
              />
            </div>
          )}

          {!isRefreshing && !isError && !stats && (
            <div className="py-12">
              <EmptyDashboardState onRefresh={refresh} />
            </div>
          )}

          <DashboardStatsComponent
            statCardsData={statCardsData}
            scaleCardsData={scaleCardsData}
            isRefreshing={isRefreshing}
            stats={stats}
          />

          <DashboardCharts
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            isMobile={isMobile}
            stats={stats}
            priceChartConfig={priceChartConfig}
            comparisonChartConfig={comparisonChartConfig}
            latencyChartConfig={latencyChartConfig}
            priceTrendData={priceTrendData}
            comparisonData={comparisonData}
            latencyData={latencyData}
          />
        </div>
      </div>
    </ErrorBoundary>
  );
}
