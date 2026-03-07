'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';

import { ArrowUpRight, ArrowDownRight, RefreshCw, Globe, Info } from 'lucide-react';

import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { CHAIN_COLORS, CHAIN_DISPLAY_NAMES } from '@/config/chains';
import { useI18n } from '@/i18n';
import { logger } from '@/shared/logger';
import {
  formatPrice,
  formatDeviation,
  getDeviationColor,
  getDeviationBadgeVariant,
} from '@/shared/utils/format';
import { cn } from '@/shared/utils/ui';

export interface ChainPriceData {
  chain: string;
  price: number;
  timestamp: number | string;
  confidence?: number;
  status?: 'available' | 'unavailable' | 'stale' | 'active' | 'inactive';
  deviationFromAvg?: number;
  deviationPercent?: number;
  lastUpdate?: string;
}

export interface CrossChainStats {
  avgPrice: number;
  maxPrice: number;
  minPrice: number;
  priceRange: number;
  priceRangePercent: number;
  maxDeviation: number;
  maxDeviationPercent: number;
}

export interface OracleCrossChainComparisonProps {
  protocol: 'chainlink' | 'pyth' | 'api3';
  title?: string;
  description?: string;
  availableSymbols: string[];
  supportedChains: string[];
  chainDisplayNames?: Record<string, string>;
  chainColors?: Record<string, string>;
  fetchData: (
    symbol: string,
    chains: string[],
  ) => Promise<{
    symbol: string;
    prices: ChainPriceData[];
    stats: CrossChainStats;
  }>;
  isLoading?: boolean;
  showConfidence?: boolean;
  showStatus?: boolean;
  showConsistencyScore?: boolean;
  className?: string;
}

function LoadingSkeleton() {
    <div className="space-y-4">
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton key={i} className="h-24 w-full" />
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function OracleCrossChainComparison({
  protocol,
  title,
  description,
  availableSymbols,
  supportedChains,
  chainDisplayNames = CHAIN_DISPLAY_NAMES,
  chainColors = CHAIN_COLORS,
  fetchData,
  isLoading: externalLoading = false,
  showConfidence = false,
  showStatus = true,
  showConsistencyScore = true,
  className,
}: OracleCrossChainComparisonProps) {
  const { t } = useI18n();
  const [selectedSymbol, setSelectedSymbol] = useState<string>(availableSymbols[0] || 'BTC');
  const [selectedChains, setSelectedChains] = useState<string[]>(supportedChains.slice(0, 5));
  const [data, setData] = useState<{
    symbol: string;
    prices: ChainPriceData[];
    stats: CrossChainStats;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!fetchData) return;
    setIsLoading(true);
    try {
      const result = await fetchData(selectedSymbol, selectedChains);
      setData(result);
    } catch (error) {
      logger.error('Failed to load cross-chain comparison data:', { error });
    } finally {
      setIsLoading(false);
    }
  }, [fetchData, selectedSymbol, selectedChains]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const toggleChain = useCallback((chain: string) => {
    setSelectedChains((prev) =>
      prev.includes(chain) ? prev.filter((c) => c !== chain) : [...prev, chain],
    );
  }, []);

  const processedPrices = useMemo(() => {
    if (!data) return [];
    return data.prices.map((price) => {
      const diffFromAvg = price.price - data.stats.avgPrice;
      const diffPercent = (diffFromAvg / data.stats.avgPrice) * 100;
      return {
        ...price,
        deviationFromAvg: diffFromAvg,
        deviationPercent: diffPercent,
      };
    });
  }, [data]);

  const consistencyScore = useMemo(() => {
    if (!data) return 100;
    return Math.max(0, 100 - data.stats.maxDeviationPercent * 100);
  }, [data]);

  const riskLevel = useMemo(() => {
    if (!data) return 'low';
    const { maxDeviationPercent } = data.stats;
    if (maxDeviationPercent < 0.1) return 'low';
    if (maxDeviationPercent < 0.5) return 'medium';
    return 'high';
  }, [data]);

  const defaultTitle = useMemo(() => {
    switch (protocol) {
      case 'chainlink':
        return t('crossChain.comparison.chainlinkTitle');
      case 'pyth':
        return t('crossChain.comparison.pythTitle');
      case 'api3':
        return t('crossChain.comparison.api3Title');
      default:
        return t('crossChain.comparison.chainlinkTitle');
    }
  }, [protocol, t]);

  const defaultDescription = useMemo(() => {
    switch (protocol) {
      case 'chainlink':
        return t('crossChain.comparison.chainlinkDescription');
      case 'pyth':
        return t('crossChain.comparison.pythDescription');
      case 'api3':
        return t('crossChain.comparison.api3Description');
      default:
        return t('crossChain.comparison.chainlinkDescription');
    }
  }, [protocol, t]);

  const getStatusBadge = (status?: ChainPriceData['status']) => {
    if (!showStatus || !status) return null;
    switch (status) {
      case 'available':
      case 'active':
        return (
          <Badge variant="success" className="h-5 px-1.5 text-[10px]">
            {t('crossChain.status.available')}
          </Badge>
        );
      case 'stale':
        return (
          <Badge variant="warning" className="h-5 px-1.5 text-[10px]">
            {t('crossChain.status.delayed')}
          </Badge>
        );
      case 'unavailable':
      case 'inactive':
        return (
          <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">
            {t('crossChain.status.unavailable')}
          </Badge>
        );
      default:
        return null;
    }
  };

  if (isLoading || externalLoading) {
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {title || defaultTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LoadingSkeleton />
        </CardContent>
      </Card>
      </Card>
    );
  }

  if (!data) {
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="py-8 text-center text-muted-foreground">{t('common.noData')}</div>
        </CardContent>
      </Card>
          <div className="py-8 text-center text-muted-foreground">{t('common.noData')}</div>
        </CardContent>
      </Card>
    );
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {title || defaultTitle}
              </CardTitle>
              <CardDescription className="mt-1">
                {description || defaultDescription}
              </CardDescription>
            </div>
            <div className="flex flex-col gap-3 sm:w-80">
              <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                <SelectTrigger>
                  <SelectValue placeholder={t('crossChain.comparison.selectPriceSource')} />
                </SelectTrigger>
                <SelectContent>
                  {availableSymbols.map((symbol) => (
                    <SelectItem key={symbol} value={symbol}>
                      {symbol}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing || isLoading}
                >
                  <RefreshCw className={cn('mr-2 h-4 w-4', refreshing && 'animate-spin')} />
                  {t('crossChain.controls.refresh')}
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {supportedChains.map((chain) => (
              <button
                key={chain}
                type="button"
                onClick={() => toggleChain(chain)}
                className={cn(
                  'rounded-md px-3 py-1.5 text-xs font-medium transition-all',
                  selectedChains.includes(chain)
                    ? 'text-white'
                    : 'text-muted-foreground hover:bg-muted',
                )}
                style={
                  selectedChains.includes(chain)
                    ? { backgroundColor: chainColors[chain] || '#6b7280' }
                    : undefined
                }
              >
                {chainDisplayNames[chain] || chain}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('crossChain.stats.avgPrice')}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{formatPrice(data.stats.avgPrice)}</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('crossChain.stats.priceRange')}
                  </span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>{t('crossChain.stats.priceRangeTooltip')}</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl font-bold">{formatPrice(data.stats.priceRange)}</span>
                  <Badge
                    variant="outline"
                    className={cn(getDeviationColor(data.stats.priceRangePercent))}
                  >
                    {formatDeviation(data.stats.priceRangePercent)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('crossChain.stats.maxDeviation')}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-2xl font-bold">{formatPrice(data.stats.maxDeviation)}</span>
                  <Badge variant={getDeviationBadgeVariant(data.stats.maxDeviationPercent)}>
                    {formatDeviation(data.stats.maxDeviationPercent)}%
                  </Badge>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('crossChain.stats.coveredChains')}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold">{data.prices.length}</span>
                  <span className="ml-1 text-sm text-muted-foreground">
                    / {supportedChains.length}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('crossChain.priceDetails.title')}</CardTitle>
          <CardDescription>{t('crossChain.priceDetails.description')}</CardDescription>
        </CardHeader>
        <CardContent>
                  <span className="text-2xl font-bold">{data.prices.length}</span>
                  <span className="ml-1 text-sm text-muted-foreground">
                    / {supportedChains.length}
                <TableRow>
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('crossChain.priceDetails.title')}</CardTitle>
          <CardDescription>{t('crossChain.priceDetails.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('crossChain.table.chain')}</TableHead>
                    <TableRow key={chainPrice.chain}>
                  <TableHead className="text-right">{t('crossChain.table.diffFromAvg')}</TableHead>
                  <TableHead className="text-right">
                    {t('crossChain.table.deviationPercent')}
                  </TableHead>
                  {showConfidence && (
                    <TableHead className="text-right">{t('crossChain.table.confidence')}</TableHead>
                  )}
                  {showStatus && (
                    <TableHead className="text-center">{t('crossChain.table.status')}</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {processedPrices.map((chainPrice) => {
                  const isPositive = (chainPrice.deviationFromAvg ?? 0) >= 0;
                  return (
                    <TableRow key={chainPrice.chain}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: chainColors[chainPrice.chain] || '#6b7280' }}
                          />
                          {chainDisplayNames[chainPrice.chain] || chainPrice.chain}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatPrice(chainPrice.price)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isPositive ? (
                            <ArrowUpRight className="h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowDownRight className="h-4 w-4 text-red-500" />
                          )}
                          <span
                            className={cn(
                              isPositive ? 'text-green-500' : 'text-red-500',
                              'font-medium',
                            )}
                          >
                            {formatPrice(Math.abs(chainPrice.deviationFromAvg ?? 0))}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            getDeviationColor(Math.abs(chainPrice.deviationPercent ?? 0)),
                            'justify-end',
                          )}
                        >
                          {isPositive ? '+' : ''}
                          {formatDeviation(chainPrice.deviationPercent ?? 0)}%
                        </Badge>
                      </TableCell>
                      {showConfidence && (
        </CardContent>
      </Card>
                            {(chainPrice.confidence ?? 0).toFixed(2)}%
                          </span>
        <Card>
          <CardHeader>
            <CardTitle>{t('crossChain.summary.title')}</CardTitle>
            <CardDescription>{t('crossChain.summary.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('crossChain.stats.consistencyScore')}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <span className="text-3xl font-bold">{consistencyScore.toFixed(1)}</span>
                    <span className="text-lg text-muted-foreground">/ 100</span>
                  </div>
                  <div className="mt-2 h-2 w-full rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-green-500"
                      style={{ width: `${consistencyScore}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('crossChain.stats.riskLevel')}
                  </span>
                </div>
                <div className="mt-2">
                  <Badge
                    variant={
                      riskLevel === 'low'
                        ? 'success'
                        : riskLevel === 'medium'
                          ? 'warning'
                          : 'destructive'
                    }
                    className="px-3 py-1 text-base"
                  >
                    {riskLevel === 'low'
                      ? t('crossChain.stats.riskLow')
                      : riskLevel === 'medium'
                        ? t('crossChain.stats.riskMedium')
                        : t('crossChain.stats.riskHigh')}
                  </Badge>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {riskLevel === 'low'
                      ? t('crossChain.stats.riskLowDescription')
                      : riskLevel === 'medium'
                        ? t('crossChain.stats.riskMediumDescription')
                        : t('crossChain.stats.riskHighDescription')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
                    }
                    className="px-3 py-1 text-base"
                  >
                    {riskLevel === 'low'
                      ? t('crossChain.stats.riskLow')
                      : riskLevel === 'medium'
                        ? t('crossChain.stats.riskMedium')
                        : t('crossChain.stats.riskHigh')}
                  </Badge>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {riskLevel === 'low'
                      ? t('crossChain.stats.riskLowDescription')
                      : riskLevel === 'medium'
                        ? t('crossChain.stats.riskMediumDescription')
                        : t('crossChain.stats.riskHighDescription')}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
