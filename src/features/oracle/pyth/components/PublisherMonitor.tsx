'use client';

import { useState, useEffect, useMemo } from 'react';

import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Search,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';

import { EmptyDeviationState } from '@/components/common/EmptyState';
import { Badge, StatusBadge } from '@/components/ui/badge';
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

import { PublisherHistoryChart } from './PublisherHistoryChart';

import type {
  Publisher,
  PublisherHistoryPoint,
  PublisherHistoryResponse,
  PythPublisherResponse,
} from '../types/pyth';

interface PublisherMonitorProps {
  className?: string;
}

const mockPublishers: Publisher[] = [
  {
    name: 'Binance',
    trustScore: 98,
    publishFrequency: 2.5,
    supportedSymbols: ['BTC/USD', 'ETH/USD', 'BNB/USD', 'SOL/USD'],
    status: 'active',
    lastPublish: new Date().toISOString(),
  },
  {
    name: 'OKX',
    trustScore: 95,
    publishFrequency: 3.0,
    supportedSymbols: ['BTC/USD', 'ETH/USD', 'OKB/USD'],
    status: 'active',
    lastPublish: new Date(Date.now() - 5000).toISOString(),
  },
  {
    name: 'Coinbase',
    trustScore: 97,
    publishFrequency: 2.0,
    supportedSymbols: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'MATIC/USD'],
    status: 'active',
    lastPublish: new Date(Date.now() - 3000).toISOString(),
  },
  {
    name: 'Kraken',
    trustScore: 92,
    publishFrequency: 4.0,
    supportedSymbols: ['BTC/USD', 'ETH/USD', 'DOT/USD'],
    status: 'active',
    lastPublish: new Date(Date.now() - 8000).toISOString(),
  },
  {
    name: 'Bybit',
    trustScore: 88,
    publishFrequency: 3.5,
    supportedSymbols: ['BTC/USD', 'ETH/USD'],
    status: 'inactive',
    lastPublish: new Date(Date.now() - 3600000).toISOString(),
  },
];

const mockPublisherHistory: PublisherHistoryPoint[] = [
  {
    timestamp: new Date(Date.now() - 86400000 * 6).toISOString(),
    publisherName: 'Binance',
    trustScore: 96,
    avgTrustScore: 95,
    isAnomaly: false,
  },
  {
    timestamp: new Date(Date.now() - 86400000 * 5).toISOString(),
    publisherName: 'Binance',
    trustScore: 97,
    avgTrustScore: 95,
    isAnomaly: false,
  },
  {
    timestamp: new Date(Date.now() - 86400000 * 4).toISOString(),
    publisherName: 'Binance',
    trustScore: 94,
    avgTrustScore: 95,
    isAnomaly: true,
  },
  {
    timestamp: new Date(Date.now() - 86400000 * 3).toISOString(),
    publisherName: 'Binance',
    trustScore: 98,
    avgTrustScore: 96,
    isAnomaly: false,
  },
  {
    timestamp: new Date(Date.now() - 86400000 * 2).toISOString(),
    publisherName: 'Binance',
    trustScore: 97,
    avgTrustScore: 96,
    isAnomaly: false,
  },
  {
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    publisherName: 'Binance',
    trustScore: 98,
    avgTrustScore: 96,
    isAnomaly: false,
  },
  {
    timestamp: new Date().toISOString(),
    publisherName: 'Binance',
    trustScore: 98,
    avgTrustScore: 96,
    isAnomaly: false,
  },
];

export function PublisherMonitor({ className }: PublisherMonitorProps) {
  const { t } = useI18n();
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showChart, setShowChart] = useState(false);
  const [selectedPublisher, setSelectedPublisher] = useState<string>('');
  const [publisherHistory, setPublisherHistory] = useState<PublisherHistoryPoint[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);

  useEffect(() => {
    const fetchPublishers = async () => {
      setIsLoading(true);
      try {
        const response = await fetchApiData<PythPublisherResponse>('/api/oracle/pyth/publishers');
        setPublishers(response.publishers);
        if (response.publishers.length > 0 && response.publishers[0]) {
          setSelectedPublisher(response.publishers[0].name);
        }
      } catch {
        setPublishers(mockPublishers);
        if (mockPublishers[0]) {
          setSelectedPublisher(mockPublishers[0].name);
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublishers();
  }, []);

  useEffect(() => {
    if (!selectedPublisher) return;

    const fetchPublisherHistory = async () => {
      setIsHistoryLoading(true);
      try {
        const response = await fetchApiData<PublisherHistoryResponse>(
          `/api/oracle/pyth/publisher-history?publisher=${encodeURIComponent(selectedPublisher)}`,
        );
        setPublisherHistory(response.data);
      } catch {
        setPublisherHistory(mockPublisherHistory);
      } finally {
        setIsHistoryLoading(false);
      }
    };

    fetchPublisherHistory();
  }, [selectedPublisher]);

  const publisherAnomalyMap = useMemo(() => {
    const map = new Map<string, boolean>();
    publisherHistory.forEach((point) => {
      if (point.isAnomaly) {
        map.set(point.publisherName, true);
      }
    });
    return map;
  }, [publisherHistory]);

  const filteredPublishers = useMemo(() => {
    if (!searchQuery) return publishers;
    const query = searchQuery.toLowerCase();
    return publishers.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.supportedSymbols.some((s) => s.toLowerCase().includes(query)),
    );
  }, [publishers, searchQuery]);

  const getTrustScoreColor = (score: number) => {
    if (score >= 95) return 'bg-amber-500';
    if (score >= 85) return 'bg-amber-400';
    if (score >= 70) return 'bg-amber-300';
    return 'bg-gray-400';
  };

  const getTrustScoreTextColor = (score: number) => {
    if (score >= 95) return 'text-amber-500';
    if (score >= 85) return 'text-amber-400';
    if (score >= 70) return 'text-amber-300';
    return 'text-gray-400';
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const response = await fetchApiData<PythPublisherResponse>('/api/oracle/pyth/publishers');
      setPublishers(response.publishers);
    } catch {
      setPublishers(mockPublishers);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const activeCount = publishers.filter((p) => p.status === 'active').length;
    const avgTrustScore =
      publishers.length > 0
        ? publishers.reduce((sum, p) => sum + p.trustScore, 0) / publishers.length
        : 0;
    const totalSymbols = new Set(publishers.flatMap((p) => p.supportedSymbols)).size;
    return { activeCount, avgTrustScore, totalSymbols };
  }, [publishers]);

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-500" />
            {t('pyth.publisher.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonList count={5} />
        </CardContent>
      </Card>
    );
  }

  if (filteredPublishers.length === 0 && !searchQuery) {
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
            <Users className="h-5 w-5 text-amber-500" />
            {t('pyth.publisher.title')}
            <Badge variant="secondary" className="ml-2">
              {filteredPublishers.length}
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
              <Activity className="h-3 w-3" />
              {t('pyth.publisher.activePublishers')}
            </div>
            <p className="mt-1 text-lg font-bold text-amber-500">{stats.activeCount}</p>
          </div>

          <div className="rounded-lg bg-amber-500/10 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              {t('pyth.publisher.avgTrustScore')}
            </div>
            <p
              className={cn('mt-1 text-lg font-bold', getTrustScoreTextColor(stats.avgTrustScore))}
            >
              {stats.avgTrustScore.toFixed(1)}%
            </p>
          </div>

          <div className="rounded-lg bg-amber-500/10 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              {t('pyth.publisher.totalSymbols')}
            </div>
            <p className="mt-1 text-lg font-bold text-amber-500">{stats.totalSymbols}</p>
          </div>
        </div>

        <div className="rounded-lg border">
          <button
            type="button"
            onClick={() => setShowChart(!showChart)}
            className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50"
          >
            <span className="text-sm font-medium">{t('pyth.publisher.historyChart')}</span>
            {showChart ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showChart && (
            <div className="border-t p-4">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t('pyth.publisher.selectPublisher')}:
                </span>
                <Select value={selectedPublisher} onValueChange={setSelectedPublisher}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder={t('pyth.publisher.selectPublisher')} />
                  </SelectTrigger>
                  <SelectContent>
                    {publishers.map((publisher) => (
                      <SelectItem key={publisher.name} value={publisher.name}>
                        {publisher.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <PublisherHistoryChart
                data={publisherHistory}
                publisherName={selectedPublisher}
                isLoading={isHistoryLoading}
              />
            </div>
          )}
        </div>

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('pyth.publisher.name')}</TableHead>
                <TableHead>{t('pyth.publisher.trustScore')}</TableHead>
                <TableHead>{t('pyth.publisher.frequency')}</TableHead>
                <TableHead>{t('pyth.publisher.symbols')}</TableHead>
                <TableHead>{t('pyth.publisher.status')}</TableHead>
                <TableHead>{t('pyth.publisher.lastPublish')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPublishers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    <p className="text-muted-foreground">{t('common.noResults')}</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredPublishers.map((publisher) => (
                  <TableRow key={publisher.name} className="group cursor-pointer hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{publisher.name}</span>
                        {publisherAnomalyMap.get(publisher.name) && (
                          <AlertTriangle className="h-4 w-4 text-amber-500" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="relative h-2 w-20 overflow-hidden rounded-full bg-muted">
                          <span
                            className={cn(
                              'absolute inset-y-0 left-0 rounded-full transition-all',
                              getTrustScoreColor(publisher.trustScore),
                            )}
                            style={{ width: `${publisher.trustScore}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            'text-sm font-medium',
                            getTrustScoreTextColor(publisher.trustScore),
                          )}
                        >
                          {publisher.trustScore}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm">
                        {publisher.publishFrequency.toFixed(1)}s
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {publisher.supportedSymbols.slice(0, 3).map((symbol) => (
                          <Badge key={symbol} variant="outline" className="text-xs">
                            {symbol}
                          </Badge>
                        ))}
                        {publisher.supportedSymbols.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{publisher.supportedSymbols.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={publisher.status === 'active' ? 'active' : 'inactive'}
                        text={
                          publisher.status === 'active' ? t('common.active') : t('common.inactive')
                        }
                        size="sm"
                      />
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {formatTime(publisher.lastPublish)}
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
