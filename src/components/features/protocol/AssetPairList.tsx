'use client';

import { useState, useMemo } from 'react';

import {
  ArrowDownRight,
  ArrowUpRight,
  Clock,
  Filter,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

export interface AssetPair {
  id: string;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  price: number;
  deviation: number;
  deviationPercent: number;
  lastUpdate: Date;
  status: 'active' | 'stale' | 'error';
  volume24h?: number;
  trend?: 'up' | 'down' | 'neutral';
  trendPercent?: number;
}

interface AssetPairListProps {
  pairs: AssetPair[];
  loading?: boolean;
  className?: string;
  onPairClick?: (pair: AssetPair) => void;
}

export function AssetPairList({ pairs, loading, className, onPairClick }: AssetPairListProps) {
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'stale' | 'error'>('all');

  const filteredPairs = useMemo(() => {
    return pairs.filter((pair) => {
      const matchesSearch =
        pair.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pair.baseAsset.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || pair.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [pairs, searchQuery, statusFilter]);

  const getStatusConfig = (status: AssetPair['status']) => {
    switch (status) {
      case 'active':
        return {
          color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          label: t('protocol:pairStatus.active'),
        };
      case 'stale':
        return {
          color: 'bg-amber-50 text-amber-700 border-amber-200',
          label: t('protocol:pairStatus.stale'),
        };
      case 'error':
        return {
          color: 'bg-rose-50 text-rose-700 border-rose-200',
          label: t('protocol:pairStatus.error'),
        };
    }
  };

  const getDeviationColor = (deviation: number) => {
    if (Math.abs(deviation) < 0.5) return 'text-emerald-600';
    if (Math.abs(deviation) < 2) return 'text-amber-600';
    return 'text-rose-600';
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ${t('common:ago')}`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${t('common:ago')}`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${t('common:ago')}`;
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            {t('protocol:assetPairs')}
            <Badge variant="secondary">{filteredPairs.length}</Badge>
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="text-muted-foreground absolute left-2.5 top-2.5 h-4 w-4" />
              <Input
                placeholder={t('protocol:searchPairs')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-[200px] pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setStatusFilter(statusFilter === 'all' ? 'active' : 'all')}
              className={cn(statusFilter !== 'all' && 'bg-primary/10')}
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="max-h-[400px] overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50 sticky top-0">
              <TableRow>
                <TableHead>{t('protocol:pair')}</TableHead>
                <TableHead className="text-right">{t('protocol:price')}</TableHead>
                <TableHead className="text-right">{t('protocol:deviation')}</TableHead>
                <TableHead className="text-right">{t('protocol:trend')}</TableHead>
                <TableHead className="text-right">{t('protocol:lastUpdate')}</TableHead>
                <TableHead className="text-center">{t('protocol:status')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPairs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-muted-foreground py-8 text-center">
                    {t('protocol:noPairsFound')}
                  </TableCell>
                </TableRow>
              ) : (
                filteredPairs.map((pair) => {
                  const statusConfig = getStatusConfig(pair.status);
                  const TrendIcon =
                    pair.trend === 'up'
                      ? TrendingUp
                      : pair.trend === 'down'
                        ? TrendingDown
                        : ArrowUpRight;

                  return (
                    <TableRow
                      key={pair.id}
                      className="cursor-pointer transition-colors hover:bg-muted/50"
                      onClick={() => onPairClick?.(pair)}
                    >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span className="bg-primary/10 rounded px-2 py-0.5 text-sm">
                            {pair.symbol}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        ${pair.price.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={cn(
                            'flex items-center justify-end gap-1 font-mono',
                            getDeviationColor(pair.deviationPercent)
                          )}
                        >
                          {pair.deviationPercent > 0 ? (
                            <ArrowUpRight className="h-3 w-3" />
                          ) : (
                            <ArrowDownRight className="h-3 w-3" />
                          )}
                          {Math.abs(pair.deviationPercent).toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {pair.trend && pair.trendPercent && (
                          <span
                            className={cn(
                              'flex items-center justify-end gap-1 text-sm',
                              pair.trend === 'up'
                                ? 'text-emerald-600'
                                : pair.trend === 'down'
                                  ? 'text-rose-600'
                                  : 'text-muted-foreground'
                            )}
                          >
                            <TrendIcon className="h-3 w-3" />
                            {Math.abs(pair.trendPercent).toFixed(2)}%
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-right text-sm">
                        <span className="flex items-center justify-end gap-1">
                          <Clock className="h-3 w-3" />
                          {formatTimeAgo(pair.lastUpdate)}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className={cn('text-xs', statusConfig.color)}>
                          {statusConfig.label}
                        </Badge>
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
