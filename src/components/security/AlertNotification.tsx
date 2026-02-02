'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, AlertTriangle, AlertCircle, Shield, ExternalLink, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ManipulationDetection } from '@/lib/types/security/manipulation';

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
  const [isEnabled, setIsEnabled] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);

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

    setUnreadCount((prev) => prev + 1);

    if (detection.severity === 'critical') {
      playAlertSound();
    }
  }, []);

  const removeAlert = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
    setUnreadCount(0);
  }, []);

  const playAlertSound = () => {
    try {
      const audio = new Audio('/sounds/alert.mp3');
      audio.volume = 0.5;
      audio.play().catch(() => {});
    } catch {
      // Ignore audio play errors
    }
  };

  useEffect(() => {
    if (!isEnabled) return;

    const eventSource = new EventSource('/api/security/alerts/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'detection') {
          addAlert(data.detection);
        }
      } catch (error) {
        console.error('Failed to parse alert:', error);
      }
    };

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [isEnabled, addAlert]);

  useEffect(() => {
    const interval = setInterval(() => {
      setAlerts((prev) =>
        prev.filter((alert) => Date.now() - alert.timestamp < 30000)
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md',
        className
      )}
    >
      <AnimatePresence>
        {alerts.map((alert, index) => {
          const { detection } = alert;
          const severity = severityConfig[detection.severity];
          const SeverityIcon = severity.icon;
          const isNew = Date.now() - alert.timestamp < 5000;

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card
                className={cn(
                  'p-4 border-l-4 shadow-lg',
                  severity.borderColor,
                  isNew && 'animate-pulse'
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('p-2 rounded-lg', severity.bgColor)}>
                    <SeverityIcon className={cn('h-5 w-5', severity.textColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm">
                        {typeLabels[detection.type]}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn('text-xs', severity.textColor)}
                      >
                        {detection.severity}
                      </Badge>
                      {isNew && (
                        <Badge variant="secondary" className="text-xs">
                          NEW
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {detection.protocol} · {detection.symbol} · {detection.chain}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {(detection.confidenceScore * 100).toFixed(0)}% 置信度
                      </Badge>
                      {detection.priceImpact && (
                        <span
                          className={cn(
                            'text-xs',
                            detection.priceImpact > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          )}
                        >
                          {detection.priceImpact > 0 ? '+' : ''}
                          {detection.priceImpact.toFixed(2)}%
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        asChild
                      >
                        <a href={`/security/manipulation/${detection.id}`}>
                          <ExternalLink className="h-3 w-3 mr-1" />
                          查看详情
                        </a>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => removeAlert(alert.id)}
                      >
                        忽略
                      </Button>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 -mt-1 -mr-1"
                    onClick={() => removeAlert(alert.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-end"
        >
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={clearAllAlerts}
          >
            清除全部 ({alerts.length})
          </Button>
        </motion.div>
      )}
    </div>
  );
}

export function AlertNotificationBadge({
  onClick,
}: {
  onClick?: () => void;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await fetch('/api/security/alerts/unread-count');
        if (response.ok) {
          const data = await response.json();
          setCount(data.count);
        }
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={onClick}
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Button>
  );
}
