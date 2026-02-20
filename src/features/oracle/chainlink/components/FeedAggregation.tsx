'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import { AlertTriangle, RefreshCw, Search, DollarSign, Activity } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { formatTime } from '@/shared/utils';
import { fetchApiData } from '@/shared/utils/api';

import type { ChainlinkFeed } from '../types';

interface FeedAggregationProps {
  className?: string;
}

export function FeedAggregation({ className }: FeedAggregationProps) {
  const { t } = useI18n();
  const [feeds, setFeeds] = useState<ChainlinkFeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchFeeds = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchApiData<ChainlinkFeed[]>('/api/oracle/chainlink/feeds');
      setFeeds(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch feeds');
      setFeeds([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  const filteredFeeds = useMemo(() => {
    if (!searchQuery) return feeds;
    const query = searchQuery.toLowerCase();
    return feeds.filter(
      (feed) =>
        feed.symbol.toLowerCase().includes(query) ||
        feed.pair.toLowerCase().includes(query) ||
        feed.aggregatorAddress.toLowerCase().includes(query),
    );
  }, [feeds, searchQuery]);

  const formatPrice = (price: string, decimals: number) => {
    const num = parseFloat(price);
    if (isNaN(num)) return price;
    const adjusted = num / Math.pow(10, 18 - decimals);
    if (adjusted >= 1000)
      return `$${adjusted.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (adjusted >= 1) return `$${adjusted.toFixed(4)}`;
    return `$${adjusted.toFixed(6)}`;
  };

  const formatHeartbeat = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const formatAddress = (address: string) => {
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            {t('chainlink.feeds.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonList count={5} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            {t('chainlink.feeds.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <div>
              <p className="font-medium text-foreground">{t('common.error')}</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchFeeds}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('common.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (feeds.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            {t('chainlink.feeds.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <DollarSign className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t('chainlink.feeds.noData')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-primary" />
            {t('chainlink.feeds.title')}
            <Badge variant="secondary" className="ml-2">
              {filteredFeeds.length}
            </Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t('common.search')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 sm:w-64"
              />
            </div>
            <Button variant="outline" size="icon" onClick={fetchFeeds}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('chainlink.feeds.pair')}</TableHead>
                <TableHead>{t('chainlink.feeds.price')}</TableHead>
                <TableHead className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Activity className="h-3 w-3" />
                    {t('chainlink.feeds.heartbeat')}
                  </div>
                </TableHead>
                <TableHead className="text-center">{t('chainlink.feeds.deviation')}</TableHead>
                <TableHead>{t('chainlink.feeds.aggregator')}</TableHead>
                <TableHead>{t('chainlink.feeds.lastUpdate')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredFeeds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <p className="text-muted-foreground">{t('common.noResults')}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredFeeds.map((feed) => (
                  <TableRow
                    key={feed.aggregatorAddress}
                    className="group cursor-pointer hover:bg-muted/50"
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{feed.pair}</span>
                        <Badge variant="outline" className="text-xs">
                          {feed.symbol}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-medium">
                        {formatPrice(feed.latestPrice, feed.decimals)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" size="sm">
                        {formatHeartbeat(feed.heartbeat)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" size="sm">
                        {feed.deviationThreshold}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">
                        {formatAddress(feed.aggregatorAddress)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatTime(feed.lastUpdate)}
                      </span>
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
