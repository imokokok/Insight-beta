'use client';

import { useState, useEffect, useCallback } from 'react';

import { RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent } from '@/components/ui';
import { Progress } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { useI18n } from '@/i18n';
import { logger } from '@/shared/logger';
import { fetchApiData, cn } from '@/shared/utils';
import { formatPrice, getDeviationColor } from '@/shared/utils/format';

interface PriceComparison {
  symbol: string;
  prices: {
    band: number;
    chainlink: number;
    pyth: number;
  };
  deviations: {
    bandVsChainlink: number;
    bandVsPyth: number;
    chainlinkVsPyth: number;
  };
  avgPrice: number;
}

interface DeviationHistoryPoint {
  timestamp: string;
  bandVsChainlink: number;
  bandVsPyth: number;
}

interface ComparisonResponse {
  data: {
    summary: {
      totalSymbols: number;
      avgDeviation: number;
      maxDeviation: number;
      symbolsInSync: number;
      symbolsOutOfSync: number;
    };
    comparison: PriceComparison[];
    deviationHistory: DeviationHistoryPoint[];
  };
}

export function PriceComparisonTab() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [comparisonData, setComparisonData] = useState<ComparisonResponse['data'] | null>(null);

  const fetchComparisonData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchApiData<ComparisonResponse>('/api/oracle/band/comparison');
      setComparisonData(response.data);
    } catch (error) {
      logger.error('Failed to fetch comparison data:', { error });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchComparisonData();
  }, [fetchComparisonData]);

  const getDeviationBadge = (deviation: number) => {
    const absDev = Math.abs(deviation);
    if (absDev < 0.5) return 'success';
    if (absDev < 1.0) return 'warning';
    return 'destructive';
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <Button variant="outline" size="sm" onClick={fetchComparisonData} disabled={loading}>
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
          {loading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : comparisonData?.summary ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('band.priceComparison.totalAssets')}
                  </span>
                  <div className="mt-1 text-2xl font-bold">
                    {comparisonData.summary.totalSymbols}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('band.priceComparison.avgDeviation')}
                  </span>
                  <div
                    className={cn(
                      'mt-1 text-2xl font-bold',
                      getDeviationColor(comparisonData.summary.avgDeviation),
                    )}
                  >
                    {comparisonData.summary.avgDeviation}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('band.priceComparison.maxDeviation')}
                  </span>
                  <div
                    className={cn(
                      'mt-1 text-2xl font-bold',
                      getDeviationColor(comparisonData.summary.maxDeviation),
                    )}
                  >
                    {comparisonData.summary.maxDeviation}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t('band.priceComparison.syncStatus')}
                  </span>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-green-600">
                      {comparisonData.summary.symbolsInSync}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      / {comparisonData.summary.totalSymbols}
                    </span>
                  </div>
                  <Progress
                    value={
                      (comparisonData.summary.symbolsInSync / comparisonData.summary.totalSymbols) *
                      100
                    }
                    className="mt-2 h-1.5"
                  />
                </CardContent>
              </Card>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-medium">{t('band.priceComparison.detailsTitle')}</h3>
          {loading ? (
            <Skeleton className="h-[250px] w-full" />
          ) : comparisonData?.comparison ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">{t('band.priceComparison.asset')}</TableHead>
                    <TableHead className="text-right text-xs">Band</TableHead>
                    <TableHead className="text-right text-xs">Chainlink</TableHead>
                    <TableHead className="text-right text-xs">Pyth</TableHead>
                    <TableHead className="text-right text-xs">Band vs Chainlink</TableHead>
                    <TableHead className="text-right text-xs">Band vs Pyth</TableHead>
                    <TableHead className="text-right text-xs">{t('common.table.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {comparisonData.comparison.map((item) => (
                    <TableRow key={item.symbol}>
                      <TableCell className="text-sm font-medium">{item.symbol}</TableCell>
                      <TableCell className="text-right text-sm">
                        ${formatPrice(item.prices.band)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        ${formatPrice(item.prices.chainlink)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        ${formatPrice(item.prices.pyth)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right text-sm',
                          getDeviationColor(item.deviations.bandVsChainlink),
                        )}
                      >
                        {item.deviations.bandVsChainlink > 0 ? '+' : ''}
                        {item.deviations.bandVsChainlink}%
                      </TableCell>
                      <TableCell
                        className={cn(
                          'text-right text-sm',
                          getDeviationColor(item.deviations.bandVsPyth),
                        )}
                      >
                        {item.deviations.bandVsPyth > 0 ? '+' : ''}
                        {item.deviations.bandVsPyth}%
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={getDeviationBadge(
                            Math.max(
                              Math.abs(item.deviations.bandVsChainlink),
                              Math.abs(item.deviations.bandVsPyth),
                            ),
                          )}
                          className="text-xs"
                        >
                          {Math.max(
                            Math.abs(item.deviations.bandVsChainlink),
                            Math.abs(item.deviations.bandVsPyth),
                          ) < 0.5
                            ? t('band.priceComparison.synced')
                            : t('band.priceComparison.desynced')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              {t('band.priceComparison.noData')}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-medium">{t('band.priceComparison.deviationTrend')}</h3>
          {loading ? (
            <Skeleton className="h-[180px] w-full" />
          ) : comparisonData?.deviationHistory ? (
            <div className="space-y-3">
              <div className="flex items-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Band vs Chainlink</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-purple-500" />
                  <span className="text-muted-foreground">Band vs Pyth</span>
                </div>
              </div>
              <div className="h-[150px] overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 text-left font-medium">{t('common.table.time')}</th>
                      <th className="pb-2 text-right font-medium">Band vs Chainlink</th>
                      <th className="pb-2 text-right font-medium">Band vs Pyth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.deviationHistory.map((point, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-1.5 text-muted-foreground">
                          {new Date(point.timestamp).toLocaleTimeString()}
                        </td>
                        <td
                          className={cn(
                            'py-1.5 text-right',
                            getDeviationColor(point.bandVsChainlink),
                          )}
                        >
                          {point.bandVsChainlink > 0 ? '+' : ''}
                          {point.bandVsChainlink}%
                        </td>
                        <td
                          className={cn('py-1.5 text-right', getDeviationColor(point.bandVsPyth))}
                        >
                          {point.bandVsPyth > 0 ? '+' : ''}
                          {point.bandVsPyth}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              {t('band.priceComparison.noData')}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
