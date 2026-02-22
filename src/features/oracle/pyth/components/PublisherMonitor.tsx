'use client';

import { useState, useEffect, useMemo } from 'react';

import {
  Activity,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  PieChart as PieChartIcon,
  RefreshCw,
  Search,
  Shield,
  TrendingUp,
  Users,
} from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

import { ContentSection, ContentGrid } from '@/components/common';
import { EmptyDeviationState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui';
import { Badge, StatusBadge } from '@/components/ui';
import { Input } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { SkeletonList } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
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
    priceSourceDistribution: [
      { name: 'Spot Market', value: 45, color: '#f97316' },
      { name: 'Futures', value: 30, color: '#22c55e' },
      { name: 'Options', value: 15, color: '#3b82f6' },
      { name: 'OTC', value: 10, color: '#a855f7' },
    ],
    activeTimeStats: {
      onlinePercentage: 99.5,
      totalHours: 730,
      activeHours: 726,
      inactiveHours: 4,
    },
  },
  {
    name: 'OKX',
    trustScore: 95,
    publishFrequency: 3.0,
    supportedSymbols: ['BTC/USD', 'ETH/USD', 'OKB/USD'],
    status: 'active',
    lastPublish: new Date(Date.now() - 5000).toISOString(),
    priceSourceDistribution: [
      { name: 'Spot Market', value: 40, color: '#f97316' },
      { name: 'Futures', value: 35, color: '#22c55e' },
      { name: 'Options', value: 20, color: '#3b82f6' },
      { name: 'OTC', value: 5, color: '#a855f7' },
    ],
    activeTimeStats: {
      onlinePercentage: 98.2,
      totalHours: 730,
      activeHours: 717,
      inactiveHours: 13,
    },
  },
  {
    name: 'Coinbase',
    trustScore: 97,
    publishFrequency: 2.0,
    supportedSymbols: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'AVAX/USD', 'MATIC/USD'],
    status: 'active',
    lastPublish: new Date(Date.now() - 3000).toISOString(),
    priceSourceDistribution: [
      { name: 'Spot Market', value: 60, color: '#f97316' },
      { name: 'Futures', value: 25, color: '#22c55e' },
      { name: 'Options', value: 10, color: '#3b82f6' },
      { name: 'OTC', value: 5, color: '#a855f7' },
    ],
    activeTimeStats: {
      onlinePercentage: 99.8,
      totalHours: 730,
      activeHours: 729,
      inactiveHours: 1,
    },
  },
  {
    name: 'Kraken',
    trustScore: 92,
    publishFrequency: 4.0,
    supportedSymbols: ['BTC/USD', 'ETH/USD', 'DOT/USD'],
    status: 'active',
    lastPublish: new Date(Date.now() - 8000).toISOString(),
    priceSourceDistribution: [
      { name: 'Spot Market', value: 55, color: '#f97316' },
      { name: 'Futures', value: 30, color: '#22c55e' },
      { name: 'Options', value: 10, color: '#3b82f6' },
      { name: 'OTC', value: 5, color: '#a855f7' },
    ],
    activeTimeStats: {
      onlinePercentage: 97.5,
      totalHours: 730,
      activeHours: 712,
      inactiveHours: 18,
    },
  },
  {
    name: 'Bybit',
    trustScore: 88,
    publishFrequency: 3.5,
    supportedSymbols: ['BTC/USD', 'ETH/USD'],
    status: 'inactive',
    lastPublish: new Date(Date.now() - 3600000).toISOString(),
    priceSourceDistribution: [
      { name: 'Spot Market', value: 35, color: '#f97316' },
      { name: 'Futures', value: 40, color: '#22c55e' },
      { name: 'Options', value: 15, color: '#3b82f6' },
      { name: 'OTC', value: 10, color: '#a855f7' },
    ],
    activeTimeStats: {
      onlinePercentage: 85.0,
      totalHours: 730,
      activeHours: 620,
      inactiveHours: 110,
    },
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
  const [showContributionAnalysis, setShowContributionAnalysis] = useState(false);
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

  const currentPublisher = useMemo(() => {
    return publishers.find((p) => p.name === selectedPublisher);
  }, [publishers, selectedPublisher]);

  if (isLoading) {
    return (
      <ContentSection className={className}>
        <SkeletonList count={5} />
      </ContentSection>
    );
  }

  if (filteredPublishers.length === 0 && !searchQuery) {
    return (
      <ContentSection className={className}>
        <EmptyDeviationState onRefresh={handleRefresh} />
      </ContentSection>
    );
  }

  return (
    <ContentSection
      className={className}
      title={
        <span className="flex items-center gap-2">
          <Users className="h-5 w-5 text-amber-500" />
          {t('pyth.publisher.title')}
          <Badge variant="secondary" className="ml-2">
            {filteredPublishers.length}
          </Badge>
          <Badge variant="outline" className="ml-1 border-amber-500 text-xs text-amber-500">
            实验性
          </Badge>
        </span>
      }
      action={
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
      }
    >
      <div className="space-y-4">
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-400">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            信任评分和价格源分布为实验性功能，数据基于公开信息估算，仅供参考。Publisher
            内部数据源不公开，无法完全验证价格来源的真实性。
          </span>
        </div>
        <ContentGrid columns={3}>
          <div className="rounded-lg border border-border/30 bg-amber-500/10 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" />
              {t('pyth.publisher.activePublishers')}
            </div>
            <p className="mt-1 text-lg font-bold text-amber-500">{stats.activeCount}</p>
          </div>

          <div className="rounded-lg border border-border/30 bg-amber-500/10 p-3">
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

          <div className="rounded-lg border border-border/30 bg-amber-500/10 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              {t('pyth.publisher.totalSymbols')}
            </div>
            <p className="mt-1 text-lg font-bold text-amber-500">{stats.totalSymbols}</p>
          </div>
        </ContentGrid>

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
          <button
            type="button"
            onClick={() => setShowContributionAnalysis(!showContributionAnalysis)}
            className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <PieChartIcon className="h-4 w-4" />
              贡献度分析
            </span>
            {showContributionAnalysis ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
          {showContributionAnalysis && (
            <div className="space-y-6 border-t p-4">
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm text-muted-foreground">选择 Publisher:</span>
                <Select value={selectedPublisher} onValueChange={setSelectedPublisher}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="选择 Publisher" />
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

              {currentPublisher && (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <h4 className="flex items-center gap-2 text-sm font-medium">
                      <PieChartIcon className="h-4 w-4 text-amber-500" />
                      价格源分布
                    </h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={
                              currentPublisher.priceSourceDistribution as {
                                name: string;
                                value: number;
                                color: string;
                              }[]
                            }
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) =>
                              `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {currentPublisher.priceSourceDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="flex items-center gap-2 text-sm font-medium">
                      <Clock className="h-4 w-4 text-amber-500" />
                      活跃时间统计
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">在线时长占比</span>
                          <span className="text-sm font-bold text-amber-500">
                            {currentPublisher.activeTimeStats.onlinePercentage.toFixed(1)}%
                          </span>
                        </div>
                        <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted">
                          <span
                            className="absolute inset-y-0 left-0 rounded-full bg-amber-500 transition-all"
                            style={{
                              width: `${currentPublisher.activeTimeStats.onlinePercentage}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 pt-2">
                        <div className="rounded-lg bg-amber-500/10 p-3 text-center">
                          <div className="text-xs text-muted-foreground">总时长</div>
                          <div className="mt-1 text-lg font-bold text-amber-500">
                            {currentPublisher.activeTimeStats.totalHours}h
                          </div>
                        </div>
                        <div className="rounded-lg bg-green-500/10 p-3 text-center">
                          <div className="text-xs text-muted-foreground">活跃时长</div>
                          <div className="mt-1 text-lg font-bold text-green-500">
                            {currentPublisher.activeTimeStats.activeHours}h
                          </div>
                        </div>
                        <div className="rounded-lg bg-gray-500/10 p-3 text-center">
                          <div className="text-xs text-muted-foreground">离线时长</div>
                          <div className="mt-1 text-lg font-bold text-gray-500">
                            {currentPublisher.activeTimeStats.inactiveHours}h
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
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
      </div>
    </ContentSection>
  );
}
