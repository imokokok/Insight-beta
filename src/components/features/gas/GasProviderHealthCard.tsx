'use client';

import React from 'react';

import { Activity, CheckCircle, AlertTriangle, XCircle, Clock } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { GasPriceHealthResponse } from '@/hooks/useGasPrice';
import { cn, formatPercentValue } from '@/shared/utils';

interface GasProviderHealthCardProps {
  data?: GasPriceHealthResponse;
  isLoading?: boolean;
}

const STATUS_CONFIG = {
  healthy: {
    icon: CheckCircle,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    label: 'Healthy',
  },
  degraded: {
    icon: AlertTriangle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500/10',
    borderColor: 'border-yellow-500/30',
    label: 'Degraded',
  },
  unhealthy: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    label: 'Unhealthy',
  },
};

function formatLatency(ms: number): string {
  if (ms < 100) return `${ms}ms`;
  if (ms < 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export const GasProviderHealthCard: React.FC<GasProviderHealthCardProps> = ({
  data,
  isLoading,
}) => {
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.data || data.data.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Gas Provider Health</CardTitle>
          <CardDescription>Monitor gas price provider status</CardDescription>
        </CardHeader>
        <CardContent className="flex h-64 items-center justify-center text-muted-foreground">
          <Activity className="mr-2 h-5 w-5" />
          No provider data available
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">Gas Provider Health</CardTitle>
            <CardDescription className="text-sm">Monitor gas price provider status</CardDescription>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span className="text-sm font-medium">{data.meta.healthyCount}</span>
              </div>
              <span className="text-xs text-muted-foreground">Healthy</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-yellow-500" />
              <span className="text-sm font-medium">{data.meta.degradedCount}</span>
              <span className="text-xs text-muted-foreground">Degraded</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-red-500" />
              <span className="text-sm font-medium">{data.meta.unhealthyCount}</span>
              <span className="text-xs text-muted-foreground">Unhealthy</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.data.map((provider) => {
            const config = STATUS_CONFIG[provider.status];
            const StatusIcon = config.icon;

            return (
              <div
                key={provider.provider}
                className={cn('rounded-lg border p-4', config.bgColor, config.borderColor)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={cn('rounded-full p-2', config.bgColor)}>
                      <StatusIcon className={cn('h-4 w-4', config.color)} />
                    </div>
                    <div>
                      <p className="font-semibold capitalize">{provider.provider}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant="outline" className={cn(config.borderColor, config.color)}>
                          {config.label}
                        </Badge>
                        {provider.consecutiveFailures > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {provider.consecutiveFailures} failures
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatLatency(provider.avgLatencyMs)}
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Success Rate</p>
                    <p
                      className={cn(
                        'text-sm font-semibold',
                        provider.successRate >= 90
                          ? 'text-emerald-600'
                          : provider.successRate >= 70
                            ? 'text-yellow-600'
                            : 'text-red-600',
                      )}
                    >
                      {formatPercentValue(provider.successRate, 1)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Requests</p>
                    <p className="text-sm font-semibold">{provider.totalRequests}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Successes</p>
                    <p className="text-sm font-semibold text-emerald-600">
                      {provider.totalSuccesses}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Failures</p>
                    <p className="text-sm font-semibold text-red-600">{provider.totalFailures}</p>
                  </div>
                </div>

                <div className="mt-3 border-t pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">
                      Last Success: {new Date(provider.lastSuccessTime).toLocaleString()}
                    </span>
                    {provider.lastFailureTime && (
                      <span className="text-red-600">
                        Last Failure: {new Date(provider.lastFailureTime).toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
