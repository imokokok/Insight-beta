'use client';

import { useState, useEffect, useCallback } from 'react';

import { Fuel, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { SkeletonList } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { TIME_RANGE_OPTIONS } from '@/config/constants';
import { formatGas, formatEth, formatUsd } from '@/features/cross-chain/utils/format';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import { GasCostTrendChart } from './GasCostTrendChart';

import type { GasCostAnalysisData, GasCostByDapi, GasCostByChain } from '../types/api3';

interface GasCostAnalysisProps {
  chain?: string;
  dapiName?: string;
  timeRange?: '1h' | '24h' | '7d' | '30d';
  className?: string;
}

const generateMockGasData = (timeRange: string): GasCostAnalysisData => {
  const now = Date.now();
  const points =
    timeRange === '1h' ? 60 : timeRange === '24h' ? 96 : timeRange === '7d' ? 168 : 720;
  const interval =
    timeRange === '1h'
      ? 60000
      : timeRange === '24h'
        ? 900000
        : timeRange === '7d'
          ? 600000
          : 3600000;

  const chains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'];
  const dapis = [
    { name: 'ETH/USD', chain: 'ethereum' },
    { name: 'BTC/USD', chain: 'ethereum' },
    { name: 'LINK/USD', chain: 'polygon' },
    { name: 'USDC/USD', chain: 'arbitrum' },
    { name: 'SOL/USD', chain: 'optimism' },
  ];

  const trend = Array.from({ length: points }, (_, i) => {
    const gasUsed = 100000 + Math.random() * 500000;
    const costEth = gasUsed * 20e-9;
    return {
      timestamp: new Date(now - (points - 1 - i) * interval).toISOString(),
      gasUsed: Math.floor(gasUsed),
      costEth,
      costUsd: costEth * 2500,
      transactionCount: Math.floor(5 + Math.random() * 20),
    };
  });

  const byDapi: GasCostByDapi[] = dapis.map((dapi) => ({
    dapiName: dapi.name,
    chain: dapi.chain,
    totalGasUsed: Math.floor(1000000 + Math.random() * 10000000),
    totalCostEth: (1000000 + Math.random() * 10000000) * 20e-9,
    totalCostUsd: (1000000 + Math.random() * 10000000) * 20e-9 * 2500,
    transactionCount: Math.floor(100 + Math.random() * 500),
    avgGasPerTransaction: Math.floor(50000 + Math.random() * 100000),
  }));

  const byChain: GasCostByChain[] = chains.map((chain) => {
    const chainDapis = byDapi.filter((d) => d.chain === chain);
    return {
      chain,
      totalGasUsed: chainDapis.reduce((sum, d) => sum + d.totalGasUsed, 0),
      totalCostEth: chainDapis.reduce((sum, d) => sum + d.totalCostEth, 0),
      totalCostUsd: chainDapis.reduce((sum, d) => sum + d.totalCostUsd, 0),
      transactionCount: chainDapis.reduce((sum, d) => sum + d.transactionCount, 0),
      dapiCount: chainDapis.length,
    };
  });

  const totalGasUsed = byDapi.reduce((sum, d) => sum + d.totalGasUsed, 0);
  const totalCostEth = byDapi.reduce((sum, d) => sum + d.totalCostEth, 0);
  const totalCostUsd = byDapi.reduce((sum, d) => sum + d.totalCostUsd, 0);
  const totalTransactions = byDapi.reduce((sum, d) => sum + d.transactionCount, 0);

  return {
    timeRange: timeRange as '1h' | '24h' | '7d' | '30d',
    byDapi,
    byChain: byChain.filter((c) => c.dapiCount > 0),
    trend,
    totalGasUsed,
    totalCostEth,
    totalCostUsd,
    totalTransactions,
    generatedAt: new Date().toISOString(),
  };
};

export function GasCostAnalysis({
  chain,
  dapiName,
  timeRange: initialTimeRange = '24h',
  className,
}: GasCostAnalysisProps) {
  const { t } = useI18n();
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>(initialTimeRange);
  const [data, setData] = useState<GasCostAnalysisData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<'dapis' | 'chains'>('dapis');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      const gasData = generateMockGasData(timeRange);

      let filteredData = { ...gasData };

      if (chain) {
        filteredData.byDapi = gasData.byDapi.filter(
          (d) => d.chain.toLowerCase() === chain.toLowerCase(),
        );
        filteredData.byChain = gasData.byChain.filter(
          (c) => c.chain.toLowerCase() === chain.toLowerCase(),
        );
      }
      if (dapiName) {
        filteredData.byDapi = gasData.byDapi.filter((d) =>
          d.dapiName.toLowerCase().includes(dapiName.toLowerCase()),
        );
      }

      filteredData.totalGasUsed = filteredData.byDapi.reduce((sum, d) => sum + d.totalGasUsed, 0);
      filteredData.totalCostEth = filteredData.byDapi.reduce((sum, d) => sum + d.totalCostEth, 0);
      filteredData.totalCostUsd = filteredData.byDapi.reduce((sum, d) => sum + d.totalCostUsd, 0);
      filteredData.totalTransactions = filteredData.byDapi.reduce(
        (sum, d) => sum + d.transactionCount,
        0,
      );

      setData(filteredData);
    } finally {
      setIsLoading(false);
    }
  }, [timeRange, chain, dapiName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    fetchData();
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Fuel className="h-5 w-5 text-primary" />
            {t('api3.gas.title') || 'Gas 成本分析'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonList count={3} />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Fuel className="h-5 w-5 text-primary" />
                {t('api3.gas.title') || 'Gas 成本分析'}
              </CardTitle>
              <CardDescription>
                {t('api3.gas.description') || '按链和 dAPI 分析 Gas 消耗和成本'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex rounded-lg border p-1">
                {TIME_RANGE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setTimeRange(option.value)}
                    className={cn(
                      'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                      timeRange === option.value
                        ? 'text-primary-foreground bg-primary'
                        : 'hover:bg-muted',
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <Button variant="outline" size="icon" onClick={handleRefresh}>
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">总 Gas 消耗</span>
              <Fuel className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="mt-2 text-2xl font-bold">{formatGas(data.totalGasUsed)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">ETH 成本</span>
              <span className="text-sm text-muted-foreground">Ξ</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-blue-600">
              {formatEth(data.totalCostEth)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">USD 成本</span>
              <span className="text-sm text-muted-foreground">$</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-green-600">
              {formatUsd(data.totalCostUsd)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">交易数量</span>
              <span className="text-sm text-muted-foreground">Tx</span>
            </div>
            <div className="mt-2 text-2xl font-bold text-purple-600">
              {data.totalTransactions.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <GasCostTrendChart trend={data.trend} />

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">
              {view === 'dapis'
                ? t('api3.gas.byDapi') || '按 dAPI 统计'
                : t('api3.gas.byChain') || '按链统计'}
            </CardTitle>
            <div className="flex rounded-lg border p-1">
              <button
                onClick={() => setView('dapis')}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  view === 'dapis' ? 'text-primary-foreground bg-primary' : 'hover:bg-muted',
                )}
              >
                {t('api3.gas.dapis') || 'dAPIs'}
              </button>
              <button
                onClick={() => setView('chains')}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  view === 'chains' ? 'text-primary-foreground bg-primary' : 'hover:bg-muted',
                )}
              >
                {t('api3.gas.chains') || 'Chains'}
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    {view === 'dapis'
                      ? t('api3.gas.dapiName') || 'dAPI 名称'
                      : t('api3.gas.chain') || '链'}
                  </TableHead>
                  {view === 'dapis' && <TableHead>{t('api3.gas.chain') || '链'}</TableHead>}
                  <TableHead>{t('api3.gas.gasUsed') || 'Gas 消耗'}</TableHead>
                  <TableHead>{t('api3.gas.costEth') || 'ETH 成本'}</TableHead>
                  <TableHead>{t('api3.gas.costUsd') || 'USD 成本'}</TableHead>
                  <TableHead>{t('api3.gas.transactions') || '交易数'}</TableHead>
                  {view === 'dapis' && <TableHead>{t('api3.gas.avgGas') || '平均 Gas'}</TableHead>}
                  {view === 'chains' && (
                    <TableHead>{t('api3.gas.dapiCount') || 'dAPI 数量'}</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {view === 'dapis'
                  ? data.byDapi.map((dapi) => (
                      <TableRow key={dapi.dapiName}>
                        <TableCell className="font-semibold">{dapi.dapiName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="capitalize">
                            {dapi.chain}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">{formatGas(dapi.totalGasUsed)}</TableCell>
                        <TableCell className="font-mono">{formatEth(dapi.totalCostEth)}</TableCell>
                        <TableCell className="font-mono">{formatUsd(dapi.totalCostUsd)}</TableCell>
                        <TableCell className="font-mono">
                          {dapi.transactionCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatGas(dapi.avgGasPerTransaction)}
                        </TableCell>
                      </TableRow>
                    ))
                  : data.byChain.map((chainItem) => (
                      <TableRow key={chainItem.chain}>
                        <TableCell className="font-semibold">
                          <Badge variant="secondary" className="capitalize">
                            {chainItem.chain}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatGas(chainItem.totalGasUsed)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatEth(chainItem.totalCostEth)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {formatUsd(chainItem.totalCostUsd)}
                        </TableCell>
                        <TableCell className="font-mono">
                          {chainItem.transactionCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="font-mono">{chainItem.dapiCount}</TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
