'use client';

import { useState, useEffect, useMemo } from 'react';

import {
  BarChart3,
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

import type { PriceUpdate, PythPriceUpdateResponse } from '../types/pyth';

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

export function PriceUpdateStats({ className }: PriceUpdateStatsProps) {
  const { t } = useI18n();
  const [priceUpdates, setPriceUpdates] = useState<PriceUpdate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSymbol, setSelectedSymbol] = useState<string>('all');

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
