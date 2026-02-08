'use client';

import { useMemo, useState } from 'react';

import {
  BarChart3,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Scale,
  Trophy,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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

export interface ProtocolComparisonData {
  id: string;
  name: string;
  logo?: string;
  healthScore: number;
  latency: number;
  accuracy: number;
  uptime: number;
  activeFeeds: number;
  supportedChains: number;
  tvl?: number;
  marketShare?: number;
  features: string[];
}

interface ProtocolComparisonProps {
  protocols: ProtocolComparisonData[];
  loading?: boolean;
  className?: string;
}

export function ProtocolComparison({ protocols, loading, className }: ProtocolComparisonProps) {
  const { t } = useI18n();
  const [sortBy, setSortBy] = useState<'health' | 'latency' | 'accuracy' | 'uptime'>('health');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const sortedProtocols = useMemo(() => {
    const sorted = [...protocols].sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'health':
          comparison = a.healthScore - b.healthScore;
          break;
        case 'latency':
          comparison = a.latency - b.latency;
          break;
        case 'accuracy':
          comparison = a.accuracy - b.accuracy;
          break;
        case 'uptime':
          comparison = a.uptime - b.uptime;
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    return sorted;
  }, [protocols, sortBy, sortOrder]);

  const bestProtocol = useMemo(() => {
    if (protocols.length === 0) return null;
    return protocols.reduce((best, current) =>
      current.healthScore > best.healthScore ? current : best
    );
  }, [protocols]);

  const toggleSort = (column: typeof sortBy) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-emerald-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-rose-600';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
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
            <Scale className="h-5 w-5" />
            {t('protocol:comparison.title')}
            {bestProtocol && (
              <Badge variant="secondary" className="ml-2">
                <Trophy className="mr-1 h-3 w-3" />
                {t('protocol:comparison.best')}: {bestProtocol.name}
              </Badge>
            )}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[200px]">{t('protocol:comparison.protocol')}</TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('health')}>
                  <div className="flex items-center gap-1">
                    {t('protocol:comparison.healthScore')}
                    {sortBy === 'health' &&
                      (sortOrder === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />)}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('latency')}>
                  <div className="flex items-center gap-1">
                    {t('protocol:comparison.latency')}
                    {sortBy === 'latency' &&
                      (sortOrder === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />)}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('accuracy')}>
                  <div className="flex items-center gap-1">
                    {t('protocol:comparison.accuracy')}
                    {sortBy === 'accuracy' &&
                      (sortOrder === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />)}
                  </div>
                </TableHead>
                <TableHead className="cursor-pointer" onClick={() => toggleSort('uptime')}>
                  <div className="flex items-center gap-1">
                    {t('protocol:comparison.uptime')}
                    {sortBy === 'uptime' &&
                      (sortOrder === 'desc' ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />)}
                  </div>
                </TableHead>
                <TableHead className="text-right">{t('protocol:comparison.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedProtocols.map((protocol) => {
                const isBest = bestProtocol?.id === protocol.id;
                const isExpanded = expandedRows.has(protocol.id);

                return (
                  <>
                    <TableRow
                      key={protocol.id}
                      className={cn(
                        'cursor-pointer transition-colors',
                        isBest && 'bg-emerald-50/50',
                        'hover:bg-muted/50'
                      )}
                      onClick={() => toggleExpand(protocol.id)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {protocol.logo ? (
                            <img
                              src={protocol.logo}
                              alt={protocol.name}
                              className="h-8 w-8 rounded-lg object-contain"
                            />
                          ) : (
                            <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-lg">
                              <BarChart3 className="text-primary h-4 w-4" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 font-medium">
                              {protocol.name}
                              {isBest && (
                                <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
                                  <Trophy className="mr-1 h-3 w-3" />
                                  {t('protocol:comparison.top')}
                                </Badge>
                              )}
                            </div>
                            <div className="text-muted-foreground text-xs">
                              {protocol.activeFeeds} {t('protocol:comparison.feeds')} · {protocol.supportedChains} {t('protocol:comparison.chains')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className={cn('font-bold', getScoreColor(protocol.healthScore))}>
                            {protocol.healthScore}
                          </div>
                          <Progress
                            value={protocol.healthScore}
                            className="h-1.5 w-20"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'font-medium',
                          protocol.latency < 500 ? 'text-emerald-600' : protocol.latency < 2000 ? 'text-blue-600' : 'text-amber-600'
                        )}>
                          {protocol.latency}ms
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'font-medium',
                          protocol.accuracy >= 99 ? 'text-emerald-600' : protocol.accuracy >= 95 ? 'text-blue-600' : 'text-amber-600'
                        )}>
                          {protocol.accuracy.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={cn(
                          'font-medium',
                          protocol.uptime >= 99.9 ? 'text-emerald-600' : protocol.uptime >= 99 ? 'text-blue-600' : 'text-amber-600'
                        )}>
                          {protocol.uptime.toFixed(2)}%
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          {isExpanded ? t('common:collapse') : t('common:expand')}
                          {isExpanded ? <ChevronUp className="ml-1 h-4 w-4" /> : <ChevronDown className="ml-1 h-4 w-4" />}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {isExpanded && (
                      <TableRow className="bg-muted/30">
                        <TableCell colSpan={6} className="p-4">
                          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            {protocol.tvl && (
                              <div className="space-y-1">
                                <span className="text-muted-foreground text-xs">{t('protocol:comparison.tvl')}</span>
                                <p className="text-lg font-semibold">${(protocol.tvl / 1e9).toFixed(2)}B</p>
                              </div>
                            )}
                            {protocol.marketShare && (
                              <div className="space-y-1">
                                <span className="text-muted-foreground text-xs">{t('protocol:comparison.marketShare')}</span>
                                <p className="text-lg font-semibold">{protocol.marketShare.toFixed(1)}%</p>
                              </div>
                            )}
                            <div className="space-y-1 sm:col-span-2">
                              <span className="text-muted-foreground text-xs">{t('protocol:comparison.features')}</span>
                              <div className="flex flex-wrap gap-1">
                                {protocol.features.map((feature) => (
                                  <Badge key={feature} variant="secondary" className="text-xs">
                                    <CheckCircle2 className="mr-1 h-3 w-3" />
                                    {feature}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
