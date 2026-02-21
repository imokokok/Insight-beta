'use client';

import { Suspense, lazy } from 'react';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { ChartSkeleton } from '@/components/ui';
import { ComparisonControls } from '@/features/comparison/components/ComparisonControls';
import { useComparisonPage } from '@/features/comparison/hooks';
import { usePageOptimizations } from '@/hooks/usePageOptimizations';
import { useI18n } from '@/i18n';

const PriceHeatmap = lazy(() =>
  import('@/features/comparison/components/PriceHeatmap').then((mod) => ({
    default: mod.PriceHeatmap,
  })),
);

const LatencyAnalysisView = lazy(() =>
  import('@/features/comparison/components/LatencyAnalysis').then((mod) => ({
    default: mod.LatencyAnalysisView,
  })),
);

const CostEfficiencyView = lazy(() =>
  import('@/features/comparison/components/CostEfficiency').then((mod) => ({
    default: mod.CostEfficiencyView,
  })),
);

const RealtimeComparisonView = lazy(() =>
  import('@/features/comparison/components/RealtimeComparison').then((mod) => ({
    default: mod.RealtimeComparisonView,
  })),
);

const VirtualTable = lazy(() =>
  import('@/features/comparison/components/VirtualTable').then((mod) => ({
    default: mod.VirtualTable,
  })),
);

export default function ComparisonPage() {
  const { t } = useI18n();

  const {
    currentView,
    setCurrentView,
    filter,
    setFilter,
    config,
    setConfig,
    debouncedFilter,
    heatmap,
    latency,
    cost,
    realtime,
    currentData,
    isLive,
    handleCellClick,
    handleExport,
    handleRefresh,
  } = useComparisonPage();

  usePageOptimizations({
    pageName: t('comparison.pageName'),
    onRefresh: async () => {
      handleRefresh();
    },
    enableSearch: false,
    showRefreshToast: true,
  });

  return (
    <ErrorBoundary>
      <div className="container mx-auto space-y-4 p-3 sm:space-y-6 sm:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t('comparison.title')}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              {t('comparison.description')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isLive && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-600 sm:text-sm">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
                </span>
                {t('comparison.liveConnected')}
              </span>
            )}
          </div>
        </div>

        <ComparisonControls
          filter={filter}
          config={config}
          currentView={currentView}
          onFilterChange={setFilter}
          onConfigChange={setConfig}
          onViewChange={setCurrentView}
          onRefresh={handleRefresh}
          onExport={handleExport}
          isLoading={currentData.isLoading}
          availableSymbols={[
            'ETH/USD',
            'BTC/USD',
            'LINK/USD',
            'MATIC/USD',
            'AVAX/USD',
            'SOL/USD',
            'ARB/USD',
            'OP/USD',
          ]}
        />

        <div className="space-y-4 sm:space-y-6">
          {currentView === 'heatmap' && (
            <Suspense fallback={<ChartSkeleton className="h-96" />}>
              <PriceHeatmap
                data={heatmap.data}
                isLoading={heatmap.isLoading}
                onCellClick={handleCellClick}
                selectedProtocols={debouncedFilter.protocols}
              />
            </Suspense>
          )}

          {currentView === 'latency' && (
            <Suspense fallback={<ChartSkeleton className="h-96" />}>
              <LatencyAnalysisView data={latency.data} isLoading={latency.isLoading} />
            </Suspense>
          )}

          {currentView === 'cost' && (
            <Suspense fallback={<ChartSkeleton className="h-96" />}>
              <CostEfficiencyView data={cost.data} isLoading={cost.isLoading} />
            </Suspense>
          )}

          {currentView === 'realtime' && (
            <Suspense fallback={<ChartSkeleton className="h-96" />}>
              <RealtimeComparisonView
                data={realtime.data}
                isLoading={realtime.isLoading}
                isLive={isLive}
                onRefresh={handleRefresh}
                filter={debouncedFilter}
                onFilterChange={setFilter}
              />
            </Suspense>
          )}

          {currentView === 'table' && (
            <Suspense
              fallback={
                <div className="space-y-2">
                  <div className="h-10 animate-pulse rounded-lg bg-gray-200" />
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
                  ))}
                </div>
              }
            >
              <VirtualTable
                data={realtime.data}
                isLoading={realtime.isLoading}
                onExport={handleExport}
                rowHeight={52}
                containerHeight={600}
              />
            </Suspense>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
