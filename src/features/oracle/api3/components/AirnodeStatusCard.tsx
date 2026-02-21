'use client';

import { useState, useMemo } from 'react';

import { Activity, Clock, Server, Zap, Calendar, TrendingUp } from 'lucide-react';

import { Badge, StatusBadge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

import { AirnodeOfflineEvents } from './AirnodeOfflineEvents';
import { AirnodeUptimeChart } from './AirnodeUptimeChart';

import type {
  Airnode,
  TimePeriod,
  AirnodeHistoryData,
  UptimeTrendPoint,
  OfflineEvent,
} from '../types/api3';

interface AirnodeStatusCardProps {
  airnode: Airnode;
  historyData?: AirnodeHistoryData;
  className?: string;
}

export function AirnodeStatusCard({ airnode, historyData, className }: AirnodeStatusCardProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState('status');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('week');

  const formatAddress = (address: string | undefined | null) => {
    if (!address) return '-';
    if (address.length <= 12) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getResponseTimeColor = (ms: number) => {
    if (ms < 100) return 'text-green-500';
    if (ms < 300) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getUptimeColor = (percentage: number) => {
    if (percentage >= 99) return 'text-green-500';
    if (percentage >= 95) return 'text-yellow-500';
    return 'text-red-500';
  };

  const mockHistoryData = useMemo((): AirnodeHistoryData => {
    if (historyData) return historyData;

    const now = new Date();
    const points: UptimeTrendPoint[] = [];
    const events: OfflineEvent[] = [];

    let pointCount;
    let intervalMs;
    if (timePeriod === 'day') {
      pointCount = 24;
      intervalMs = 60 * 60 * 1000;
    } else if (timePeriod === 'week') {
      pointCount = 14;
      intervalMs = 12 * 60 * 60 * 1000;
    } else {
      pointCount = 30;
      intervalMs = 24 * 60 * 60 * 1000;
    }

    for (let i = pointCount - 1; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * intervalMs);
      const baseUptime = 98.5;
      const variance = Math.random() * 3;
      const uptime = Math.min(
        100,
        Math.max(90, baseUptime + (Math.random() > 0.5 ? variance : -variance)),
      );
      const responseTime = 50 + Math.random() * 250;

      points.push({
        timestamp: timestamp.toISOString(),
        uptimePercentage: uptime,
        responseTimeMs: Math.round(responseTime),
      });
    }

    if (Math.random() > 0.3) {
      const eventCount = Math.floor(Math.random() * 3) + 1;
      for (let i = 0; i < eventCount; i++) {
        const eventStart = new Date(now.getTime() - Math.random() * 7 * 24 * 60 * 60 * 1000);
        const durationMs = Math.floor(Math.random() * 3600000) + 60000;
        const eventEnd = new Date(eventStart.getTime() + durationMs);

        events.push({
          id: `offline-${i}`,
          startTime: eventStart.toISOString(),
          endTime: eventEnd.toISOString(),
          durationMs,
          reason: Math.random() > 0.5 ? '网络连接中断' : undefined,
        });
      }
    }

    return {
      timePeriod,
      uptimeTrend: points,
      offlineEvents: events.sort(
        (a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      ),
      totalUptimePercentage: 98.7,
      totalOfflineDurationMs: events.reduce((sum, e) => sum + e.durationMs, 0),
      offlineEventCount: events.length,
    };
  }, [historyData, timePeriod]);

  return (
    <Card className={cn('transition-all hover:shadow-lg', className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4 text-primary" />
            {t('api3.airnode.title')}
          </CardTitle>
          <StatusBadge
            status={airnode.status === 'online' ? 'online' : 'offline'}
            text={airnode.status === 'online' ? t('common.online') : t('common.offline')}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="status" className="flex items-center gap-1.5">
              <Activity className="h-4 w-4" />
              {t('api3.airnode.status') || '状态'}
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4" />
              {t('api3.airnode.history') || '历史性能'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="status" className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('api3.airnode.address')}</p>
                <p className="font-mono text-sm font-medium">
                  {formatAddress(airnode.airnodeAddress)}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">{t('api3.airnode.chain')}</p>
                <Badge variant="secondary" className="text-xs">
                  {airnode.chain}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{t('api3.airnode.responseTime')}</p>
                </div>
                <p
                  className={cn(
                    'mt-1 text-lg font-bold',
                    getResponseTimeColor(airnode.responseTimeMs),
                  )}
                >
                  {airnode.responseTimeMs}ms
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{t('api3.airnode.uptime')}</p>
                </div>
                <p
                  className={cn('mt-1 text-lg font-bold', getUptimeColor(airnode.uptimePercentage))}
                >
                  {airnode.uptimePercentage.toFixed(2)}%
                </p>
              </div>

              <div className="rounded-lg bg-muted/50 p-3">
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-xs text-muted-foreground">{t('api3.airnode.lastSeen')}</p>
                </div>
                <p className="mt-1 text-sm font-medium">{formatTime(airnode.lastSeenAt)}</p>
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('api3.airnode.endpointId')}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {formatAddress(airnode.endpointId)}
              </p>
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">{t('api3.airnode.sponsor')}</p>
              <p className="font-mono text-xs text-muted-foreground">
                {formatAddress(airnode.sponsorAddress)}
              </p>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {t('api3.airnode.timePeriod') || '时间周期'}
                </span>
              </div>
              <div className="flex gap-2">
                <Badge
                  variant={timePeriod === 'day' ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => setTimePeriod('day')}
                >
                  {t('api3.airnode.day') || '天'}
                </Badge>
                <Badge
                  variant={timePeriod === 'week' ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => setTimePeriod('week')}
                >
                  {t('api3.airnode.week') || '周'}
                </Badge>
                <Badge
                  variant={timePeriod === 'month' ? 'default' : 'secondary'}
                  className="cursor-pointer"
                  onClick={() => setTimePeriod('month')}
                >
                  {t('api3.airnode.month') || '月'}
                </Badge>
              </div>
            </div>

            <AirnodeUptimeChart
              uptimeTrend={mockHistoryData.uptimeTrend}
              timePeriod={timePeriod}
              className="w-full"
            />

            <AirnodeOfflineEvents
              offlineEvents={mockHistoryData.offlineEvents}
              className="w-full"
            />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
