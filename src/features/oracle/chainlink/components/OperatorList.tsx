'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import {
  AlertTriangle,
  RefreshCw,
  Server,
  Clock,
  Activity,
  Info,
  BarChart3,
} from 'lucide-react';

import { Button } from '@/components/ui';
import { Badge, StatusBadge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Progress } from '@/components/ui';
import { SkeletonList } from '@/components/ui';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatTime, TrendIcon } from '@/shared/utils';
import { fetchApiData } from '@/shared/utils/api';

import { getScoreColor } from '../utils/reliabilityScore';
import { NodePerformancePanel } from './performance';

import type { Operator } from '../types';
import type {
  NodeUptimeTimeSeries,
  NodeResponseTimeTrend,
  NodeFeedSupportHistory,
  FeedUpdateFrequencyTrend,
  MultiNodeComparisonData,
  TimeRange,
} from '../types/historical';

interface OperatorListProps {
  className?: string;
  collapsible?: boolean;
}

export function OperatorList({ className, collapsible = false }: OperatorListProps) {
  const { t } = useI18n();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');

  const fetchOperators = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchApiData<{ operators: Operator[] }>('/api/oracle/chainlink/operators');
      setOperators(data.operators ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch operators');
      setOperators([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  const onlineCount = operators.filter((op) => op.online).length;

  const formatResponseTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getResponseTimeVariant = (ms: number): 'success' | 'warning' | 'danger' => {
    if (ms <= 500) return 'success';
    if (ms <= 2000) return 'warning';
    return 'danger';
  };

  const performanceData = useMemo(() => {
    if (!operators.length) return null;

    const historyPoints = Array.from({ length: 24 }, (_, i) => {
      const timestamp = new Date(Date.now() - (23 - i) * 3600000).toISOString();
      const baseUptime = 95 + Math.random() * 5;
      const baseResponseTime = 100 + Math.random() * 100;
      return {
        timestamp,
        uptime: baseUptime,
        responseTime: baseResponseTime,
        supportedFeedsCount: 5 + Math.floor(Math.random() * 10),
        activeFeedsCount: 3 + Math.floor(Math.random() * 7),
        feedUpdatesCount: Math.floor(Math.random() * 50) + 10,
        status: Math.random() > 0.1 ? ('online' as const) : ('degraded' as const),
      };
    });

    const uptimeData: NodeUptimeTimeSeries[] = operators.map((op) => {
      const baseUptime = op.reliabilityScore?.uptime ?? 95 + Math.random() * 5;
      return {
        nodeName: op.name,
        operatorName: op.name,
        currentUptime: baseUptime,
        avgUptime: baseUptime - 1 + Math.random() * 2,
        minUptime: baseUptime - 5 + Math.random() * 2,
        maxUptime: baseUptime + 4 + Math.random() * 0.1,
        downtimeCount: Math.floor(Math.random() * 3),
        totalDowntimeDuration: Math.floor(Math.random() * 300),
        history: historyPoints.map((p) => ({
          timestamp: p.timestamp,
          uptime: p.uptime,
          status: p.status,
        })),
      };
    });

    const responseTimeData: NodeResponseTimeTrend[] = operators.map((op) => {
      const baseResponseTime = op.responseTime;
      return {
        nodeName: op.name,
        operatorName: op.name,
        currentResponseTime: baseResponseTime,
        avgResponseTime: baseResponseTime + 50 + Math.random() * 50,
        minResponseTime: baseResponseTime * 0.5 + Math.random() * 25,
        maxResponseTime: baseResponseTime * 1.5 + Math.random() * 250,
        p50ResponseTime: baseResponseTime * 0.7 + Math.random() * 25,
        p95ResponseTime: baseResponseTime * 1.5 + Math.random() * 100,
        p99ResponseTime: baseResponseTime * 2 + Math.random() * 150,
        history: historyPoints.map((p) => ({
          timestamp: p.timestamp,
          responseTime: p.responseTime,
          p50ResponseTime: p.responseTime * 0.7,
          p95ResponseTime: p.responseTime * 1.5,
          p99ResponseTime: p.responseTime * 2,
        })),
      };
    });

    const feedSupportData: NodeFeedSupportHistory[] = operators.map((op) => ({
      nodeName: op.name,
      operatorName: op.name,
      currentSupportedFeeds: op.supportedFeeds.length,
      avgSupportedFeeds: op.supportedFeeds.length - 1 + Math.random() * 2,
      totalFeedUpdates: Math.floor(Math.random() * 1000) + 500,
      history: historyPoints.map((p) => ({
        timestamp: p.timestamp,
        supportedFeedsCount: p.supportedFeedsCount,
        activeFeedsCount: p.activeFeedsCount,
        feedUpdatesCount: p.feedUpdatesCount,
      })),
    }));

    const feedFrequencyData: FeedUpdateFrequencyTrend[] = [
      {
        feedId: 'eth-usd',
        symbol: 'ETH',
        pair: 'ETH/USD',
        currentFrequency: 1 + Math.random() * 0.5,
        avgFrequency: 1 + Math.random() * 0.3,
        minFrequency: 0.5 + Math.random() * 0.3,
        maxFrequency: 2 + Math.random() * 0.5,
        totalUpdates: Math.floor(Math.random() * 5000) + 1000,
        history: historyPoints.map((p) => ({
          timestamp: p.timestamp,
          updatesPerMinute: 0.5 + Math.random() * 1.5,
          avgIntervalSeconds: 30 + Math.random() * 60,
        })),
      },
    ];

    const comparisonData: MultiNodeComparisonData = {
      nodes: operators.map((op) => ({
        nodeName: op.name,
        operatorName: op.name,
        uptime: op.reliabilityScore?.uptime ?? 95 + Math.random() * 5,
        avgResponseTime: op.responseTime,
        p95ResponseTime: op.responseTime * 1.5,
        supportedFeedsCount: op.supportedFeeds.length,
        totalUpdates: Math.floor(Math.random() * 1000) + 500,
        reliabilityScore: op.reliabilityScore?.overall ?? 90 + Math.random() * 10,
        trend: op.reliabilityScore?.trend ?? 'stable',
      })),
      timeRange,
      comparisonMetrics: {
        avgUptime: operators.reduce((sum, op) => sum + (op.reliabilityScore?.uptime ?? 95), 0) / operators.length,
        bestUptime: operators.reduce((best, op) => {
          const uptime = op.reliabilityScore?.uptime ?? 95;
          return uptime > (best.uptime ?? 0) ? { name: op.name, uptime } : best;
        }, { name: '', uptime: 0 }).name,
        worstUptime: operators.reduce((worst, op) => {
          const uptime = op.reliabilityScore?.uptime ?? 95;
          return uptime < (worst.uptime ?? 100) ? { name: op.name, uptime } : worst;
        }, { name: '', uptime: 100 }).name,
        avgResponseTime: operators.reduce((sum, op) => sum + op.responseTime, 0) / operators.length,
        fastestNode: operators.reduce((fastest, op) => {
          return op.responseTime < fastest.responseTime ? { name: op.name, responseTime: op.responseTime } : fastest;
        }, { name: '', responseTime: Infinity }).name,
        slowestNode: operators.reduce((slowest, op) => {
          return op.responseTime > slowest.responseTime ? { name: op.name, responseTime: op.responseTime } : slowest;
        }, { name: '', responseTime: 0 }).name,
      },
    };

    return {
      uptimeData,
      responseTimeData,
      feedSupportData,
      feedFrequencyData,
      comparisonData,
    };
  }, [operators.length, timeRange]);

  const renderOperatorGrid = () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {operators.map((operator) => (
        <div
          key={operator.name}
          className="rounded-lg border border-border/30 bg-muted/20 p-4 transition-colors hover:bg-muted/50"
        >
          <div className="mb-3 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              <span className="font-semibold">{operator.name}</span>
            </div>
            <StatusBadge
              status={operator.online ? 'active' : 'inactive'}
              text={operator.online ? t('common.online') : t('common.offline')}
              size="sm"
              pulse={operator.online}
            />
          </div>

          {operator.reliabilityScore && (
            <div className="mb-3">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-xs text-muted-foreground">
                    {t('chainlink.operators.reliabilityScore')}
                  </span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-3 w-3 cursor-help text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p className="text-xs">{t('chainlink.operators.scoreDescription')}</p>
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="flex justify-between gap-4">
                          <span>{t('chainlink.operators.uptimeWeight')}:</span>
                          <span>50%</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>{t('chainlink.operators.responseTimeWeight')}:</span>
                          <span>30%</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>{t('chainlink.operators.feedSupportWeight')}:</span>
                          <span>20%</span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`text-lg font-bold ${getScoreColor(operator.reliabilityScore.overall)}`}
                  >
                    {operator.reliabilityScore.overall}
                  </span>
                  <TrendIcon trend={operator.reliabilityScore.trend} />
                </div>
              </div>
              <Progress value={operator.reliabilityScore.overall} className="h-2" />
              <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help rounded bg-muted/50 p-1.5 text-center">
                      <div className="text-muted-foreground">{t('chainlink.operators.uptime')}</div>
                      <div className="font-medium">{operator.reliabilityScore.uptime}%</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{t('chainlink.operators.uptimeDesc')}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help rounded bg-muted/50 p-1.5 text-center">
                      <div className="text-muted-foreground">
                        {t('chainlink.operators.response')}
                      </div>
                      <div className="font-medium">{operator.reliabilityScore.responseTime}%</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{t('chainlink.operators.responseDesc')}</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="cursor-help rounded bg-muted/50 p-1.5 text-center">
                      <div className="text-muted-foreground">{t('chainlink.operators.feeds')}</div>
                      <div className="font-medium">{operator.reliabilityScore.feedSupport}%</div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="text-xs">{t('chainlink.operators.feedsDesc')}</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">{t('chainlink.operators.responseTime')}</span>
              <Badge variant={getResponseTimeVariant(operator.responseTime)} size="sm">
                <Activity className="mr-1 h-3 w-3" />
                {formatResponseTime(operator.responseTime)}
              </Badge>
            </div>

            {operator.lastHeartbeat && (
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">
                  {t('chainlink.operators.lastHeartbeat')}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatTime(operator.lastHeartbeat)}
                </span>
              </div>
            )}

            <div className="mt-3">
              <span className="mb-1 block text-xs text-muted-foreground">
                {t('chainlink.operators.supportedFeeds')}
              </span>
              <div className="flex flex-wrap gap-1">
                {operator.supportedFeeds.slice(0, 4).map((feed) => (
                  <Badge key={feed} variant="outline" size="sm">
                    {feed}
                  </Badge>
                ))}
                {operator.supportedFeeds.length > 4 && (
                  <Badge variant="outline" size="sm">
                    +{operator.supportedFeeds.length - 4}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className={className}>
        <SkeletonList count={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <div>
            <p className="font-medium text-foreground">{t('common.error')}</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchOperators}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.retry')}
          </Button>
        </div>
      </div>
    );
  }

  if (operators.length === 0) {
    return (
      <div className={className}>
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <Server className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">{t('chainlink.operators.noData')}</p>
        </div>
      </div>
    );
  }

  if (collapsible) {
    return (
      <TooltipProvider>
        <div className={className}>
          <div className="mb-4 flex items-center justify-between">
            <Badge variant="secondary">
              {onlineCount}/{operators.length} {t('common.online')}
            </Badge>
            <Button variant="outline" size="sm" onClick={fetchOperators}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('common.refresh')}
            </Button>
          </div>
          {renderOperatorGrid()}
        </div>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                {t('chainlink.operators.title')}
                <Badge variant="secondary" className="ml-2">
                  {onlineCount}/{operators.length}
                </Badge>
              </CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowPerformancePanel(true)}>
                <BarChart3 className="mr-2 h-4 w-4" />
                性能分析
              </Button>
              <Button variant="outline" size="sm" onClick={fetchOperators}>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('common.refresh')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>{renderOperatorGrid()}</CardContent>
      </Card>

      <NodePerformancePanel
        isOpen={showPerformancePanel}
        onClose={() => setShowPerformancePanel(false)}
        uptimeData={performanceData?.uptimeData}
        responseTimeData={performanceData?.responseTimeData}
        feedSupportData={performanceData?.feedSupportData}
        feedFrequencyData={performanceData?.feedFrequencyData}
        comparisonData={performanceData?.comparisonData}
        defaultTimeRange={timeRange}
      />
    </TooltipProvider>
  );
}
