'use client';

import { useState, useMemo } from 'react';

import {
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Info,
  Filter,
  RefreshCw,
  Mail,
  Webhook,
  MessageSquare,
  Bell,
  AlertOctagon
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useI18n } from '@/i18n';
import type { AlertHistoryRecord, ChannelHealthStatus } from '@/server/alerts/notificationManager';
import type { AlertSeverity, NotificationChannel } from '@/server/alerts/notifications/types';

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export interface AlertHistoryProps {
  alerts: AlertHistoryRecord[];
  channelHealth: ChannelHealthStatus[];
  onRefresh: () => Promise<void>;
  onAcknowledge: (alertId: string) => Promise<void>;
  loading?: boolean;
  className?: string;
}

/**
 * 告警历史记录组件
 * 
 * 显示告警历史、渠道健康状态和确认功能
 */
export function AlertHistory({
  alerts,
  channelHealth,
  onRefresh,
  onAcknowledge,
  loading,
  className,
}: AlertHistoryProps) {
  const { t } = useI18n();
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'all'>('all');
  const [filterProtocol, setFilterProtocol] = useState('');
  const [filterSymbol, setFilterSymbol] = useState('');
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);

  const filteredAlerts = useMemo(() => {
    return alerts.filter(alert => {
      if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
      if (filterProtocol && alert.protocol !== filterProtocol) return false;
      if (filterSymbol && !alert.symbol?.toLowerCase().includes(filterSymbol.toLowerCase())) return false;
      return true;
    });
  }, [alerts, filterSeverity, filterProtocol, filterSymbol]);

  const stats = useMemo(() => {
    const total = alerts.length;
    const acknowledged = alerts.filter(a => a.acknowledged).length;
    const pending = total - acknowledged;
    const critical = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;
    
    return { total, acknowledged, pending, critical };
  }, [alerts]);

  const handleAcknowledge = async (alertId: string) => {
    setAcknowledging(alertId);
    try {
      await onAcknowledge(alertId);
    } finally {
      setAcknowledging(null);
    }
  };

  const toggleExpand = (alertId: string) => {
    setExpandedAlertId(prev => prev === alertId ? null : alertId);
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return <AlertOctagon className="h-5 w-5 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-500" />;
      default:
        return <Info className="h-5 w-5" />;
    }
  };

  const getSeverityColor = (severity: AlertSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'info':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getChannelIcon = (channel: NotificationChannel) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-4 w-4" />;
      case 'webhook':
        return <Webhook className="h-4 w-4" />;
      case 'slack':
        return <MessageSquare className="h-4 w-4" />;
      case 'telegram':
        return <Bell className="h-4 w-4" />;
      case 'pagerduty':
        return <AlertOctagon className="h-4 w-4" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{t('alerts.history.title')}</CardTitle>
            <CardDescription>{t('alerts.history.description')}</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', loading && 'animate-spin')} />
            {t('common.refresh')}
          </Button>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-4 gap-4 mt-4">
          <div className="bg-muted rounded-lg p-3">
            <p className="text-muted-foreground text-sm">{t('alerts.stats.total')}</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-muted-foreground text-sm">{t('alerts.stats.pending')}</p>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-muted-foreground text-sm">{t('alerts.stats.acknowledged')}</p>
            <p className="text-2xl font-bold text-emerald-600">{stats.acknowledged}</p>
          </div>
          <div className="bg-muted rounded-lg p-3">
            <p className="text-muted-foreground text-sm">{t('alerts.stats.critical')}</p>
            <p className="text-2xl font-bold text-red-600">{stats.critical}</p>
          </div>
        </div>

        {/* 渠道健康状态 */}
        <div className="mt-4">
          <h4 className="text-sm font-medium mb-2">{t('alerts.channelHealth.title')}</h4>
          <div className="flex flex-wrap gap-2">
            {channelHealth.map((health) => (
              <Badge
                key={health.channel}
                variant={health.isHealthy ? 'default' : 'destructive'}
                className="gap-1"
              >
                {getChannelIcon(health.channel)}
                <span className="capitalize">{health.channel}</span>
                {health.isHealthy ? (
                  <CheckCircle2 className="h-3 w-3 ml-1" />
                ) : (
                  <XCircle className="h-3 w-3 ml-1" />
                )}
              </Badge>
            ))}
          </div>
        </div>

        {/* 过滤器 */}
        <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Label className="text-sm">{t('alerts.filters.severity')}</Label>
            <Select value={filterSeverity} onValueChange={(v) => setFilterSeverity(v as AlertSeverity | 'all')}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('alerts.filters.all')}</SelectItem>
                <SelectItem value="critical">{t('alerts.severityLabels.critical')}</SelectItem>
                <SelectItem value="warning">{t('alerts.severityLabels.warning')}</SelectItem>
                <SelectItem value="info">{t('alerts.severityLabels.info')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">{t('alerts.filters.protocol')}</Label>
            <Input
              value={filterProtocol}
              onChange={(e) => setFilterProtocol(e.target.value)}
              placeholder={t('alerts.filters.protocolPlaceholder')}
              className="w-40"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">{t('alerts.filters.symbol')}</Label>
            <Input
              value={filterSymbol}
              onChange={(e) => setFilterSymbol(e.target.value)}
              placeholder={t('alerts.filters.symbolPlaceholder')}
              className="w-40"
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <ScrollArea className="h-[500px]">
          <div className="space-y-2">
            {filteredAlerts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {t('alerts.history.noAlerts')}
              </div>
            ) : (
              filteredAlerts.map((alert) => {
                const isExpanded = expandedAlertId === alert.id;
                return (
                  <div
                    key={alert.id}
                    className={cn(
                      'border rounded-lg p-4 transition-colors cursor-pointer',
                      alert.acknowledged ? 'bg-muted/50' : 'bg-card',
                      alert.severity === 'critical' && !alert.acknowledged && 'border-red-200 bg-red-50/50'
                    )}
                    onClick={() => toggleExpand(alert.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {getSeverityIcon(alert.severity)}
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium">{alert.title}</h4>
                            <Badge
                              variant="outline"
                              className={cn('text-xs', getSeverityColor(alert.severity))}
                            >
                              {alert.severity}
                            </Badge>
                            {alert.acknowledged && (
                              <Badge variant="secondary" className="text-xs">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                {t('alerts.history.acknowledged')}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {alert.message}
                          </p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatTime(alert.timestamp)}
                            </span>
                            {alert.protocol && (
                              <span>{t('alerts.history.protocol')}: {alert.protocol}</span>
                            )}
                            {alert.chain && (
                              <span>{t('alerts.history.chain')}: {alert.chain}</span>
                            )}
                            {alert.symbol && (
                              <span>{t('alerts.history.symbol')}: {alert.symbol}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {!alert.acknowledged && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAcknowledge(alert.alertId)}
                            disabled={acknowledging === alert.alertId}
                          >
                            {acknowledging === alert.alertId ? (
                              <RefreshCw className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                            <span className="ml-1">{t('alerts.history.acknowledge')}</span>
                          </Button>
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 pt-4 border-t">
                        <h5 className="text-sm font-medium mb-2">
                          {t('alerts.history.channelResults')}
                        </h5>
                        <div className="space-y-2">
                          {alert.results.map((result, idx) => (
                            <div
                              key={idx}
                              className="flex items-center justify-between text-sm"
                            >
                              <div className="flex items-center gap-2">
                                {getChannelIcon(result.channel)}
                                <span className="capitalize">{result.channel}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                {result.success ? (
                                  <Badge variant="default" className="text-xs">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    {t('alerts.history.success')}
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="text-xs">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    {t('alerts.history.failed')}
                                  </Badge>
                                )}
                                <span className="text-muted-foreground text-xs">
                                  {result.durationMs}ms
                                </span>
                                {result.error && (
                                  <span className="text-red-500 text-xs">
                                    {result.error}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {alert.acknowledged && (
                          <div className="mt-4 text-sm text-muted-foreground">
                            <p>
                              {t('alerts.history.acknowledgedBy')}: {alert.acknowledgedBy}
                            </p>
                            <p>
                              {t('alerts.history.acknowledgedAt')}:{' '}
                              {alert.acknowledgedAt && formatTime(alert.acknowledgedAt)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
