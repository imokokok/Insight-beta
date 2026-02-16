'use client';

import { Activity } from 'lucide-react';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { EmptyDashboardState, RefreshIndicator } from '@/components/ui';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { useOracleDashboard } from '@/features/oracle/dashboard';
import { DashboardCharts } from '@/features/oracle/dashboard/components/DashboardCharts';
import { DashboardStats as DashboardStatsComponent } from '@/features/oracle/dashboard/components/DashboardStats';
import { useI18n } from '@/i18n/LanguageProvider';

interface DashboardContentProps {
  onRefresh?: () => void;
}

export function DashboardContent({ onRefresh }: DashboardContentProps) {
  const { t } = useI18n();
  const {
    activeTab,
    setActiveTab,
    stats,
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

  const handleRefresh = onRefresh || refresh;

  return (
    <ErrorBoundary>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl">
              <Activity className="h-6 w-6 text-primary" />
              {t('dashboard.pageTitle')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              {t('dashboard.pageDescription')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <RefreshIndicator
              lastUpdated={lastUpdated}
              isRefreshing={isRefreshing}
              onRefresh={handleRefresh}
            />
          </div>
        </div>

        {isError && error && (
          <div>
            <ErrorBanner
              error={error}
              onRetry={handleRefresh}
              title={t('dashboard.failedToLoad')}
              isRetrying={isRefreshing}
            />
          </div>
        )}

        {!isRefreshing && !isError && !stats && (
          <div className="py-12">
            <EmptyDashboardState onRefresh={handleRefresh} />
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
    </ErrorBoundary>
  );
}
