'use client';

import { useState, useEffect, useCallback } from 'react';

import {
  AlertTriangle,
  RefreshCw,
  Server,
  Clock,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
} from 'lucide-react';

import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { SkeletonList } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { useI18n } from '@/i18n';
import { formatTime } from '@/shared/utils';
import { fetchApiData } from '@/shared/utils/api';

import { getScoreColor } from '../utils/reliabilityScore';

import type { Operator } from '../types';

interface OperatorListProps {
  className?: string;
}

export function OperatorList({ className }: OperatorListProps) {
  const { t } = useI18n();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOperators = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchApiData<Operator[]>('/api/oracle/chainlink/operators');
      setOperators(data);
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

  const formatResponseTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getResponseTimeVariant = (ms: number): 'success' | 'warning' | 'danger' => {
    if (ms <= 500) return 'success';
    if (ms <= 2000) return 'warning';
    return 'danger';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            {t('chainlink.operators.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonList count={4} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            {t('chainlink.operators.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>
    );
  }

  if (operators.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-primary" />
            {t('chainlink.operators.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
            <Server className="h-10 w-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">{t('chainlink.operators.noData')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const onlineCount = operators.filter((op) => op.online).length;

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
            <Button variant="outline" size="sm" onClick={fetchOperators}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('common.refresh')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {operators.map((operator) => (
              <div
                key={operator.name}
                className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
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
                        {getTrendIcon(operator.reliabilityScore.trend)}
                      </div>
                    </div>
                    <Progress value={operator.reliabilityScore.overall} className="h-2" />
                    <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help rounded bg-muted/50 p-1.5 text-center">
                            <div className="text-muted-foreground">
                              {t('chainlink.operators.uptime')}
                            </div>
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
                            <div className="font-medium">
                              {operator.reliabilityScore.responseTime}%
                            </div>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{t('chainlink.operators.responseDesc')}</p>
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="cursor-help rounded bg-muted/50 p-1.5 text-center">
                            <div className="text-muted-foreground">
                              {t('chainlink.operators.feeds')}
                            </div>
                            <div className="font-medium">
                              {operator.reliabilityScore.feedSupport}%
                            </div>
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
                    <span className="text-muted-foreground">
                      {t('chainlink.operators.responseTime')}
                    </span>
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
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
