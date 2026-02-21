'use client';

import { useState, useCallback, useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, Info, RefreshCw, Globe } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getAvailablePythSymbols } from '@/config/pythPriceFeeds';
import { getSupportedPythChains } from '@/lib/blockchain/pythOracle';
import type { SupportedChain } from '@/types/unifiedOracleTypes';
import { cn } from '@/shared/utils/ui';

interface ChainPrice {
  chain: SupportedChain;
  price: number;
  timestamp: number;
  confidence: number;
  status: 'available' | 'unavailable' | 'stale';
}

interface CrossChainComparisonData {
  symbol: string;
  prices: ChainPrice[];
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  priceRangePercent: number;
  maxDeviation: number;
  maxDeviationPercent: number;
}

const CHAIN_DISPLAY_NAMES: Record<SupportedChain, string> = {
  ethereum: 'Ethereum',
  polygon: 'Polygon',
  arbitrum: 'Arbitrum',
  optimism: 'Optimism',
  base: 'Base',
  avalanche: 'Avalanche',
  bsc: 'BSC',
  fantom: 'Fantom',
  celo: 'Celo',
  gnosis: 'Gnosis',
  linea: 'Linea',
  scroll: 'Scroll',
  mantle: 'Mantle',
  mode: 'Mode',
  blast: 'Blast',
  solana: 'Solana',
  near: 'Near',
  aptos: 'Aptos',
  sui: 'Sui',
  polygonAmoy: 'Polygon Amoy',
  sepolia: 'Sepolia',
  goerli: 'Goerli',
  mumbai: 'Mumbai',
  local: 'Local',
};

const mockCrossChainData: CrossChainComparisonData[] = [
  {
    symbol: 'BTC',
    prices: [
      { chain: 'ethereum', price: 67234.56, timestamp: Date.now(), confidence: 0.12, status: 'available' },
      { chain: 'polygon', price: 67245.23, timestamp: Date.now(), confidence: 0.15, status: 'available' },
      { chain: 'arbitrum', price: 67228.90, timestamp: Date.now(), confidence: 0.10, status: 'available' },
      { chain: 'optimism', price: 67238.12, timestamp: Date.now(), confidence: 0.13, status: 'available' },
      { chain: 'base', price: 67230.45, timestamp: Date.now(), confidence: 0.11, status: 'available' },
      { chain: 'avalanche', price: 67240.78, timestamp: Date.now() - 120000, confidence: 0.18, status: 'stale' },
      { chain: 'bsc', price: 67235.67, timestamp: Date.now(), confidence: 0.14, status: 'available' },
    ],
    avgPrice: 67236.24,
    maxPrice: 67245.23,
    minPrice: 67228.90,
    priceRange: 16.33,
    priceRangePercent: 0.0243,
    maxDeviation: 8.99,
    maxDeviationPercent: 0.0134,
  },
  {
    symbol: 'ETH',
    prices: [
      { chain: 'ethereum', price: 3456.78, timestamp: Date.now(), confidence: 0.08, status: 'available' },
      { chain: 'polygon', price: 3458.12, timestamp: Date.now(), confidence: 0.09, status: 'available' },
      { chain: 'arbitrum', price: 3455.45, timestamp: Date.now(), confidence: 0.07, status: 'available' },
      { chain: 'optimism', price: 3457.23, timestamp: Date.now(), confidence: 0.08, status: 'available' },
      { chain: 'base', price: 3456.90, timestamp: Date.now(), confidence: 0.08, status: 'available' },
      { chain: 'avalanche', price: 3457.89, timestamp: Date.now(), confidence: 0.10, status: 'available' },
      { chain: 'bsc', price: 3456.34, timestamp: Date.now(), confidence: 0.09, status: 'available' },
    ],
    avgPrice: 3456.96,
    maxPrice: 3458.12,
    minPrice: 3455.45,
    priceRange: 2.67,
    priceRangePercent: 0.0772,
    maxDeviation: 1.51,
    maxDeviationPercent: 0.0437,
  },
  {
    symbol: 'SOL',
    prices: [
      { chain: 'ethereum', price: 178.45, timestamp: Date.now(), confidence: 0.25, status: 'available' },
      { chain: 'polygon', price: 178.90, timestamp: Date.now(), confidence: 0.28, status: 'available' },
      { chain: 'arbitrum', price: 177.89, timestamp: Date.now(), confidence: 0.22, status: 'available' },
      { chain: 'optimism', price: 178.67, timestamp: Date.now(), confidence: 0.26, status: 'available' },
      { chain: 'base', price: 178.12, timestamp: Date.now(), confidence: 0.24, status: 'available' },
      { chain: 'avalanche', price: 179.12, timestamp: Date.now(), confidence: 0.30, status: 'available' },
      { chain: 'bsc', price: 178.34, timestamp: Date.now() - 300000, confidence: 0.27, status: 'stale' },
    ],
    avgPrice: 178.50,
    maxPrice: 179.12,
    minPrice: 177.89,
    priceRange: 1.23,
    priceRangePercent: 0.689,
    maxDeviation: 0.62,
    maxDeviationPercent: 0.347,
  },
];

interface CrossChainPriceComparisonProps {
  isLoading?: boolean;
}

export function CrossChainPriceComparison({ isLoading = false }: CrossChainPriceComparisonProps) {
  const [selectedSymbol, setSelectedSymbol] = useState<string>('BTC');
  const [refreshing, setRefreshing] = useState(false);

  const availableSymbols = getAvailablePythSymbols();
  const supportedChains = getSupportedPythChains();

  const currentData = useMemo(() => {
    return mockCrossChainData.find(d => d.symbol === selectedSymbol) || mockCrossChainData[0];
  }, [selectedSymbol]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  const getDeviationColor = (percent: number) => {
    if (percent < 0.1) return 'text-green-500';
    if (percent < 0.5) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getDeviationBadgeVariant = (percent: number) => {
    if (percent < 0.1) return 'success';
    if (percent < 0.5) return 'warning';
    return 'destructive';
  };

  const getStatusBadge = (status: ChainPrice['status']) => {
    switch (status) {
      case 'available':
        return <Badge variant="success" className="h-5 px-1.5 text-[10px]">正常</Badge>;
      case 'stale':
        return <Badge variant="warning" className="h-5 px-1.5 text-[10px]">延迟</Badge>;
      case 'unavailable':
        return <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">不可用</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                跨链价格一致性验证
              </CardTitle>
              <CardDescription>
                对比同一价格源在不同链上的价格差异与一致性
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="选择价格源" />
                </SelectTrigger>
                <SelectContent>
                  {availableSymbols.map((symbol) => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing || isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                刷新
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">平均价格</span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">
                    ${currentData.avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">价格区间</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        最高价与最低价之间的差值
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    ${currentData.priceRange.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <Badge variant="outline" className={cn(getDeviationColor(currentData.priceRangePercent))}>
                    {currentData.priceRangePercent.toFixed(3)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">最大偏差</span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl font-bold">
                    ${currentData.maxDeviation.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <Badge variant={getDeviationBadgeVariant(currentData.maxDeviationPercent)}>
                    {currentData.maxDeviationPercent.toFixed(3)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">覆盖链数</span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{currentData.prices.length}</span>
                  <span className="text-sm text-muted-foreground ml-1">/ {supportedChains.length}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>各链价格详情</CardTitle>
          <CardDescription>
            按链展示价格数据、与平均值的差异及更新状态
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>链名称</TableHead>
                  <TableHead className="text-right">价格</TableHead>
                  <TableHead className="text-right">与平均价差值</TableHead>
                  <TableHead className="text-right">偏差百分比</TableHead>
                  <TableHead className="text-right">置信度</TableHead>
                  <TableHead className="text-center">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.prices.map((chainPrice) => {
                  const diffFromAvg = chainPrice.price - currentData.avgPrice;
                  const diffPercent = ((diffFromAvg / currentData.avgPrice) * 100);
                  const isPositive = diffFromAvg >= 0;

                  return (
                    <TableRow key={chainPrice.chain}>
                      <TableCell className="font-medium">
                        {CHAIN_DISPLAY_NAMES[chainPrice.chain]}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${chainPrice.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isPositive ? (
                            <ArrowUpRight className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                          )}
                          <span className={cn(isPositive ? 'text-green-500' : 'text-red-500', 'font-medium')}>
                            ${Math.abs(diffFromAvg).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            getDeviationColor(Math.abs(diffPercent)),
                            'justify-end'
                          )}
                        >
                          {isPositive ? '+' : ''}{diffPercent.toFixed(4)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-muted-foreground">
                          {chainPrice.confidence.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(chainPrice.status)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>统计摘要</CardTitle>
          <CardDescription>
            跨链价格一致性分析指标
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">一致性评分</span>
              </div>
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold">
                    {Math.max(0, 100 - currentData.maxDeviationPercent * 100).toFixed(1)}
                  </span>
                  <span className="text-lg text-muted-foreground">/ 100</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-green-500"
                    style={{
                      width: `${Math.max(0, 100 - currentData.maxDeviationPercent * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
            <div className="rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">风险等级</span>
              </div>
              <div className="mt-2">
                <Badge
                  variant={getDeviationBadgeVariant(currentData.maxDeviationPercent)}
                  className="text-base py-1 px-3"
                >
                  {currentData.maxDeviationPercent < 0.1
                    ? '低风险'
                    : currentData.maxDeviationPercent < 0.5
                      ? '中等风险'
                      : '高风险'}
                </Badge>
                <p className="mt-2 text-sm text-muted-foreground">
                  {currentData.maxDeviationPercent < 0.1
                    ? '跨链价格高度一致，套利空间极小'
                    : currentData.maxDeviationPercent < 0.5
                      ? '存在轻微价格差异，需持续监控'
                      : '价格差异较大，可能存在套利机会或数据异常'}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
