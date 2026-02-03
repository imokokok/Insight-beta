'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, AlertTriangle, AlertCircle, Shield, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ManipulationDetection } from '@/lib/types/security/detection';

interface AlertNotificationProps {
  className?: string;
}

interface AlertItem {
  id: string;
  detection: ManipulationDetection;
  timestamp: number;
}

const severityConfig = {
  critical: {
    color: 'bg-red-500',
    borderColor: 'border-red-500',
    textColor: 'text-red-500',
    bgColor: 'bg-red-50',
    icon: AlertTriangle,
  },
  high: {
    color: 'bg-orange-500',
    borderColor: 'border-orange-500',
    textColor: 'text-orange-500',
    bgColor: 'bg-orange-50',
    icon: AlertCircle,
  },
  medium: {
    color: 'bg-yellow-500',
    borderColor: 'border-yellow-500',
    textColor: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    icon: AlertCircle,
  },
  low: {
    color: 'bg-blue-500',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-500',
    bgColor: 'bg-blue-50',
    icon: Shield,
  },
};

const typeLabels: Record<string, string> = {
  flash_loan_attack: '闪电贷攻击',
  price_manipulation: '价格操纵',
  oracle_manipulation: '预言机操纵',
  sandwich_attack: '三明治攻击',
  front_running: '抢先交易',
  back_running: '尾随交易',
  liquidity_manipulation: '流动性操纵',
  statistical_anomaly: '统计异常',
};

export function AlertNotification({ className }: AlertNotificationProps) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);

  const addAlert = useCallback((detection: ManipulationDetection) => {
    const newAlert: AlertItem = {
      id: detection.id,
      detection,
      timestamp: Date.now(),
    };

    setAlerts((prev) => {
      const filtered = prev.filter((a) => a.id !== detection.id);
      return [newAlert, ...filtered].slice(0, 5);
    });

    // Play sound for critical alerts
    if (detection.severity === 'critical') {
      try {
        const audio = new Audio('/sounds/alert.mp3');
        audio.volume = 0.5;
        audio.play().catch(() => {
          // Ignore autoplay errors
        });
      } catch {
        // Ignore audio errors
      }
    }
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  useEffect(() => {
    // Connect to SSE endpoint
    const eventSource = new EventSource('/api/security/alerts/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'detection' && data.detection) {
          addAlert(data.detection as ManipulationDetection);
        }
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      // Connection error, will retry automatically
    };

    return () => {
      eventSource.close();
    };
  }, [addAlert]);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className={cn('fixed right-4 top-4 z-50 w-96 space-y-2', className)}>
      {alerts.map((alert, index) => {
        const detection = alert.detection;
        const config = severityConfig[detection.severity];
        const Icon = config.icon;

        return (
          <div
            key={alert.id}
            className={cn(
              'transform transition-all duration-300 ease-out',
              'translate-x-0 opacity-100',
            )}
            style={{
              transitionDelay: `${index * 50}ms`,
            }}
          >
            <Card
              className={cn(
                'overflow-hidden border-l-4 shadow-lg',
                config.borderColor,
                config.bgColor,
              )}
            >
              <div className="p-4">
                <div className="flex items-start gap-3">
                  <div className={cn('rounded-full p-2', config.color)}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">
                        {typeLabels[detection.type] || detection.type}
                      </h4>
                      <Badge variant="outline" className={cn('text-xs', config.textColor)}>
                        {detection.severity === 'critical'
                          ? '严重'
                          : detection.severity === 'high'
                            ? '高危'
                            : detection.severity === 'medium'
                              ? '中危'
                              : '低危'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs">
                      {detection.protocol}:{detection.chain}:{detection.symbol}
                    </p>
                    <p className="mt-1 text-xs">
                      置信度: {(detection.confidenceScore * 100).toFixed(1)}%
                    </p>
                    {detection.priceImpact && (
                      <p className="mt-1 text-xs">
                        价格影响: {detection.priceImpact > 0 ? '+' : ''}
                        {detection.priceImpact.toFixed(2)}%
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <a
                        href={`/security/manipulation/${detection.id}`}
                        className="ring-offset-background focus-visible:ring-ring border-input bg-background hover:bg-accent hover:text-accent-foreground inline-flex h-7 items-center justify-center rounded-md border px-3 text-sm text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        查看详情
                      </a>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => removeAlert(alert.id)}
                      >
                        <X className="mr-1 h-3 w-3" />
                        忽略
                      </Button>
                    </div>
                  </div>
                  <button
                    onClick={() => removeAlert(alert.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div
                className={cn('h-1', config.color)}
                style={{
                  animation: 'progress 30s linear forwards',
                }}
              />
            </Card>
          </div>
        );
      })}
      <style jsx>{`
        @keyframes progress {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }
      `}</style>
    </div>
  );
}
