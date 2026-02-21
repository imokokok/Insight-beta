'use client';

import { AlertCircle, Clock, Calendar } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useI18n } from '@/i18n';

import type { OfflineEvent } from '../types/api3';

interface AirnodeOfflineEventsProps {
  offlineEvents: OfflineEvent[];
  className?: string;
}

export function AirnodeOfflineEvents({ offlineEvents, className }: AirnodeOfflineEventsProps) {
  const { t } = useI18n();

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}天 ${hours % 24}小时`;
    if (hours > 0) return `${hours}小时 ${minutes % 60}分钟`;
    if (minutes > 0) return `${minutes}分钟 ${seconds % 60}秒`;
    return `${seconds}秒`;
  };

  const totalOfflineDuration = offlineEvents.reduce((acc, event) => acc + event.durationMs, 0);

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              {t('api3.airnode.offlineEvents') || '离线事件记录'}
            </CardTitle>
            <CardDescription>
              {t('api3.airnode.offlineEventsDescription') || 'Airnode 离线事件的历史记录'}
            </CardDescription>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-muted-foreground">总离线时长</p>
              <p className="text-lg font-bold text-red-500">
                {formatDuration(totalOfflineDuration)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">事件数量</p>
              <p className="text-lg font-bold">
                {offlineEvents.length}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {offlineEvents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              {t('api3.airnode.noOfflineEvents') || '暂无离线事件记录'}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {offlineEvents.map((event) => (
              <div
                key={event.id}
                className="flex items-start gap-4 p-4 rounded-lg border bg-muted/30"
              >
                <div className="mt-1">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="destructive" className="text-xs">
                      {t('api3.airnode.offline') || '离线'}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {formatDuration(event.durationMs)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {new Date(event.startTime).toLocaleString()}
                      </span>
                      <span className="text-muted-foreground">→</span>
                      <span className="text-muted-foreground">
                        {new Date(event.endTime).toLocaleString()}
                      </span>
                    </div>
                    {event.reason && (
                      <p className="text-xs text-muted-foreground">
                        {event.reason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
