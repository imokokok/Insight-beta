'use client';

import { Activity, Clock, Server, Zap } from 'lucide-react';

import { Badge, StatusBadge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

import type { Airnode } from '../types/api3';

interface AirnodeStatusCardProps {
  airnode: Airnode;
  className?: string;
}

export function AirnodeStatusCard({ airnode, className }: AirnodeStatusCardProps) {
  const { t } = useI18n();

  const formatAddress = (address: string) => {
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
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">{t('api3.airnode.address')}</p>
            <p className="font-mono text-sm font-medium">{formatAddress(airnode.airnodeAddress)}</p>
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
              className={cn('mt-1 text-lg font-bold', getResponseTimeColor(airnode.responseTimeMs))}
            >
              {airnode.responseTimeMs}ms
            </p>
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-1.5">
              <Activity className="h-3.5 w-3.5 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">{t('api3.airnode.uptime')}</p>
            </div>
            <p className={cn('mt-1 text-lg font-bold', getUptimeColor(airnode.uptimePercentage))}>
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
      </CardContent>
    </Card>
  );
}
