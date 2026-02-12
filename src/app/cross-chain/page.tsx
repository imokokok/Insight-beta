'use client';

import { useState, useCallback, useMemo } from 'react';

import { RefreshCw, Filter, Activity, Calendar } from 'lucide-react';

import {
  CrossChainComparisonCard,
  CrossChainArbitrageCard,
  CrossChainDashboardCard,
  CrossChainPriceChart,
  CrossChainDeviationChart,
  CrossChainComparisonBar,
} from '@/components/features/cross-chain';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  useCrossChainComparison,
  useCrossChainArbitrage,
  useCrossChainAlerts,
  useCrossChainDashboard,
  useCrossChainHistory,
} from '@/hooks/useCrossChain';
import { useI18n } from '@/i18n';

const AVAILABLE_SYMBOLS = ['BTC', 'ETH', 'SOL', 'LINK', 'AVAX', 'MATIC', 'UNI', 'AAVE'];
const AVAILABLE_CHAINS = [
  'ethereum',
  'bsc',
  'polygon',
  'avalanche',
  'arbitrum',
  'optimism',
  'base',
];
const TIME_RANGES = [
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: '90d', label: '90 Days' },
];

export default function CrossChainPage() {
  const { t } = useI18n();

  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [selectedChains, setSelectedChains] = useState<string[]>(AVAILABLE_CHAINS);
  const [arbitrageThreshold, setArbitrageThreshold] = useState<number>(0.3);
  const [timeRange, setTimeRange] = useState<string>('7d');

  const timeRangeDates = useMemo(() => {
    const now = new Date();
    const hours = {
      '24h': 24,
      '7d': 24 * 7,
      '30d': 24 * 30,
      '90d': 24 * 90,
    };
    const startTime = new Date(
      now.getTime() - (hours[timeRange as keyof typeof hours] || 24) * 60 * 60 * 1000,
    );
    return { startTime, endTime: now };
  }, [timeRange]);

  const {
    data: comparisonData,
    isLoading: comparisonLoading,
    mutate: refreshComparison,
  } = useCrossChainComparison(selectedSymbol, selectedChains);

  const {
    data: arbitrageData,
    isLoading: arbitrageLoading,
    mutate: refreshArbitrage,
  } = useCrossChainArbitrage(selectedSymbol, arbitrageThreshold);

  const { data: alertsData, mutate: refreshAlerts } = useCrossChainAlerts(selectedSymbol);

  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    mutate: refreshDashboard,
  } = useCrossChainDashboard();

  const {
    data: historyData,
    isLoading: historyLoading,
    mutate: refreshHistory,
  } = useCrossChainHistory(
    selectedSymbol,
    timeRangeDates.startTime.toISOString(),
    timeRangeDates.endTime.toISOString(),
    timeRange === '24h' ? '1hour' : '1day',
  );

  const handleRefresh = useCallback(() => {
    refreshComparison();
    refreshArbitrage();
    refreshAlerts();
    refreshDashboard();
    refreshHistory();
  }, [refreshComparison, refreshArbitrage, refreshAlerts, refreshDashboard, refreshHistory]);

  const handleChainToggle = useCallback((chain: string) => {
    setSelectedChains((prev) =>
      prev.includes(chain) ? prev.filter((c) => c !== chain) : [...prev, chain],
    );
  }, []);

  const chartPrices = useMemo(() => {
    if (!comparisonData?.data) return [];
    return comparisonData.data.pricesByChain.map((p) => ({
      chain: p.chain,
      price: p.price,
      deviationFromAvg: comparisonData.data!.statistics.avgPrice - p.price,
    }));
  }, [comparisonData]);

  const arbitrageSummary = useMemo(() => {
    return arbitrageData?.data?.summary;
  }, [arbitrageData]);

  const alertsList = useMemo(() => {
    return alertsData?.data?.alerts || [];
  }, [alertsData]);

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('crossChain.page.title')}</h1>
          <p className="mt-1 text-muted-foreground">{t('crossChain.page.description')}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('crossChain.controls.refresh')}
          </Button>
        </div>
      </div>

      {/* Controls */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            {/* Symbol Selection */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('crossChain.controls.symbol')}:</span>
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_SYMBOLS.map((symbol) => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Chains Selection */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('crossChain.controls.chains')}:</span>
              <div className="flex flex-wrap gap-1">
                {AVAILABLE_CHAINS.map((chain) => (
                  <Button
                    key={chain}
                    variant={selectedChains.includes(chain) ? 'default' : 'outline'}
                    size="sm"
                    className="capitalize"
                    onClick={() => handleChainToggle(chain)}
                  >
                    {chain}
                  </Button>
                ))}
              </div>
            </div>

            {/* Arbitrage Threshold */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{t('crossChain.controls.threshold')}:</span>
              <Select
                value={arbitrageThreshold.toString()}
                onValueChange={(v) => setArbitrageThreshold(parseFloat(v))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0.1">0.1%</SelectItem>
                  <SelectItem value="0.3">0.3%</SelectItem>
                  <SelectItem value="0.5">0.5%</SelectItem>
                  <SelectItem value="1.0">1.0%</SelectItem>
                  <SelectItem value="2.0">2.0%</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Time Range */}
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t('crossChain.controls.timeRange')}:</span>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_RANGES.map((range) => (
                    <SelectItem key={range.value} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dashboard Overview */}
      <CrossChainDashboardCard
        data={dashboardData?.data}
        isLoading={dashboardLoading}
        onRefresh={refreshDashboard}
      />

      {/* Charts Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Price Trend Chart */}
        <CrossChainPriceChart data={historyData?.data} isLoading={historyLoading} height={350} />

        {/* Chain Comparison Bar */}
        <CrossChainComparisonBar prices={chartPrices} isLoading={comparisonLoading} height={350} />
      </div>

      {/* Deviation Chart */}
      <CrossChainDeviationChart data={historyData?.data} isLoading={historyLoading} height={250} />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Price Comparison */}
        <CrossChainComparisonCard
          data={comparisonData?.data}
          isLoading={comparisonLoading}
          onRefresh={refreshComparison}
          selectedChains={selectedChains}
          onChainSelect={handleChainToggle}
        />

        {/* Arbitrage Opportunities */}
        <CrossChainArbitrageCard
          opportunities={arbitrageData?.data?.opportunities}
          summary={arbitrageSummary}
          isLoading={arbitrageLoading}
          threshold={arbitrageThreshold}
        />
      </div>

      {/* Alerts Section */}
      {alertsList.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-yellow-500" />
              {t('crossChain.alerts.title')}
              <span className="ml-2 rounded-full bg-yellow-500/20 px-2 py-0.5 text-sm font-medium text-yellow-600">
                {alertsList.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alertsList.slice(0, 10).map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-lg border p-3 ${
                    alert.severity === 'critical'
                      ? 'border-red-500/30 bg-red-500/10'
                      : alert.severity === 'warning'
                        ? 'border-yellow-500/30 bg-yellow-500/10'
                        : 'border-blue-500/30 bg-blue-500/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {alert.chainA} → {alert.chainB}
                      </span>
                      <span className="text-muted-foreground">{alert.symbol}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono font-medium ${
                          alert.severity === 'critical'
                            ? 'text-red-600'
                            : alert.severity === 'warning'
                              ? 'text-yellow-600'
                              : 'text-blue-600'
                        }`}
                      >
                        {alert.deviationPercent.toFixed(2)}%
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(alert.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {alert.reason && (
                    <p className="mt-1 text-sm text-muted-foreground">{alert.reason}</p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
