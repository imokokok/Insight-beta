'use client';

import { memo, useMemo, useState } from 'react';

import { Droplets, TrendingUp, TrendingDown, Activity, CheckCircle, Filter } from 'lucide-react';

import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { cn } from '@/shared/utils';

import type { LiquidityResponse, ChainLiquidity } from '../types';

const CHAIN_COLORS: Record<string, string> = {
  ethereum: '#627eea',
  bsc: '#f0b90b',
  polygon: '#8247e5',
  avalanche: '#e84142',
  arbitrum: '#28a0f0',
  optimism: '#ff0420',
  base: '#0052ff',
};

const HEALTH_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  excellent: { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500/30' },
  good: { bg: 'bg-emerald-500/10', text: 'text-emerald-600', border: 'border-emerald-500/30' },
  fair: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', border: 'border-yellow-500/30' },
  poor: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/30' },
};

interface LiquidityAnalysisProps {
  data?: LiquidityResponse;
  isLoading?: boolean;
}

function formatLiquidity(value: number): string {
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

function calculateHealthScore(chain: ChainLiquidity): { score: number; label: string } {
  let score = 0;
  const liquidity = chain.totalLiquidity;
  const change24h = chain.liquidityChangePercent24h;
  const slippage = chain.avgSlippage;

  if (liquidity >= 1e9) score += 40;
  else if (liquidity >= 1e8) score += 30;
  else if (liquidity >= 1e7) score += 20;
  else if (liquidity >= 1e6) score += 10;

  if (change24h >= 5) score += 25;
  else if (change24h >= 0) score += 20;
  else if (change24h >= -5) score += 10;

  if (slippage <= 0.1) score += 35;
  else if (slippage <= 0.5) score += 25;
  else if (slippage <= 1) score += 15;
  else if (slippage <= 2) score += 5;

  let label = 'poor';
  if (score >= 85) label = 'excellent';
  else if (score >= 65) label = 'good';
  else if (score >= 45) label = 'fair';

  return { score, label };
}

export const LiquidityAnalysis = memo(function LiquidityAnalysis({
  data,
  isLoading,
}: LiquidityAnalysisProps) {
  const [selectedChain, setSelectedChain] = useState<string>('all');
  const [selectedAsset, setSelectedAsset] = useState<string>('all');

  const filteredChains = useMemo(() => {
    if (!data?.chains) return [];
    return data.chains.filter((chain) => {
      const matchesChain = selectedChain === 'all' || chain.chain === selectedChain;
      const matchesAsset =
        selectedAsset === 'all' || chain.topPools.some((pool) => pool.symbol === selectedAsset);
      return matchesChain && matchesAsset;
    });
  }, [data?.chains, selectedChain, selectedAsset]);

  const availableAssets = useMemo(() => {
    if (!data?.chains) return [];
    const assets = new Set<string>();
    data.chains.forEach((chain) => {
      chain.topPools.forEach((pool) => assets.add(pool.symbol));
    });
    return Array.from(assets).sort();
  }, [data?.chains]);

  const availableChains = useMemo(() => {
    if (!data?.chains) return [];
    return data.chains.map((chain) => chain.chain);
  }, [data?.chains]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="mt-1 h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data || !data.chains || data.chains.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            流动性分析
          </CardTitle>
          <CardDescription>暂无流动性数据</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <CheckCircle className="mx-auto h-8 w-8 opacity-50" />
            <p className="mt-2">当前没有流动性数据</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Droplets className="h-5 w-5" />
              流动性分析
            </CardTitle>
            <CardDescription>跨链流动性概览与深度分析</CardDescription>
          </div>
          {data.summary && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1">
                总流动性: {formatLiquidity(data.summary.totalLiquidity)}
              </Badge>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedChain} onValueChange={setSelectedChain}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="选择链" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部链</SelectItem>
                {availableChains.map((chain) => (
                  <SelectItem key={chain} value={chain}>
                    {chain.charAt(0).toUpperCase() + chain.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Select value={selectedAsset} onValueChange={setSelectedAsset}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="选择资产" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部资产</SelectItem>
              {availableAssets.map((asset) => (
                <SelectItem key={asset} value={asset}>
                  {asset}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">总流动性</CardTitle>
              <Droplets className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatLiquidity(data.summary?.totalLiquidity ?? 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                平均: {formatLiquidity(data.summary?.avgLiquidity ?? 0)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">24h 变化</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div
                className={cn(
                  'flex items-center gap-1 text-2xl font-bold',
                  (data.summary?.liquidityChangePercent24h ?? 0) >= 0
                    ? 'text-green-600'
                    : 'text-red-600',
                )}
              >
                {(data.summary?.liquidityChangePercent24h ?? 0) >= 0 ? (
                  <TrendingUp className="h-5 w-5" />
                ) : (
                  <TrendingDown className="h-5 w-5" />
                )}
                {(data.summary?.liquidityChangePercent24h ?? 0) >= 0 ? '+' : ''}
                {(data.summary?.liquidityChangePercent24h ?? 0).toFixed(2)}%
              </div>
              <p className="text-xs text-muted-foreground">流动性变化</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">最高流动性链</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold capitalize">
                {data.summary?.mostLiquidChain ?? '-'}
              </div>
              <p className="text-xs text-muted-foreground">
                最活跃资产: {data.summary?.mostLiquidSymbol ?? '-'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">健康度评分</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">优秀</div>
              <p className="text-xs text-muted-foreground">整体流动性健康</p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          {filteredChains.map((chain) => {
            const health = calculateHealthScore(chain);
            return (
              <div
                key={chain.chain}
                className={cn(
                  'rounded-lg border p-4 transition-colors hover:bg-muted/50',
                  HEALTH_COLORS[health.label]?.border ?? '',
                  HEALTH_COLORS[health.label]?.bg ?? '',
                )}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-4">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full"
                      style={{ backgroundColor: CHAIN_COLORS[chain.chain] || '#94a3b8' }}
                    >
                      <span className="text-xs font-bold text-white">
                        {chain.displayName.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold capitalize">{chain.displayName}</span>
                        <Badge
                          variant="outline"
                          className={cn('capitalize', HEALTH_COLORS[health.label]?.text ?? '')}
                        >
                          {health.label === 'excellent' && '优秀'}
                          {health.label === 'good' && '良好'}
                          {health.label === 'fair' && '一般'}
                          {health.label === 'poor' && '较差'}
                        </Badge>
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                        <span>健康度: {health.score}/100</span>
                        <span>•</span>
                        <span>平均滑点: {chain.avgSlippage.toFixed(3)}%</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <div className="font-mono text-xl font-semibold">
                      {formatLiquidity(chain.totalLiquidity)}
                    </div>
                    <div
                      className={cn(
                        'flex items-center gap-1 text-sm font-medium',
                        chain.liquidityChangePercent24h >= 0 ? 'text-green-600' : 'text-red-600',
                      )}
                    >
                      {chain.liquidityChangePercent24h >= 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {chain.liquidityChangePercent24h >= 0 ? '+' : ''}
                      {chain.liquidityChangePercent24h.toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {chain.topPools.slice(0, 4).map((pool) => (
                    <Badge key={pool.symbol} variant="secondary" className="gap-1">
                      {pool.symbol}
                      <span className="text-muted-foreground">
                        {formatLiquidity(pool.liquidity)}
                      </span>
                    </Badge>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {filteredChains.length === 0 && (
          <div className="py-8 text-center text-muted-foreground">没有找到匹配的流动性数据</div>
        )}
      </CardContent>
    </Card>
  );
});
