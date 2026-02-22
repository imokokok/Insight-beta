'use client';

import { useState, useEffect } from 'react';

import { GitCompare, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

import { ContentSection } from '@/components/common';
import { Button } from '@/components/ui';
import { Badge, StatusBadge } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { SkeletonList } from '@/components/ui';
import { CHAIN_COLORS, API3_SUPPORTED_CHAINS } from '@/config/chains';
import { formatPrice, formatInterval, formatLatency } from '@/features/cross-chain/utils';
import { cn } from '@/shared/utils';

import { CrossChainMetrics } from './CrossChainMetrics';
import { CrossChainPriceChart } from './CrossChainPriceChart';

import type {
  CrossChainComparisonData,
  CrossChainDapiData,
  CrossChainPricePoint,
} from '../types/api3';

interface CrossChainComparisonProps {
  dapiName?: string;
  className?: string;
}

const availableDapis = ['ETH/USD', 'BTC/USD', 'LINK/USD', 'USDC/USD', 'SOL/USD'];

const generateMockData = (dapiName: string, chains: string[]): CrossChainComparisonData => {
  const now = Date.now();
  const basePrice = dapiName === 'ETH/USD' ? 2450 : dapiName === 'BTC/USD' ? 43250 : 14.5;

  const dapiData: CrossChainDapiData[] = chains.map((chain, index) => {
    const chainMultiplier = 1 + (index - 2) * 0.001;
    const price = basePrice * chainMultiplier * (1 + (Math.random() - 0.5) * 0.005);
    return {
      dapiName,
      chain,
      lastPrice: price,
      lastUpdatedAt: new Date(now - Math.random() * 60000).toISOString(),
      avgUpdateIntervalMs: 30000 + Math.random() * 60000,
      minUpdateIntervalMs: 15000 + Math.random() * 10000,
      maxUpdateIntervalMs: 60000 + Math.random() * 120000,
      avgLatencyMs: 500 + Math.random() * 500,
      minLatencyMs: 200 + Math.random() * 200,
      maxLatencyMs: 1000 + Math.random() * 800,
      gasCostUsd: 5 + Math.random() * 45,
      gasCostEth: 0.002 + Math.random() * 0.018,
      status: Math.random() > 0.1 ? 'active' : 'inactive',
      uptimePercentage: 99 + Math.random(),
      updateCount24h: 800 + Math.floor(Math.random() * 400),
    };
  });

  const priceHistory: CrossChainPricePoint[] = [];
  const points = 96;
  const interval = 900000;

  for (let i = 0; i < points; i++) {
    const timestamp = new Date(now - (points - 1 - i) * interval).toISOString();
    const point: CrossChainPricePoint = { timestamp };
    chains.forEach((chain, index) => {
      const chainMultiplier = 1 + (index - 2) * 0.001;
      const volatility = 0.002;
      const change = (Math.random() - 0.5) * volatility;
      const prevPoint = priceHistory[i - 1];
      const prevPrice = prevPoint ? Number(prevPoint[chain] || basePrice) : basePrice;
      const price = prevPrice * (1 + change) * chainMultiplier;
      point[chain] = Math.max(price, 0);
    });
    priceHistory.push(point);
  }

  return {
    dapiName,
    chains,
    dapiData,
    priceHistory,
    timeRange: '24h',
    generatedAt: new Date().toISOString(),
  };
};

export function CrossChainComparison({
  dapiName: initialDapiName,
  className,
}: CrossChainComparisonProps) {
  const [dapiName, setDapiName] = useState<string>(initialDapiName || 'ETH/USD');
  const [selectedChains, setSelectedChains] = useState<string[]>([
    'ethereum',
    'polygon',
    'arbitrum',
  ]);
  const [data, setData] = useState<CrossChainComparisonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 600));
        const newData = generateMockData(dapiName, selectedChains);
        setData(newData);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dapiName, selectedChains]);

  const toggleChain = (chain: string) => {
    setSelectedChains((prev) =>
      prev.includes(chain) ? prev.filter((c) => c !== chain) : [...prev, chain],
    );
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => {
      const newData = generateMockData(dapiName, selectedChains);
      setData(newData);
      setIsLoading(false);
    }, 600);
  };

  if (isLoading) {
    return (
      <ContentSection className={className}>
        <SkeletonList count={3} />
      </ContentSection>
    );
  }

  if (!data) {
    return (
      <ContentSection className={className}>
        <div className="py-8 text-center text-muted-foreground">暂无数据</div>
      </ContentSection>
    );
  }

  return (
    <ContentSection
      className={className}
      title={
        <span className="flex items-center gap-2">
          <GitCompare className="h-5 w-5 text-primary" />
          跨链对比
        </span>
      }
      description="同一 dAPI 在不同链上的指标对比分析"
      action={
        <div className="flex items-center gap-3">
          <Select value={dapiName} onValueChange={setDapiName}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="选择 dAPI" />
            </SelectTrigger>
            <SelectContent>
              {availableDapis.map((dapi) => (
                <SelectItem key={dapi} value={dapi}>
                  {dapi}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {API3_SUPPORTED_CHAINS.map((chain) => (
          <button
            key={chain}
            type="button"
            onClick={() => toggleChain(chain)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
              selectedChains.includes(chain)
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted',
            )}
            style={
              selectedChains.includes(chain) ? { backgroundColor: CHAIN_COLORS[chain] } : undefined
            }
          >
            {chain}
          </button>
        ))}
      </div>
      <div className="space-y-6">
        {data && (
          <>
            <CrossChainPriceChart data={data} chainColors={CHAIN_COLORS} />
            <CrossChainMetrics data={data} chainColors={CHAIN_COLORS} />
            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(!showDetails)}
                className="w-full"
              >
                {showDetails ? (
                  <ChevronUp className="mr-1 h-4 w-4" />
                ) : (
                  <ChevronDown className="mr-1 h-4 w-4" />
                )}
                {showDetails ? '收起详细信息' : '查看详细信息'}
              </Button>
              {showDetails && (
                <div className="mt-4 overflow-x-auto rounded-lg border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left font-medium">指标</th>
                        {data.chains.map((chain) => (
                          <th key={chain} className="px-4 py-3 text-center font-medium">
                            <Badge
                              style={{
                                backgroundColor: CHAIN_COLORS[chain as keyof typeof CHAIN_COLORS],
                              }}
                              className="text-white"
                            >
                              {chain}
                            </Badge>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b">
                        <td className="px-4 py-3 text-muted-foreground">状态</td>
                        {data.dapiData.map((dapi) => (
                          <td key={dapi.chain} className="px-4 py-3 text-center">
                            <StatusBadge
                              status={dapi.status}
                              text={dapi.status === 'active' ? '活跃' : '离线'}
                              size="sm"
                            />
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-3 text-muted-foreground">当前价格</td>
                        {data.dapiData.map((dapi) => (
                          <td
                            key={dapi.chain}
                            className="px-4 py-3 text-center font-mono font-medium"
                          >
                            {formatPrice(dapi.lastPrice)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-3 text-muted-foreground">平均更新间隔</td>
                        {data.dapiData.map((dapi) => (
                          <td key={dapi.chain} className="px-4 py-3 text-center font-mono">
                            {formatInterval(dapi.avgUpdateIntervalMs)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-3 text-muted-foreground">平均延迟</td>
                        {data.dapiData.map((dapi) => (
                          <td key={dapi.chain} className="px-4 py-3 text-center font-mono">
                            {formatLatency(dapi.avgLatencyMs)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-3 text-muted-foreground">Gas 成本 (USD)</td>
                        {data.dapiData.map((dapi) => (
                          <td key={dapi.chain} className="px-4 py-3 text-center font-mono">
                            ${dapi.gasCostUsd.toFixed(2)}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="px-4 py-3 text-muted-foreground">可用性</td>
                        {data.dapiData.map((dapi) => (
                          <td key={dapi.chain} className="px-4 py-3 text-center font-mono">
                            {dapi.uptimePercentage.toFixed(2)}%
                          </td>
                        ))}
                      </tr>
                      <tr>
                        <td className="px-4 py-3 text-muted-foreground">24h 更新次数</td>
                        {data.dapiData.map((dapi) => (
                          <td key={dapi.chain} className="px-4 py-3 text-center font-mono">
                            {dapi.updateCount24h.toLocaleString()}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ContentSection>
  );
}
