'use client';

import { useState, useEffect, useCallback } from 'react';

import { ArrowDownUp, TrendingUp, TrendingDown, AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Progress } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { formatPrice, getDeviationColor } from '@/features/cross-chain/utils/format';
import { useI18n } from '@/i18n';
import { fetchApiData, cn } from '@/shared/utils';

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
  useI18n();
  const [loading, setLoading] = useState(true);
  const [comparisonData, setComparisonData] = useState<ComparisonResponse['data'] | null>(null);

  const fetchComparisonData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchApiData<ComparisonResponse>('/api/oracle/band/comparison');
      setComparisonData(response.data);
    } catch (error) {
      console.error('Failed to fetch comparison data:', error);
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
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">预言机价格对比</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchComparisonData} disabled={loading}>
            <RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />
            刷新
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : comparisonData?.summary ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">总资产数</span>
                    <ArrowDownUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-2 text-3xl font-bold">
                    {comparisonData.summary.totalSymbols}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">平均偏差</span>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div
                    className={cn(
                      'mt-2 text-3xl font-bold',
                      getDeviationColor(comparisonData.summary.avgDeviation),
                    )}
                  >
                    {comparisonData.summary.avgDeviation}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">最大偏差</span>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div
                    className={cn(
                      'mt-2 text-3xl font-bold',
                      getDeviationColor(comparisonData.summary.maxDeviation),
                    )}
                  >
                    {comparisonData.summary.maxDeviation}%
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">同步状态</span>
                    {comparisonData.summary.symbolsInSync > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-green-600">
                      {comparisonData.summary.symbolsInSync}
                    </span>
                    <span className="text-muted-foreground">
                      / {comparisonData.summary.totalSymbols}
                    </span>
                  </div>
                  <Progress
                    value={
                      (comparisonData.summary.symbolsInSync / comparisonData.summary.totalSymbols) *
                      100
                    }
                    className="mt-2"
                  />
                </CardContent>
              </Card>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">价格对比详情</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[300px] w-full" />
          ) : comparisonData?.comparison ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>资产</TableHead>
                  <TableHead className="text-right">Band</TableHead>
                  <TableHead className="text-right">Chainlink</TableHead>
                  <TableHead className="text-right">Pyth</TableHead>
                  <TableHead className="text-right">Band vs Chainlink</TableHead>
                  <TableHead className="text-right">Band vs Pyth</TableHead>
                  <TableHead className="text-right">状态</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparisonData.comparison.map((item) => (
                  <TableRow key={item.symbol}>
                    <TableCell className="font-medium">{item.symbol}</TableCell>
                    <TableCell className="text-right">${formatPrice(item.prices.band)}</TableCell>
                    <TableCell className="text-right">
                      ${formatPrice(item.prices.chainlink)}
                    </TableCell>
                    <TableCell className="text-right">${formatPrice(item.prices.pyth)}</TableCell>
                    <TableCell
                      className={cn(
                        'text-right',
                        getDeviationColor(item.deviations.bandVsChainlink),
                      )}
                    >
                      {item.deviations.bandVsChainlink > 0 ? '+' : ''}
                      {item.deviations.bandVsChainlink}%
                    </TableCell>
                    <TableCell
                      className={cn('text-right', getDeviationColor(item.deviations.bandVsPyth))}
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
                      >
                        {Math.max(
                          Math.abs(item.deviations.bandVsChainlink),
                          Math.abs(item.deviations.bandVsPyth),
                        ) < 0.5
                          ? '同步'
                          : '偏差'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center text-muted-foreground">暂无数据</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">偏差趋势 (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : comparisonData?.deviationHistory ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-muted-foreground">Band vs Chainlink</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-purple-500" />
                  <span className="text-muted-foreground">Band vs Pyth</span>
                </div>
              </div>
              <div className="h-[200px] overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 text-left font-medium">时间</th>
                      <th className="pb-2 text-right font-medium">Band vs Chainlink</th>
                      <th className="pb-2 text-right font-medium">Band vs Pyth</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comparisonData.deviationHistory.map((point, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-2 text-muted-foreground">
                          {new Date(point.timestamp).toLocaleTimeString()}
                        </td>
                        <td
                          className={cn(
                            'py-2 text-right',
                            getDeviationColor(point.bandVsChainlink),
                          )}
                        >
                          {point.bandVsChainlink > 0 ? '+' : ''}
                          {point.bandVsChainlink}%
                        </td>
                        <td className={cn('py-2 text-right', getDeviationColor(point.bandVsPyth))}>
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
            <div className="text-center text-muted-foreground">暂无数据</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
