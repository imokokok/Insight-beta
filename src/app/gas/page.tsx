'use client';

import { useState, useEffect } from 'react';

import { RefreshCw, Zap, TrendingUp, Activity, AlertTriangle, History } from 'lucide-react';







import { GasPriceHistoryViewer } from '@/components/features/gas/GasPriceHistoryViewer';
import { GasPriceTrendChart } from '@/components/features/gas/GasPriceTrendChart';
import { GasProviderHealthCard } from '@/components/features/gas/GasProviderHealthCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useGasPrices, useGasPriceTrend, useGasPriceHealth, useWarmupGasCache } from '@/hooks/useGasPrice';
import { usePageOptimizations } from '@/hooks/usePageOptimizations';
import { cn } from '@/lib/utils';


const DEFAULT_CHAINS = ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism', 'base'];

export default function GasPriceMonitorPage() {
  const [selectedChains, setSelectedChains] = useState<string[]>(DEFAULT_CHAINS);
  const [showTrend, setShowTrend] = useState(false);
  const [selectedChainForTrend, setSelectedChainForTrend] = useState<string>('ethereum');

  const { data: gasPrices, isLoading: pricesLoading, mutate: refreshPrices } = useGasPrices(selectedChains);
  const { data: trendData, isLoading: trendLoading } = useGasPriceTrend(selectedChainForTrend, 'average');
  const { data: healthData, isLoading: healthLoading, mutate: refreshHealth } = useGasPriceHealth();
  const warmup = useWarmupGasCache(selectedChains, refreshPrices);

  useEffect(() => {
    warmup();
  }, []);

  const handleRefresh = () => {
    refreshPrices();
    refreshHealth();
  };

  // 页面优化：键盘快捷键
  usePageOptimizations({
    pageName: 'Gas价格监控',
    onRefresh: async () => {
      handleRefresh();
    },
    enableSearch: false,
    showRefreshToast: true,
  });

  const handleToggleChain = (chain: string) => {
    if (selectedChains.includes(chain)) {
      setSelectedChains(selectedChains.filter(c => c !== chain));
    } else {
      setSelectedChains([...selectedChains, chain]);
    }
  };

  const handleShowTrend = (chain: string) => {
    setSelectedChainForTrend(chain);
    setShowTrend(true);
  };

  const gasData = gasPrices?.data || [];
  const avgGasPrice = gasData.reduce((sum, p) => sum + p.average, 0) / (gasData.length || 1);
  const slowGasPrice = gasData.reduce((sum, p) => sum + p.slow, 0) / (gasData.length || 1);
  const fastGasPrice = gasData.reduce((sum, p) => sum + p.fast, 0) / (gasData.length || 1);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Gas Price Monitor</h1>
            <p className="text-muted-foreground mt-1">Real-time gas price tracking across multiple chains</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={pricesLoading || healthLoading}
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', pricesLoading || healthLoading && 'animate-spin')} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => warmup()}
            >
              <Zap className="mr-2 h-4 w-4" />
              Warm Cache
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4 text-blue-500" />
              Average Gas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              {avgGasPrice ? `$${(avgGasPrice / 1e9).toFixed(2)}` : 'Loading...'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Across {selectedChains.length} chains</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              Slow Gas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-emerald-600">
              {slowGasPrice ? `$${(slowGasPrice / 1e9).toFixed(2)}` : 'Loading...'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Best for cost-sensitive transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-yellow-500" />
              Fast Gas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              {fastGasPrice ? `$${(fastGasPrice / 1e9).toFixed(2)}` : 'Loading...'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Best for time-sensitive transactions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Price Range
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {gasPrices?.data && gasPrices.data.length > 0 
                ? `$${((fastGasPrice - slowGasPrice) / 1e9).toFixed(2)}`
                : 'Loading...'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Difference between slow and fast</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Chain Selection</h2>
          <div className="flex flex-wrap gap-2">
            {DEFAULT_CHAINS.map((chain) => (
              <Button
                key={chain}
                variant={selectedChains.includes(chain) ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleToggleChain(chain)}
              >
                {chain.toUpperCase()}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setShowTrend(!showTrend)}
            >
              <TrendingUp className="mr-2 h-4 w-4" />
              {showTrend ? 'Hide Trend Chart' : 'Show Trend Chart'}
            </Button>
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => setSelectedChains(DEFAULT_CHAINS)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset Selection
            </Button>
          </div>
        </div>
      </div>

      {showTrend && (
        <div className="mb-8">
          <GasPriceTrendChart data={trendData?.data} isLoading={trendLoading} height={400} />
        </div>
      )}

      <div className="mb-8">
        <GasProviderHealthCard data={healthData} isLoading={healthLoading} />
      </div>

      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Gas Prices by Chain</CardTitle>
            <CardDescription>Current gas prices for selected chains</CardDescription>
          </CardHeader>
          <CardContent>
            {pricesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-16 bg-muted/30 rounded animate-pulse" />
                ))}
              </div>
            ) : gasPrices?.data && gasPrices.data.length > 0 ? (
              <div className="space-y-3">
                {gasPrices.data.map((price) => (
                  <div
                    key={price.chain}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => handleShowTrend(price.chain)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="font-semibold capitalize">{price.chain}</div>
                      <Badge variant="outline">{price.provider}</Badge>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Slow</p>
                        <p className="font-mono font-semibold">${(price.slow / 1e9).toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Average</p>
                        <p className="font-mono font-semibold">${(price.average / 1e9).toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Fast</p>
                        <p className="font-mono font-semibold">${(price.fast / 1e9).toFixed(2)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Fastest</p>
                        <p className="font-mono font-semibold">${(price.fastest / 1e9).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No gas price data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Gas Price History</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowTrend(false)}
          >
            <History className="mr-1 h-4 w-4" />
            View History
          </Button>
        </div>
        {selectedChains.length > 0 && (
          <GasPriceHistoryViewer
            chain={selectedChains[0]!}
            provider="etherscan"
            limit={200}
          />
        )}
      </div>
    </div>
  );
}
