'use client';

import { useEffect, useState, useCallback } from 'react';

import {
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  CheckCircle2,
  Bell,
  Clock,
  Shield,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { logger } from '@/shared/logger';
import { cn, fetchApiData, formatTimeAgo } from '@/shared/utils';
import type { Alert, AlertSeverity, AlertStatus } from '@/types/oracle/alert';
import type { OracleProtocol } from '@/types/oracle/protocol';
import { PROTOCOL_DISPLAY_NAMES } from '@/types/oracle/protocol';

interface AlertPanelProps {
  protocols?: OracleProtocol[];
  maxAlerts?: number;
  className?: string;
  showAcknowledged?: boolean;
}

export function AlertPanel({
  protocols,
  maxAlerts = 50,
  className,
  showAcknowledged = false,
}: AlertPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AlertSeverity | 'all'>('all');

  const fetchAlerts = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (protocols?.length) params.set('protocols', protocols.join(','));
      params.set('limit', maxAlerts.toString());
      if (!showAcknowledged) params.set('status', 'open');

      const data = await fetchApiData<Alert[]>(`/api/oracle/alerts?${params.toString()}`);
      setAlerts(data);
    } catch {
      // 使用模拟数据
      setAlerts(generateMockAlerts());
    } finally {
      setLoading(false);
    }
  }, [protocols, maxAlerts, showAcknowledged]);

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 30000);
    return () => clearInterval(interval);
  }, [fetchAlerts]);

  const handleAcknowledge = async (alertId: string | number) => {
    try {
      await fetchApiData(`/api/oracle/alerts/${alertId}/acknowledge`, {
        method: 'POST',
      });
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: 'Acknowledged' as AlertStatus } : a)),
      );
    } catch (error: unknown) {
      logger.error('Failed to acknowledge alert', { error });
    }
  };

  const handleResolve = async (alertId: string | number) => {
    try {
      await fetchApiData(`/api/oracle/alerts/${alertId}/resolve`, {
        method: 'POST',
      });
      setAlerts((prev) =>
        prev.map((a) => (a.id === alertId ? { ...a, status: 'Resolved' as AlertStatus } : a)),
      );
    } catch (error: unknown) {
      logger.error('Failed to resolve alert', { error });
    }
  };

  const filteredAlerts = alerts.filter((alert) => filter === 'all' || alert.severity === filter);

  const alertCounts = {
    critical: alerts.filter((a) => a.severity === 'critical').length,
    warning: alerts.filter((a) => a.severity === 'warning').length,
    info: alerts.filter((a) => a.severity === 'info').length,
  };

  if (loading) {
    return <AlertPanelSkeleton className={className} />;
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="px-3 pb-2 sm:px-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base font-semibold sm:text-lg">Active Alerts</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex flex-wrap gap-1 sm:gap-2">
            <FilterBadge
              severity="critical"
              count={alertCounts.critical}
              active={filter === 'critical'}
              onClick={() => setFilter(filter === 'critical' ? 'all' : 'critical')}
            />
            <FilterBadge
              severity="warning"
              count={alertCounts.warning}
              active={filter === 'warning'}
              onClick={() => setFilter(filter === 'warning' ? 'all' : 'warning')}
            />
            <FilterBadge
              severity="info"
              count={alertCounts.info}
              active={filter === 'info'}
              onClick={() => setFilter(filter === 'info' ? 'all' : 'info')}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filteredAlerts.length === 0 ? (
          <div className="flex h-[200px] flex-col items-center justify-center p-4 text-center sm:h-[300px] sm:p-8">
            <div className="mb-3 rounded-full bg-green-50 p-3 sm:mb-4 sm:p-4">
              <CheckCircle2 className="h-6 w-6 text-green-500 sm:h-8 sm:w-8" />
            </div>
            <h3 className="text-base font-medium text-gray-900 sm:text-lg">All Clear</h3>
            <p className="text-xs text-muted-foreground sm:text-sm">
              No active alerts matching your filters
            </p>
          </div>
        ) : (
          <ScrollArea className="h-[300px] sm:h-[400px]">
            <div className="divide-y">
              {filteredAlerts.map((alert) => (
                <AlertItem
                  key={alert.id}
                  alert={alert}
                  onAcknowledge={() => handleAcknowledge(alert.id)}
                  onResolve={() => handleResolve(alert.id)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function AlertItem({
  alert,
  onAcknowledge,
  onResolve,
}: {
  alert: Alert;
  onAcknowledge: () => void;
  onResolve: () => void;
}) {
  const severityConfig = {
    critical: {
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
    },
    warning: {
      icon: AlertCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
    },
    info: {
      icon: Info,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
    },
  };

  const config = severityConfig[alert.severity];
  const Icon = config.icon;

  const isResolved = alert.status.toLowerCase() === 'resolved';
  const isAcknowledged = alert.status.toLowerCase() === 'acknowledged';

  return (
    <div
      className={cn(
        'relative p-2 transition-colors sm:p-4',
        config.bgColor,
        isResolved && 'opacity-60',
      )}
    >
      <div className="flex items-start gap-2 sm:gap-3">
        <div
          className={cn('mt-0.5 rounded-full p-1 sm:p-1.5', config.bgColor.replace('50', '100'))}
        >
          <Icon className={cn('h-3.5 w-3.5 sm:h-4 sm:w-4', config.color)} />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1 sm:gap-2">
            <div className="min-w-0 flex-1">
              <h4 className={cn('truncate text-sm font-medium sm:text-base', config.color)}>
                {alert.title}
              </h4>
              <p className="mt-0.5 line-clamp-2 text-xs text-gray-600 sm:text-sm">
                {alert.message}
              </p>
            </div>
            <div className="flex flex-shrink-0 gap-0.5 sm:gap-1">
              {!isResolved && !isAcknowledged && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  onClick={onAcknowledge}
                  title="Acknowledge"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              )}
              {!isResolved && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-7 sm:w-7"
                  onClick={onResolve}
                  title="Resolve"
                >
                  <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </Button>
              )}
            </div>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground sm:mt-2 sm:gap-2">
            {alert.protocol && (
              <Badge variant="secondary" className="text-xs">
                {PROTOCOL_DISPLAY_NAMES[alert.protocol]}
              </Badge>
            )}
            {alert.symbol && (
              <Badge variant="outline" className="text-xs">
                {alert.symbol}
              </Badge>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimeAgo(alert.createdAt)}
            </span>
            <span className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              {alert.occurrences}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterBadge({
  severity,
  count,
  active,
  onClick,
}: {
  severity: AlertSeverity;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  const colors = {
    critical: 'bg-red-100 text-red-700 hover:bg-red-200',
    warning: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200',
    info: 'bg-blue-100 text-blue-700 hover:bg-blue-200',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
        colors[severity],
        active && 'ring-2 ring-offset-1',
        active && severity === 'critical' && 'ring-red-400',
        active && severity === 'warning' && 'ring-yellow-400',
        active && severity === 'info' && 'ring-blue-400',
      )}
    >
      {severity.charAt(0).toUpperCase() + severity.slice(1)}: {count}
    </button>
  );
}

function AlertPanelSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-32" />
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-6 w-20 rounded-full" />
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[400px] space-y-0">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <div className="flex gap-2">
                  <Skeleton className="h-5 w-16 rounded-full" />
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 模拟数据生成器
function generateMockAlerts(): Alert[] {
  const severities: AlertSeverity[] = ['critical', 'warning', 'info'];
  const protocols: OracleProtocol[] = ['chainlink', 'pyth', 'uma', 'band', 'api3'];
  const symbols = ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD'];

  const alertTypes = [
    { title: 'Price Deviation Detected', message: 'Price deviation exceeded 2% threshold' },
    { title: 'Stale Price Feed', message: 'No price update received in the last 10 minutes' },
    { title: 'High Latency', message: 'Response time exceeded 5 seconds' },
    { title: 'Low Confidence Score', message: 'Confidence score dropped below 80%' },
    { title: 'Sync Error', message: 'Failed to sync with blockchain node' },
  ];

  return [...Array(8)].map((_, i) => {
    const type = alertTypes[Math.floor(Math.random() * alertTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)] ?? 'info';
    const protocol = protocols[Math.floor(Math.random() * protocols.length)] ?? 'chainlink';
    const symbol = symbols[Math.floor(Math.random() * symbols.length)] ?? 'ETH/USD';

    // Ensure type is defined (fallback to first alert type)
    const alertType = type ?? alertTypes[0] ?? { title: 'Alert', message: 'New alert' };

    return {
      id: i + 1,
      severity,
      title: alertType.title,
      message: alertType.message,
      protocol,
      symbol,
      status: Math.random() > 0.7 ? 'Acknowledged' : 'Open',
      occurrences: Math.floor(Math.random() * 10) + 1,
      firstSeenAt: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      lastSeenAt: new Date().toISOString(),
      createdAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });
}
