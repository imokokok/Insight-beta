'use client';

import { useState, useCallback, useMemo, memo } from 'react';

import { motion } from 'framer-motion';
import {
  ArrowUpDown,
  Trophy,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import { Button } from '@/components/ui';
import { Alert, AlertDescription } from '@/components/ui';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';
import { ORACLE_PROTOCOLS, PROTOCOL_DISPLAY_NAMES, type OracleProtocol } from '@/types/oracle';

import { CompareCharts, type ChartProtocolMetrics } from './CompareCharts';
import { ProtocolSelector } from './ProtocolSelector';
import { useProtocolMetrics, type ProtocolMetrics } from '../hooks/useProtocolMetrics';

interface ProtocolCompareProps {
  availableProtocols?: OracleProtocol[];
  onCompare?: (protocols: OracleProtocol[]) => void;
  className?: string;
}

const getBestProtocol = (
  metrics: ProtocolMetrics[],
  key: keyof Omit<ProtocolMetrics, 'protocol' | 'totalFeeds' | 'activeFeeds' | 'tvl' | 'uptime'>,
  lowerIsBetter: boolean = false,
): OracleProtocol | null => {
  if (metrics.length === 0) return null;

  const sorted = [...metrics].sort((a, b) => (lowerIsBetter ? a[key] - b[key] : b[key] - a[key]));

  return sorted[0]?.protocol ?? null;
};

export const ProtocolCompare = memo(function ProtocolCompare({
  availableProtocols = ORACLE_PROTOCOLS,
  onCompare,
  className,
}: ProtocolCompareProps) {
  const { t } = useI18n();
  const [selectedProtocols, setSelectedProtocols] = useState<OracleProtocol[]>([]);
  const [sortConfig, setSortConfig] = useState<{
    key: keyof Omit<ProtocolMetrics, 'protocol'>;
    direction: 'asc' | 'desc';
  } | null>(null);

  const {
    metrics: apiMetrics,
    isLoading,
    isError,
    error,
    isMock,
    refresh,
  } = useProtocolMetrics({
    protocols: selectedProtocols,
    enabled: selectedProtocols.length >= 2,
  });

  const handleSelectionChange = useCallback(
    (protocols: OracleProtocol[]) => {
      setSelectedProtocols(protocols);
      onCompare?.(protocols);
    },
    [onCompare],
  );

  const handleSort = useCallback((key: keyof Omit<ProtocolMetrics, 'protocol'>) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
      }
      return { key, direction: 'desc' };
    });
  }, []);

  const sortedMetrics = useMemo(() => {
    if (!sortConfig || apiMetrics.length === 0) return apiMetrics;

    return [...apiMetrics].sort((a, b) => {
      const aValue = a[sortConfig.key] as number;
      const bValue = b[sortConfig.key] as number;

      if (sortConfig.direction === 'asc') {
        return aValue - bValue;
      }
      return bValue - aValue;
    });
  }, [apiMetrics, sortConfig]);

  const bestLatency = getBestProtocol(apiMetrics, 'latency', true);
  const bestAccuracy = getBestProtocol(apiMetrics, 'accuracy', false);
  const bestFrequency = getBestProtocol(apiMetrics, 'updateFrequency', false);
  const lowestDeviation = getBestProtocol(apiMetrics, 'priceDeviation', true);

  const getScoreColor = (value: number, metric: string): string => {
    if (metric === 'latency') {
      if (value < 30) return 'text-green-600';
      if (value < 60) return 'text-yellow-600';
      return 'text-red-600';
    }
    if (metric === 'accuracy') {
      if (value >= 99.5) return 'text-green-600';
      if (value >= 99) return 'text-yellow-600';
      return 'text-red-600';
    }
    if (metric === 'updateFrequency') {
      if (value >= 95) return 'text-green-600';
      if (value >= 85) return 'text-yellow-600';
      return 'text-red-600';
    }
    if (metric === 'priceDeviation') {
      if (value <= 0.03) return 'text-green-600';
      if (value <= 0.05) return 'text-yellow-600';
      return 'text-red-600';
    }
    return 'text-gray-900';
  };

  const getScoreIcon = (protocol: OracleProtocol, metric: string) => {
    const isBest =
      (metric === 'latency' && protocol === bestLatency) ||
      (metric === 'accuracy' && protocol === bestAccuracy) ||
      (metric === 'updateFrequency' && protocol === bestFrequency) ||
      (metric === 'priceDeviation' && protocol === lowestDeviation);

    if (isBest) {
      return <Trophy className="ml-1 h-3.5 w-3.5 text-yellow-500" />;
    }
    return null;
  };

  return (
    <div className={cn('space-y-6', className)}>
      <Card>
        <CardHeader>
          <CardTitle>{t('comparison.protocolCompare.title')}</CardTitle>
          <CardDescription>{t('comparison.protocolCompare.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProtocolSelector
            availableProtocols={availableProtocols}
            selectedProtocols={selectedProtocols}
            onSelectionChange={handleSelectionChange}
            maxSelections={4}
          />
        </CardContent>
      </Card>

      {isMock && selectedProtocols.length >= 2 && (
        <Alert variant="default" className="border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            {t('comparison.protocolCompare.mockDataWarning') ||
              'Using simulated data for demonstration. Real metrics will be available when connected to production data sources.'}
          </AlertDescription>
        </Alert>
      )}

      {isError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error ||
              t('comparison.protocolCompare.loadError') ||
              'Failed to load protocol metrics'}
          </AlertDescription>
        </Alert>
      )}

      {selectedProtocols.length >= 2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="grid flex-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {t('comparison.protocolCompare.bestLatency')}
                    </span>
                  </div>
                  <p className="mt-2 text-xl font-bold capitalize">
                    {bestLatency ? PROTOCOL_DISPLAY_NAMES[bestLatency] : '-'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {t('comparison.protocolCompare.bestAccuracy')}
                    </span>
                  </div>
                  <p className="mt-2 text-xl font-bold capitalize">
                    {bestAccuracy ? PROTOCOL_DISPLAY_NAMES[bestAccuracy] : '-'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {t('comparison.protocolCompare.bestFrequency')}
                    </span>
                  </div>
                  <p className="mt-2 text-xl font-bold capitalize">
                    {bestFrequency ? PROTOCOL_DISPLAY_NAMES[bestFrequency] : '-'}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {t('comparison.protocolCompare.lowestDeviation')}
                    </span>
                  </div>
                  <p className="mt-2 text-xl font-bold capitalize">
                    {lowestDeviation ? PROTOCOL_DISPLAY_NAMES[lowestDeviation] : '-'}
                  </p>
                </CardContent>
              </Card>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refresh}
              disabled={isLoading}
              className="ml-4"
            >
              <RefreshCw className={cn('mr-2 h-4 w-4', isLoading && 'animate-spin')} />
              {t('common.refresh')}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t('comparison.protocolCompare.comparisonTable')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(selectedProtocols.length)].map((_, i) => (
                    <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
                  ))}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-32">{t('comparison.table.protocol')}</TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('latency')}
                            className="h-8 px-2"
                          >
                            {t('comparison.protocolCompare.metrics.latency')}
                            {sortConfig?.key === 'latency' && (
                              <ArrowUpDown className="ml-1 h-3 w-3" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('accuracy')}
                            className="h-8 px-2"
                          >
                            {t('comparison.protocolCompare.metrics.accuracy')}
                            {sortConfig?.key === 'accuracy' && (
                              <ArrowUpDown className="ml-1 h-3 w-3" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('updateFrequency')}
                            className="h-8 px-2"
                          >
                            {t('comparison.protocolCompare.metrics.updateFrequency')}
                            {sortConfig?.key === 'updateFrequency' && (
                              <ArrowUpDown className="ml-1 h-3 w-3" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSort('priceDeviation')}
                            className="h-8 px-2"
                          >
                            {t('comparison.protocolCompare.metrics.priceDeviation')}
                            {sortConfig?.key === 'priceDeviation' && (
                              <ArrowUpDown className="ml-1 h-3 w-3" />
                            )}
                          </Button>
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedMetrics.map((m) => (
                        <TableRow key={m.protocol}>
                          <TableCell className="font-medium capitalize">
                            {PROTOCOL_DISPLAY_NAMES[m.protocol]}
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'flex items-center',
                                getScoreColor(m.latency, 'latency'),
                              )}
                            >
                              {m.latency.toFixed(1)} ms
                              {getScoreIcon(m.protocol, 'latency')}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'flex items-center',
                                getScoreColor(m.accuracy, 'accuracy'),
                              )}
                            >
                              {m.accuracy.toFixed(1)}%{getScoreIcon(m.protocol, 'accuracy')}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'flex items-center',
                                getScoreColor(m.updateFrequency, 'updateFrequency'),
                              )}
                            >
                              {m.updateFrequency.toFixed(1)}%
                              {getScoreIcon(m.protocol, 'updateFrequency')}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'flex items-center',
                                getScoreColor(m.priceDeviation, 'priceDeviation'),
                              )}
                            >
                              {(m.priceDeviation * 100).toFixed(2)}%
                              {getScoreIcon(m.protocol, 'priceDeviation')}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <CompareCharts metrics={apiMetrics as ChartProtocolMetrics[]} />
        </motion.div>
      )}

      {selectedProtocols.length === 1 && (
        <Card>
          <CardContent className="flex h-32 items-center justify-center">
            <p className="text-muted-foreground">
              {t('comparison.protocolCompare.selectAtLeastTwo')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
});
