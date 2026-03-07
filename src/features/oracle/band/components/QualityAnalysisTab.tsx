'use client';

import { useState, useEffect, useCallback } from 'react';

import { Activity, Clock, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Progress } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { BAND_ORACLE_SYMBOL_OPTIONS } from '@/config/constants';
import { useI18n } from '@/i18n';
import { logger } from '@/shared/logger';
import { fetchApiData } from '@/shared/utils';

interface LatencyDistribution {
  range: string;
  count: number;
  percentage: number;
}

interface DataQualityMetrics {
  symbol: string;
  chain: string;
  timestamp: string;
  completeness: {
    totalDataPoints: number;
    missingDataPoints: number;
    completenessRate: number;
  };
  latency: {
    avgLatencyMs: number;
    p50LatencyMs: number;
    p95LatencyMs: number;
    p99LatencyMs: number;
    maxLatencyMs: number;
    latencyDistribution: LatencyDistribution[];
  };
  consistency: {
    crossSourceAgreement: number;
    deviationFromMedian: number;
    outlierCount: number;
    consistencyScore: number;
  };
  freshness: {
    lastUpdateTimestamp: string;
    stalenessSeconds: number;
    updateFrequency: number;
    freshnessScore: number;
  };
}

interface QualityResponse {
  data: {
    summary: {
      overallScore: number;
      totalSymbols: number;
      healthySymbols: number;
      degradedSymbols: number;
      avgCompleteness: number;
      avgLatency: number;
      avgConsistency: number;
    };
    symbols: Record<string, DataQualityMetrics>;
  };
}

export function QualityAnalysisTab() {
  const { t } = useI18n();
  const [selectedSymbol, setSelectedSymbol] = useState('BTC/USD');
  const [loading, setLoading] = useState(true);
  const [qualityData, setQualityData] = useState<QualityResponse['data'] | null>(null);

  const fetchQualityData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchApiData<QualityResponse>(
        `/api/oracle/band/quality?symbols=${selectedSymbol}`,
      );
      setQualityData(response.data);
    } catch (error) {
      logger.error('Failed to fetch quality data:', { error });
    } finally {
      setLoading(false);
    }
  }, [selectedSymbol]);

  useEffect(() => {
    fetchQualityData();
  }, [fetchQualityData]);

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 70) return 'warning';
    return 'destructive';
  };

  const metrics = qualityData?.symbols[selectedSymbol];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-lg font-medium">{t('band.qualityAnalysis.title')}</CardTitle>
          <div className="flex items-center gap-2">
            <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BAND_ORACLE_SYMBOL_OPTIONS.map((symbol) => (
                  <SelectItem key={symbol.value} value={symbol.value}>
                    {symbol.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchQualityData} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : qualityData?.summary ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      {t('band.qualityAnalysis.overallScore')}
                    </span>
                    <Activity className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div
                    className={`mt-2 text-3xl font-bold ${getScoreColor(qualityData.summary.overallScore)}`}
                  >
                    {qualityData.summary.overallScore}
                  </div>
                  <Badge variant={getScoreBadge(qualityData.summary.overallScore)} className="mt-1">
                    {qualityData.summary.overallScore >= 90
                      ? t('band.qualityAnalysis.healthy')
                      : t('band.qualityAnalysis.degraded')}
                  </Badge>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      {t('band.qualityAnalysis.dataIntegrity')}
                    </span>
                    <CheckCircle className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-2 text-3xl font-bold">
                    {qualityData.summary.avgCompleteness}%
                  </div>
                  <Progress value={qualityData.summary.avgCompleteness} className="mt-2" />
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      {t('band.qualityAnalysis.avgLatency')}
                    </span>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="mt-2 text-3xl font-bold">{qualityData.summary.avgLatency}ms</div>
                  <span className="text-xs text-muted-foreground">
                    P95: {metrics?.latency.p95LatencyMs}ms
                  </span>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      {t('band.qualityAnalysis.consistencyScore')}
                    </span>
                    {qualityData.summary.avgConsistency >= 90 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                    )}
                  </div>
                  <div
                    className={`mt-2 text-3xl font-bold ${getScoreColor(qualityData.summary.avgConsistency)}`}
                  >
                    {qualityData.summary.avgConsistency}%
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {t('band.qualityAnalysis.deviationFromMedian', {
                      value: metrics?.consistency.deviationFromMedian ?? 0,
                    })}
                  </span>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Detail Cards */}
      {metrics && (
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Latency Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                {t('band.qualityAnalysis.latencyDistribution')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.latency.latencyDistribution.map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="w-16 text-sm text-muted-foreground">{item.range}</span>
                    <Progress value={item.percentage} className="flex-1" />
                    <span className="w-12 text-right text-sm">{item.percentage.toFixed(1)}%</span>
                  </div>
                ))}
                <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">P50:</span>
                    <span className="ml-2 font-medium">{metrics.latency.p50LatencyMs}ms</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">P95:</span>
                    <span className="ml-2 font-medium">{metrics.latency.p95LatencyMs}ms</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">P99:</span>
                    <span className="ml-2 font-medium">{metrics.latency.p99LatencyMs}ms</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Max:</span>
                    <span className="ml-2 font-medium">{metrics.latency.maxLatencyMs}ms</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consistency & Freshness */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-medium">
                {t('band.qualityAnalysis.consistencyAndFreshness')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('band.qualityAnalysis.crossSourceConsistency')}
                  </span>
                  <Badge className="text-xs">{metrics.consistency.crossSourceAgreement}%</Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('band.qualityAnalysis.deviationFromMedianLabel')}
                  </span>
                  <span className="font-medium">±{metrics.consistency.deviationFromMedian}%</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('band.qualityAnalysis.outlierDataPoints')}
                  </span>
                  <Badge
                    variant={metrics.consistency.outlierCount > 5 ? 'destructive' : 'secondary'}
                    className="text-xs"
                  >
                    {metrics.consistency.outlierCount} {t('band.qualityAnalysis.units')}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {t('band.qualityAnalysis.consistencyScore')}
                  </span>
                  <span
                    className={`font-bold ${getScoreColor(metrics.consistency.consistencyScore)}`}
                  >
                    {metrics.consistency.consistencyScore}%
                  </span>
                </div>

                <div className="mt-4 border-t pt-4">
                  <div className="flex items-center justify-between text-sm">
                    <Badge variant={metrics.freshness.freshnessScore >= 95 ? 'success' : 'warning'}>
                      {t('band.qualityAnalysis.freshnessScore')}
                    </Badge>
                    <span className="font-medium">{metrics.freshness.freshnessScore}%</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {t('band.qualityAnalysis.updateFrequency')}: {t('band.qualityAnalysis.every')}{' '}
                    {metrics.freshness.updateFrequency} {t('band.qualityAnalysis.seconds')}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {new Date(metrics.freshness.lastUpdateTimestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
