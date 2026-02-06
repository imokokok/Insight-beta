'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  timestamp: string;
}

interface AlertsPanelProps {
  className?: string;
}

const severityConfig = {
  critical: {
    badgeVariant: 'destructive' as const,
    borderColor: 'border-red-500/20',
    bgColor: 'bg-red-500/5',
    iconColor: 'text-red-600',
  },
  warning: {
    badgeVariant: 'default' as const,
    borderColor: 'border-yellow-500/20',
    bgColor: 'bg-yellow-500/5',
    iconColor: 'text-yellow-600',
  },
  info: {
    badgeVariant: 'secondary' as const,
    borderColor: 'border-blue-500/20',
    bgColor: 'bg-blue-500/5',
    iconColor: 'text-blue-600',
  },
};

export function AlertsPanel({ className }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/oracle/unified/alerts?status=open')
      .then((res) => res.json())
      .then((data) => {
        setAlerts(data);
        setLoading(false);
      })
      .catch((error) => {
        logger.error('Failed to fetch alerts', { error });
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Active Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-gray-100" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Active Alerts
          {alerts.length > 0 && (
            <Badge variant="secondary" className="ml-2">
              {alerts.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <CheckCircle className="mx-auto mb-4 h-12 w-12 opacity-50" />
            <p>No active alerts</p>
            <p className="mt-1 text-sm text-gray-400">All systems are running smoothly</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => {
              const config = severityConfig[alert.severity];
              return (
                <div
                  key={alert.id}
                  className={cn(
                    'rounded-lg border p-4 transition-all duration-200 hover:shadow-md',
                    config.borderColor,
                    config.bgColor,
                  )}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={config.badgeVariant}>{alert.severity}</Badge>
                        <span className="font-medium text-gray-900">{alert.title}</span>
                      </div>
                      <p className="mt-1 text-sm text-gray-600">{alert.message}</p>
                    </div>
                    <span className="whitespace-nowrap text-xs text-gray-400">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
