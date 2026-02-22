'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

import {
  RefreshCw,
  AlertTriangle,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  Timer,
} from 'lucide-react';

import { ContentSection, ContentGrid } from '@/components/common';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { useI18n } from '@/i18n';
import { formatTime, cn, fetchApiData } from '@/shared/utils';

import type { HeartbeatStats, HeartbeatAlert } from '../types/chainlink';

interface StatItemProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  colorClass: string;
}

function StatItem({ title, value, icon, colorClass }: StatItemProps) {
  return (
    <div className="flex items-center gap-4 rounded-lg border border-border/30 bg-muted/20 p-4">
      <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', colorClass)}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{title}</p>
        <p className="text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function getStatusBadgeVariant(status: HeartbeatAlert['status']) {
  switch (status) {
    case 'active':
      return 'success';
    case 'timeout':
      return 'warning';
    case 'critical':
      return 'destructive';
    default:
      return 'secondary';
  }
}

function getStatusLabel(status: HeartbeatAlert['status'], t: (key: string) => string) {
  switch (status) {
    case 'active':
      return t('chainlink.heartbeat.status.active') || '活跃';
    case 'timeout':
      return t('chainlink.heartbeat.status.timeout') || '超时';
    case 'critical':
      return t('chainlink.heartbeat.status.critical') || '严重超时';
    default:
      return status;
  }
}

function calculateTimeoutDuration(lastUpdate: string): number {
  const lastUpdateTime = new Date(lastUpdate).getTime();
  const now = Date.now();
  return Math.floor((now - lastUpdateTime) / 1000);
}

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(seconds / 3600);
  const remainingMinutes = Math.floor((seconds % 3600) / 60);
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function sortAlertsBySeverity(alerts: HeartbeatAlert[]): HeartbeatAlert[] {
  const severityOrder = { critical: 0, timeout: 1, active: 2 };
  return [...alerts].sort((a, b) => severityOrder[a.status] - severityOrder[b.status]);
}

interface HeartbeatMonitorProps {
  collapsible?: boolean;
  className?: string;
}

export function HeartbeatMonitor({ collapsible = false, className }: HeartbeatMonitorProps) {
  const { t } = useI18n();
  const [stats, setStats] = useState<HeartbeatStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await fetchApiData<HeartbeatStats>('/api/oracle/chainlink/heartbeat');
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch heartbeat data');
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedAlerts = useMemo(() => {
    if (!stats?.alerts) return [];
    return sortAlertsBySeverity(stats.alerts);
  }, [stats?.alerts]);

  if (isLoading) {
    return (
      <div className={className}>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className={className}>
        <div className="flex flex-col items-center justify-center gap-4 py-12">
          <AlertTriangle className="h-12 w-12 text-amber-500" />
          <div className="text-center">
            <p className="font-medium text-foreground">{t('common.error') || '加载数据失败'}</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.retry') || '重试'}
          </Button>
        </div>
      </div>
    );
  }

  const renderStats = () => (
    <ContentGrid columns={4}>
      <StatItem
        title={t('chainlink.heartbeat.stats.totalFeeds') || '总 Feed 数'}
        value={stats.totalFeeds}
        icon={<Activity className="h-6 w-6 text-blue-600" />}
        colorClass="bg-blue-100 dark:bg-blue-900"
      />
      <StatItem
        title={t('chainlink.heartbeat.stats.activeFeeds') || '活跃数'}
        value={stats.activeFeeds}
        icon={<CheckCircle className="h-6 w-6 text-green-600" />}
        colorClass="bg-green-100 dark:bg-green-900"
      />
      <StatItem
        title={t('chainlink.heartbeat.stats.timeoutFeeds') || '超时数'}
        value={stats.timeoutFeeds}
        icon={<Timer className="h-6 w-6 text-yellow-600" />}
        colorClass="bg-yellow-100 dark:bg-yellow-900"
      />
      <StatItem
        title={t('chainlink.heartbeat.stats.criticalFeeds') || '严重超时数'}
        value={stats.criticalFeeds}
        icon={<XCircle className="h-6 w-6 text-red-600" />}
        colorClass="bg-red-100 dark:bg-red-900"
      />
    </ContentGrid>
  );

  const renderAlerts = () => {
    if (sortedAlerts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
          <CheckCircle className="h-12 w-12 text-green-500" />
          <p>{t('chainlink.heartbeat.noAlerts') || '暂无告警，所有 Feed 正常运行'}</p>
        </div>
      );
    }

    return (
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('chainlink.heartbeat.feedName') || 'Feed 名称'}</TableHead>
              <TableHead>{t('chainlink.heartbeat.chain') || '链'}</TableHead>
              <TableHead>{t('chainlink.heartbeat.heartbeat') || '心跳间隔'}</TableHead>
              <TableHead>{t('chainlink.heartbeat.lastUpdate') || '最后更新'}</TableHead>
              <TableHead>{t('chainlink.heartbeat.timeoutDuration') || '超时时长'}</TableHead>
              <TableHead>{t('chainlink.heartbeat.status') || '状态'}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedAlerts.map((alert, index) => {
              const timeoutDuration = calculateTimeoutDuration(alert.lastUpdate);
              return (
                <TableRow key={`${alert.feedName}-${alert.chain}-${index}`}>
                  <TableCell className="font-medium">
                    <div>
                      <div>{alert.feedName}</div>
                      <div className="text-xs text-muted-foreground">{alert.pair}</div>
                    </div>
                  </TableCell>
                  <TableCell>{alert.chain || '-'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      {alert.heartbeat}s
                    </div>
                  </TableCell>
                  <TableCell>{formatTime(alert.lastUpdate)}</TableCell>
                  <TableCell>
                    <span
                      className={cn(
                        'font-mono',
                        alert.status === 'critical' && 'text-red-600 dark:text-red-400',
                        alert.status === 'timeout' && 'text-yellow-600 dark:text-yellow-400',
                      )}
                    >
                      {formatDuration(timeoutDuration)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(alert.status)}>
                      {getStatusLabel(alert.status, t)}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  };

  if (collapsible) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex items-center justify-end gap-2">
          <span className="text-xs text-muted-foreground">
            {t('common.lastUpdated') || '最后更新'}: {formatTime(stats.generatedAt)}
          </span>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('common.refresh') || '刷新'}
          </Button>
        </div>

        {renderStats()}

        <div className="rounded-lg border border-border/30 bg-muted/20 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <span className="font-medium">{t('chainlink.heartbeat.alerts') || '告警列表'}</span>
          </div>
          {renderAlerts()}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      <ContentSection
        title={t('chainlink.heartbeat.title') || '心跳监控'}
        description={t('chainlink.heartbeat.description') || '监控 Chainlink 数据 Feed 的心跳状态'}
        action={
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {t('common.lastUpdated') || '最后更新'}: {formatTime(stats.generatedAt)}
            </span>
            <Button variant="outline" size="sm" onClick={fetchData}>
              <RefreshCw className="mr-2 h-4 w-4" />
              {t('common.refresh') || '刷新'}
            </Button>
          </div>
        }
      >
        <ContentGrid columns={4}>
          <StatItem
            title={t('chainlink.heartbeat.stats.totalFeeds') || '总 Feed 数'}
            value={stats.totalFeeds}
            icon={<Activity className="h-6 w-6 text-blue-600" />}
            colorClass="bg-blue-100 dark:bg-blue-900"
          />
          <StatItem
            title={t('chainlink.heartbeat.stats.activeFeeds') || '活跃数'}
            value={stats.activeFeeds}
            icon={<CheckCircle className="h-6 w-6 text-green-600" />}
            colorClass="bg-green-100 dark:bg-green-900"
          />
          <StatItem
            title={t('chainlink.heartbeat.stats.timeoutFeeds') || '超时数'}
            value={stats.timeoutFeeds}
            icon={<Timer className="h-6 w-6 text-yellow-600" />}
            colorClass="bg-yellow-100 dark:bg-yellow-900"
          />
          <StatItem
            title={t('chainlink.heartbeat.stats.criticalFeeds') || '严重超时数'}
            value={stats.criticalFeeds}
            icon={<XCircle className="h-6 w-6 text-red-600" />}
            colorClass="bg-red-100 dark:bg-red-900"
          />
        </ContentGrid>
      </ContentSection>

      <ContentSection
        title={
          <span className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {t('chainlink.heartbeat.alerts') || '告警列表'}
          </span>
        }
      >
        {sortedAlerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 text-green-500" />
            <p>{t('chainlink.heartbeat.noAlerts') || '暂无告警，所有 Feed 正常运行'}</p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('chainlink.heartbeat.feedName') || 'Feed 名称'}</TableHead>
                  <TableHead>{t('chainlink.heartbeat.chain') || '链'}</TableHead>
                  <TableHead>{t('chainlink.heartbeat.heartbeat') || '心跳间隔'}</TableHead>
                  <TableHead>{t('chainlink.heartbeat.lastUpdate') || '最后更新'}</TableHead>
                  <TableHead>{t('chainlink.heartbeat.timeoutDuration') || '超时时长'}</TableHead>
                  <TableHead>{t('chainlink.heartbeat.status') || '状态'}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedAlerts.map((alert, index) => {
                  const timeoutDuration = calculateTimeoutDuration(alert.lastUpdate);
                  return (
                    <TableRow key={`${alert.feedName}-${alert.chain}-${index}`}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{alert.feedName}</div>
                          <div className="text-xs text-muted-foreground">{alert.pair}</div>
                        </div>
                      </TableCell>
                      <TableCell>{alert.chain || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          {alert.heartbeat}s
                        </div>
                      </TableCell>
                      <TableCell>{formatTime(alert.lastUpdate)}</TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'font-mono',
                            alert.status === 'critical' && 'text-red-600 dark:text-red-400',
                            alert.status === 'timeout' && 'text-yellow-600 dark:text-yellow-400',
                          )}
                        >
                          {formatDuration(timeoutDuration)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(alert.status)}>
                          {getStatusLabel(alert.status, t)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </ContentSection>
    </div>
  );
}
