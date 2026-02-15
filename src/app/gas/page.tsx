'use client';

import { History } from 'lucide-react';

import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Button } from '@/components/ui/button';
import {
  GasStatsCards,
  GasPageHeader,
  GasChainSelector,
  GasPriceList,
  GasPriceTrendChart,
  GasProviderHealthCard,
  GasPriceHistoryViewer,
  useGasMonitor,
} from '@/features/gas';

export default function GasPriceMonitorPage() {
  const {
    selectedChains,
    setSelectedChains,
    showTrend,
    setShowTrend,
    timeRange,
    setTimeRange,
    customDateRange,
    setCustomDateRange,
    gasPrices,
    pricesLoading,
    trendData,
    trendLoading,
    healthData,
    healthLoading,
    handleRefresh,
    handleToggleChain,
    handleShowTrend,
    avgGasPrice,
    slowGasPrice,
    fastGasPrice,
  } = useGasMonitor();

  return (
    <ErrorBoundary>
      <div className="container mx-auto px-4 py-8">
        <GasPageHeader
          timeRange={timeRange}
          setTimeRange={setTimeRange}
          customDateRange={customDateRange}
          setCustomDateRange={setCustomDateRange}
          handleRefresh={handleRefresh}
          pricesLoading={pricesLoading}
          healthLoading={healthLoading}
        />

        <GasStatsCards
          avgGasPrice={avgGasPrice}
          slowGasPrice={slowGasPrice}
          fastGasPrice={fastGasPrice}
          selectedChains={selectedChains}
        />

        <GasChainSelector
          selectedChains={selectedChains}
          setSelectedChains={setSelectedChains}
          showTrend={showTrend}
          setShowTrend={setShowTrend}
          handleToggleChain={handleToggleChain}
        />

        {showTrend && (
          <div className="mb-8">
            <GasPriceTrendChart data={trendData?.data} isLoading={trendLoading} height={400} />
          </div>
        )}

        <div className="mb-8">
          <GasProviderHealthCard data={healthData} isLoading={healthLoading} />
        </div>

        <GasPriceList
          gasPrices={gasPrices}
          pricesLoading={pricesLoading}
          handleShowTrend={handleShowTrend}
        />

        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold">Gas Price History</h2>
            <Button variant="outline" size="sm" onClick={() => setShowTrend(false)}>
              <History className="mr-1 h-4 w-4" />
              View History
            </Button>
          </div>
          {selectedChains.length > 0 && (
            <GasPriceHistoryViewer chain={selectedChains[0]!} provider="etherscan" limit={200} />
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
