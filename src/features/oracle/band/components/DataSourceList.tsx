'use client';

import { useState, useEffect, useCallback } from 'react';

import {
  Database,
  Clock,
  Zap,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  BarChart3,
  List,
} from 'lucide-react';

import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SkeletonList } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

import { DataSourcePerformanceCard } from './DataSourcePerformanceCard';
import { DataSourcePerformanceComparison } from './DataSourcePerformanceComparison';

import type { DataSource } from '../types';

interface DataSourceListProps {
  sources?: DataSource[];
  loading?: boolean;
  chain?: string;
  symbol?: string;
  className?: string;
}

const CHAIN_DISPLAY_NAMES: Record<string, string> = {
  ethereum: 'Ethereum',
  cosmos: 'Cosmos Hub',
  osmosis: 'Osmosis',
  juno: 'Juno',
  stargaze: 'Stargaze',
  axelar: 'Axelar',
  injective: 'Injective',
  evmos: 'Evmos',
  crescent: 'Crescent',
  kujira: 'Kujira',
  band: 'BandChain',
};

const getReliabilityBadgeVariant = (score: number): 'success' | 'warning' | 'danger' => {
  if (score >= 99) return 'success';
  if (score >= 95) return 'warning';
  return 'danger';
};

export function DataSourceList({
  sources: externalSources,
  loading: externalLoading,
  chain,
  symbol,
  className,
}: DataSourceListProps) {
  const { t } = useI18n();
  const [internalDataSources, setInternalDataSources] = useState<DataSource[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const useExternalData = externalSources !== undefined;

  const fetchDataSources = useCallback(async () => {
    if (useExternalData) return;
    setInternalLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (chain) params.append('chain', chain);
      if (symbol) params.append('symbol', symbol);

      const response = await fetch(`/api/band/data-sources?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch data sources');
      }
      const data = await response.json();
      setInternalDataSources(data.dataSources ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setInternalDataSources([]);
    } finally {
      setInternalLoading(false);
    }
  }, [useExternalData, chain, symbol]);

  useEffect(() => {
    if (!useExternalData) {
      fetchDataSources();
    }
  }, [fetchDataSources, useExternalData]);

  const dataSources = useExternalData ? externalSources : internalDataSources;
  const isLoading = useExternalData ? (externalLoading ?? false) : internalLoading;

  const formatUpdateInterval = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h`;
  };

  const toggleRow = (sourceId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        next.delete(sourceId);
      } else {
        next.add(sourceId);
      }
      return next;
    });
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t('band.dataSource.title')}
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
            <Database className="h-5 w-5" />
            {t('band.dataSource.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <div>
              <p className="font-medium text-foreground">{t('common.error')}</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={fetchDataSources}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('common.retry')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (dataSources.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {t('band.dataSource.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <Database className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t('band.dataSource.noData')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const [viewMode, setViewMode] = useState<'list' | 'comparison'>('list');

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {t('band.dataSource.title')}
            </CardTitle>
            <CardDescription>
              {t('band.dataSource.description', { count: dataSources.length })}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'list' | 'comparison')}>
              <TabsList>
                <TabsTrigger value="list" className="flex items-center gap-1">
                  <List className="h-4 w-4" />
                  <span className="hidden sm:inline">列表</span>
                </TabsTrigger>
                <TabsTrigger value="comparison" className="flex items-center gap-1">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">对比</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button variant="ghost" size="sm" onClick={fetchDataSources}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {viewMode === 'list' ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-8" />
                  <TableHead>{t('band.dataSource.name')}</TableHead>
                  <TableHead>{t('band.dataSource.symbol')}</TableHead>
                  <TableHead>{t('band.dataSource.chain')}</TableHead>
                  <TableHead>{t('band.dataSource.type')}</TableHead>
                  <TableHead>{t('band.dataSource.status')}</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Zap className="h-3 w-3" />
                      {t('band.dataSource.interval')}
                    </div>
                  </TableHead>
                  <TableHead className="text-center">{t('band.dataSource.reliability')}</TableHead>
                  <TableHead>{t('band.dataSource.lastUpdate')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dataSources.map((source) => {
                  const isExpanded = expandedRows.has(source.sourceId);
                  return (
                    <>
                      <TableRow
                        key={source.sourceId}
                        className="group cursor-pointer hover:bg-muted/50"
                        onClick={() => toggleRow(source.sourceId)}
                      >
                        <TableCell className="w-8">
                          <button className="flex h-6 w-6 items-center justify-center rounded hover:bg-muted">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            )}
                          </button>
                        </TableCell>
                        <TableCell className="font-medium">{source.name}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" size="sm">
                            {source.symbol}
                          </Badge>
                        </TableCell>
                        <TableCell>{CHAIN_DISPLAY_NAMES[source.chain] ?? source.chain}</TableCell>
                        <TableCell>
                          <Badge variant="outline" size="sm">
                            {source.sourceType.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge
                            status={source.status === 'active' ? 'active' : 'offline'}
                            text={source.status}
                            size="sm"
                            pulse={source.status === 'active'}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-mono text-sm">
                            {formatUpdateInterval(source.updateIntervalSeconds)}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={getReliabilityBadgeVariant(source.reliabilityScore)}
                            size="sm"
                          >
                            {source.reliabilityScore.toFixed(1)}%
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(source.lastUpdateAt)}
                          </div>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow key={`${source.sourceId}-details`} className="bg-muted/30">
                          <TableCell colSpan={9} className="p-4">
                            <DataSourcePerformanceCard source={source} />
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        ) : (
          <DataSourcePerformanceComparison sources={dataSources} />
        )}
      </CardContent>
    </Card>
  );
}
