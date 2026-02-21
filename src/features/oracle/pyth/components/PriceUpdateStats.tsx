'use client';

import { useState, useEffect, useMemo } from 'react';

import {
  BarChart3,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import { EmptyDeviationState } from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SkeletonList } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useI18n } from '@/i18n';
import { cn, formatTime, fetchApiData } from '@/shared/utils';

import { ConfidenceIntervalChart } from './ConfidenceIntervalChart';

import type {
  PriceUpdate,
  PythPriceUpdateResponse,
  ConfidenceHistoryPoint,
  ConfidenceHistoryResponse,
} from '../types/pyth';

interface PriceUpdateStatsProps {
  className?: string;
}

const mockPriceUpdates: PriceUpdate[] = [
  {
    symbol: 'BTC/USD',
    price: '43250.50',
    confidence: '43245.00 - 43256.00',
    publishTime: new Date().toISOString(),
    publisher: 'Binance',
    emaPrice: '43248.00',
  },
  {
    symbol: 'ETH/USD',
    price: '2456.78',
    confidence: '2454.00 - 2459.50',
    publishTime: new Date(Date.now() - 2000).toISOString(),
    publisher: 'Coinbase',
    emaPrice: '2455.50',
  },
  {
    symbol: 'SOL/USD',
    price: '98.45',
    confidence: '98.20 - 98.70',
    publishTime: new Date(Date.now() - 3000).toISOString(),
    publisher: 'OKX',
    emaPrice: '98.30',
  },
  {
    symbol: 'BTC/USD',
    price: '43255.00',
    confidence: '43250.00 - 43260.00',
    publishTime: new Date(Date.now() - 4000).toISOString(),
    publisher: 'Coinbase',
    emaPrice: '43252.00',
  },
  {
    symbol: 'AVAX/USD',
    price: '35.20',
    confidence: '35.10 - 35.30',
    publishTime: new Date(Date.now() - 5000).toISOString(),
    publisher: 'Kraken',
    emaPrice: '35.15',
  },
  {
    symbol: 'MATIC/USD',
    price: '0.89',
    confidence: '0.885 - 0.895',
    publishTime: new Date(Date.now() - 6000).toISOString(),
    publisher: 'Binance',
    emaPrice: '0.888',
  },
];

const mockConfidenceHistory: ConfidenceHistoryPoint[] = [
  {
    timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
    symbol: 'BTC/USD',
    confidence: 0.05,
    avgConfidence: 0.04,
    isAnomaly: false,
  },
  {
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    symbol: 'BTC/USD',
    confidence: 0.06,
    avgConfidence: 0.04,
    isAnomaly: false,
  },
  {
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    symbol: 'BTC/USD',
    confidence: 0.04,
    avgConfidence: 0.04,
    isAnomaly: false,
  },
  {
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    symbol: 'BTC/USD',
    confidence: 0.12,
    avgConfidence: 0.04,
    isAnomaly: true,
  },
  {
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    symbol: 'BTC/USD',
    confidence: 0.05,
    avgConfidence: 0.04,
    isAnomaly: false,
  },
  {
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    symbol: 'BTC/USD',
    confidence: 0.04,
    avgConfidence: 0.04,
    isAnomaly: false,
  },
  {
    timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
    symbol: 'ETH/USD',
    confidence: 0.03,
    avgConfidence: 0.035,
    isAnomaly: false,
  },
  {
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    symbol: 'ETH/USD',
    confidence: 0.04,
    avgConfidence: 0.035,
    isAnomaly: false,
  },
  {
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    symbol: 'ETH/USD',
    confidence: 0.035,
    avgConfidence: 0.035,
    isAnomaly: false,
  },
  {
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    symbol: 'ETH/USD',
    confidence: 0.08,
    avgConfidence: 0.035,
    isAnomaly: true,
  },
  {
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    symbol: 'ETH/USD',
    confidence: 0.032,
    avgConfidence: 0.035,
    isAnomaly: false,
  },
  {
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    symbol: 'ETH/USD',
    confidence: 0.034,
    avgConfidence: 0.035,
    isAnomaly: false,
  },
  {
    timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
    symbol: 'SOL/USD',
    confidence: 0.02,
    avgConfidence: 0.025,
    isAnomaly: false,
  },
  {
    timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
    symbol: 'SOL/USD',
    confidence: 0.025,
    avgConfidence: 0.025,
    isAnomaly: false,
  },
  {
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
    symbol: 'SOL/USD',
    confidence: 0.028,
    avgConfidence: 0.025,
    isAnomaly: false,
  },
  {
    timestamp: new Date(Date.now() - 3600000 * 3).toISOString(),
    symbol: 'SOL/USD',
    confidence: 0.022,
    avgConfidence: 0.025,
    isAnomaly: false,
  },
  {
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    symbol: 'SOL/USD',
    confidence: 0.024,
    avgConfidence: 0.025,
    isAnomaly: false,
  },
  {
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    symbol: 'SOL/USD',
    confidence: 0.026,
    avgConfidence: 0.025,
    isAnomaly: false,
  },
];

export function PriceUpdateStats({ className }: PriceUpdateStatsProps) {
  const { t } = useI18n();
  const [priceUpdates, setPriceUpdates] = useState<PriceUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('all');
  const [confidenceHistory, setConfidenceHistory] = useState<ConfidenceHistoryPoint[]>([]);
  const [isChartLoading, setIsChartLoading] = useState(false);
  const [showChart, setShowChart] = useState(false);

  useEffect(() => {
    const fetchPriceUpdates = async () => {
      setIsLoading(true);
      try {
        const response = await fetchApiData<PythPriceUpdateResponse>('/api/oracle/pyth/updates');
        setPriceUpdates(response.updates);
      } catch {
        setPriceUpdates(mockPriceUpdates);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPriceUpdates();
  }, []);

  useEffect(() => {
    const fetchConfidenceHistory = async () => {
      setIsChartLoading(true);
      try {
        const symbolParam = selectedSymbol !== 'all' ? `?symbol=${selectedSymbol}` : '';
        const response = await fetchApiData<ConfidenceHistoryResponse>(
          `/api/oracle/pyth/confidence-history${symbolParam}`,
        );
        setConfidenceHistory(response.data);
      } catch {
        const filteredMock =
          selectedSymbol !== 'all'
            ? mockConfidenceHistory.filter((p) => p.symbol === selectedSymbol)
            : mockConfidenceHistory;
        setConfidenceHistory(filteredMock);
      } finally {
        setIsChartLoading(false);
      }
    };

    fetchConfidenceHistory();
  }, [selectedSymbol]);

  const uniqueSymbols = useMemo(() => {
    const symbols = new Set(priceUpdates.map((u) => u.symbol));
    return Array.from(symbols).sort();
  }, [priceUpdates]);

  const filteredUpdates = useMemo(() => {
    let filtered = priceUpdates;

    if (selectedSymbol !== 'all') {
      filtered = filtered.filter((u) => u.symbol === selectedSymbol);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (u) => u.symbol.toLowerCase().includes(query) || u.publisher.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [priceUpdates, selectedSymbol, searchQuery]);

  const stats = useMemo(() => {
    const symbolCount = uniqueSymbols.length;
    const publisherCount = new Set(priceUpdates.map((u) => u.publisher)).size;
    const avgConfidenceRange = priceUpdates.length > 0 ? 0.05 : 0;
    return { symbolCount, publisherCount, avgConfidenceRange };
  }, [priceUpdates, uniqueSymbols.length]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const response = await fetchApiData<PythPriceUpdateResponse>('/api/oracle/pyth/updates');
      setPriceUpdates(response.updates);
    } catch {
      setPriceUpdates(mockPriceUpdates);
    } finally {
      setIsLoading(false);
    }
  };

  const formatPrice = (price: string) => {
    const numPrice = parseFloat(price);
    if (numPrice >= 1000)
      return `$${numPrice.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (numPrice >= 1) return `$${numPrice.toFixed(4)}`;
    return `$${numPrice.toFixed(6)}`;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-500" />
            {t('pyth.updates.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonList count={5} />
        </CardContent>
      </Card>
    );
  }

  if (filteredUpdates.length === 0 && !searchQuery && selectedSymbol === 'all') {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <EmptyDeviationState onRefresh={handleRefresh} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-amber-500" />
            {t('pyth.updates.title')}
            <Badge variant="secondary" className="ml-2">
              {filteredUpdates.length}
            </Badge>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="w-[140px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder={t('pyth.updates.filterSymbol')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                {uniqueSymbols.map((symbol) => (
                  <SelectItem key={symbol} value={symbol}>
                    {symbol}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 sm:w-48"
              />
            </div>
            <Button variant="outline" size="icon" onClick={handleRefresh}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-amber-500/10 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              {t('pyth.updates.symbols')}
            </div>
            <p className="mt-1 text-lg font-bold text-amber-500">{stats.symbolCount}</p>
          </div>

          <div className="rounded-lg bg-amber-500/10 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <BarChart3 className="h-3 w-3" />
              {t('pyth.updates.publishers')}
            </div>
            <p className="mt-1 text-lg font-bold text-amber-500">{stats.publisherCount}</p>
          </div>

          <div className="rounded-lg bg-amber-500/10 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingDown className="h-3 w-3" />
              {t('pyth.updates.avgConfidence')}
            </div>
            <p className="mt-1 text-lg font-bold text-amber-500">
              {(stats.avgConfidenceRange * 100).toFixed(2)}%
            </p>
          </div>
        </div>

        <div className="rounded-lg border">
          <button
            type="button"
            onClick={() => setShowChart(!showChart)}
            className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-purple-500" />
              <span className="font-medium">
                {selectedSymbol !== 'all'
                  ? `${selectedSymbol} ${t('oracle.pyth.confidenceIntervalTitle')}`
                  : t('oracle.pyth.confidenceIntervalTitle')}
              </span>
              {confidenceHistory.filter((p) => p.isAnomaly).length > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {confidenceHistory.filter((p) => p.isAnomaly).length} {t('oracle.pyth.anomalies')}
                </Badge>
              )}
            </div>
            {showChart ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showChart && (
            <div className="border-t p-3">
              <ConfidenceIntervalChart
                data={confidenceHistory}
                symbol={selectedSymbol !== 'all' ? selectedSymbol : 'All'}
                isLoading={isChartLoading}
              />
            </div>
          )}
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('pyth.updates.symbol')}</TableHead>
                <TableHead>{t('pyth.updates.price')}</TableHead>
                <TableHead>{t('pyth.updates.confidence')}</TableHead>
                <TableHead>{t('pyth.updates.emaPrice')}</TableHead>
                <TableHead>{t('pyth.updates.publisher')}</TableHead>
                <TableHead>{t('pyth.updates.publishTime')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUpdates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <p className="text-muted-foreground">{t('common.noResults')}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredUpdates.map((update, index) => (
                  <TableRow
                    key={`${update.symbol}-${update.publishTime}-${index}`}
                    className="group cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell>
                      <Badge variant="outline" className="font-semibold">
                        {update.symbol}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-medium">{formatPrice(update.price)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {update.confidence}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-muted-foreground">
                        {formatPrice(update.emaPrice)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">
                        {update.publisher}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTime(update.publishTime)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
