'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import Link from 'next/link';

import {
  AlertTriangle,
  RefreshCw,
  Search,
  DollarSign,
  Activity,
  Filter,
  ExternalLink,
} from 'lucide-react';

import type { SortState } from '@/components/common/SortableTableHeader';
import { SortableTableHeader } from '@/components/common/SortableTableHeader';
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
import { formatTime } from '@/shared/utils';
import { fetchApiData } from '@/shared/utils/api';

import type { ChainlinkFeed } from '../types/chainlink';
import type { Route } from 'next';

interface FeedAggregationProps {
  className?: string;
}

type StatusFilter = 'all' | 'active' | 'inactive';

export function FeedAggregation({ className }: FeedAggregationProps) {
  const { t } = useI18n();
  const [feeds, setFeeds] = useState<ChainlinkFeed[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const handleSort = useCallback((key: string) => {
    setSortState((prev) => {
      if (prev?.key === key) {
        return prev.direction === 'asc' ? { key, direction: 'desc' } : null;
      }
      return { key, direction: 'asc' };
    });
  }, []);

  const isFeedActive = useCallback((feed: ChainlinkFeed): boolean => {
    const lastUpdateTime = new Date(feed.lastUpdate).getTime();
    const heartbeatMs = feed.heartbeat * 1000;
    const thresholdMs = heartbeatMs * 2;
    return Date.now() - lastUpdateTime < thresholdMs;
  }, []);

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

  const filteredAndSortedFeeds = useMemo(() => {
    let result = feeds;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (feed) =>
          feed.symbol.toLowerCase().includes(query) ||
          feed.pair.toLowerCase().includes(query) ||
          feed.aggregatorAddress.toLowerCase().includes(query),
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((feed) => {
        const isActive = isFeedActive(feed);
        return statusFilter === 'active' ? isActive : !isActive;
      });
    }

    if (sortState) {
      const { key, direction } = sortState;
      result = [...result].sort((a, b) => {
        let aVal: number | string = 0;
        let bVal: number | string = 0;

        switch (key) {
          case 'price':
            aVal = parseFloat(a.latestPrice) / Math.pow(10, 18 - a.decimals);
            bVal = parseFloat(b.latestPrice) / Math.pow(10, 18 - b.decimals);
            break;
          case 'heartbeat':
            aVal = a.heartbeat;
            bVal = b.heartbeat;
            break;
          case 'deviation':
            aVal = parseFloat(a.deviationThreshold);
            bVal = parseFloat(b.deviationThreshold);
            break;
          case 'lastUpdate':
            aVal = new Date(a.lastUpdate).getTime();
            bVal = new Date(b.lastUpdate).getTime();
            break;
          case 'pair':
            aVal = a.pair;
            bVal = b.pair;
            break;
          default:
            return 0;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return direction === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        return direction === 'asc'
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      });
    }

    return result;
  }, [feeds, searchQuery, sortState, statusFilter, isFeedActive]);

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
              {filteredAndSortedFeeds.length}
            </Badge>
          </CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger className="w-[130px]">
                <Filter className="mr-2 h-4 w-4" />
                <SelectValue placeholder={t('common.filter')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="active">{t('common.active')}</SelectItem>
                <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
              </SelectContent>
            </Select>
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
                <SortableTableHeader sortKey="pair" currentSort={sortState} onSort={handleSort}>
                  {t('chainlink.feeds.pair')}
                </SortableTableHeader>
                <SortableTableHeader
                  sortKey="price"
                  currentSort={sortState}
                  onSort={handleSort}
                  className="text-right"
                >
                  {t('chainlink.feeds.price')}
                </SortableTableHeader>
                <SortableTableHeader
                  sortKey="heartbeat"
                  currentSort={sortState}
                  onSort={handleSort}
                  className="text-center"
                >
                  <div className="flex items-center justify-center gap-1">
                    <Activity className="h-3 w-3" />
                    {t('chainlink.feeds.heartbeat')}
                  </div>
                </SortableTableHeader>
                <SortableTableHeader
                  sortKey="deviation"
                  currentSort={sortState}
                  onSort={handleSort}
                  className="text-center"
                >
                  {t('chainlink.feeds.deviation')}
                </SortableTableHeader>
                <TableHead>{t('chainlink.feeds.aggregator')}</TableHead>
                <SortableTableHeader
                  sortKey="lastUpdate"
                  currentSort={sortState}
                  onSort={handleSort}
                >
                  {t('chainlink.feeds.lastUpdate')}
                </SortableTableHeader>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedFeeds.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <p className="text-muted-foreground">{t('common.noResults')}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredAndSortedFeeds.map((feed) => {
                  const feedHref = `/oracle/chainlink/feed/${feed.aggregatorAddress}` as Route;
                  return (
                    <TableRow
                      key={feed.aggregatorAddress}
                      className="group cursor-pointer hover:bg-muted/50"
                    >
                      <TableCell>
                        <Link href={feedHref} className="flex items-center gap-2">
                          <span className="font-semibold">{feed.pair}</span>
                          <Badge variant="outline" className="text-xs">
                            {feed.symbol}
                          </Badge>
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Link href={feedHref}>
                          <span className="font-mono font-medium">
                            {formatPrice(feed.latestPrice, feed.decimals)}
                          </span>
                        </Link>
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
                      <TableCell>
                        <Link href={feedHref}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
