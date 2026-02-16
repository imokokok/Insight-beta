'use client';

import { Activity } from 'lucide-react';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { DashboardPageHeader } from '@/components/common/PageHeader';
import { EmptyDashboardState, RefreshIndicator } from '@/components/ui';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useOracleDashboard } from '@/features/oracle/dashboard';
import { DashboardCharts } from '@/features/oracle/dashboard/components/DashboardCharts';
import { DashboardStats as DashboardStatsComponent } from '@/features/oracle/dashboard/components/DashboardStats';
import { useI18n } from '@/i18n/LanguageProvider';

export default function OptimizedOracleDashboard() {
  const { t } = useI18n();
  const {
    activeTab,
    setActiveTab,
    stats,
    sidebarOpen,
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
      <div className="flex h-screen overflow-hidden bg-background">
        {sidebarOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <main className="flex flex-1 flex-col overflow-hidden">
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

          <div className="relative flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4">

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
        </main>
      </div>
    </ErrorBoundary>
  );
}
