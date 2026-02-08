'use client';

import { useMemo } from 'react';

import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Globe,
  Layers,
  Shield,
  TrendingUp,
  Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

import { HealthScore } from './HealthScore';
import { KeyMetrics } from './KeyMetrics';

export interface ProtocolDetail {
  id: string;
  name: string;
  logo?: string;
  description?: string;
  website?: string;
  healthScore: number;
  latency: number;
  accuracy: number;
  uptime: number;
  activeFeeds: number;
  totalFeeds: number;
  supportedChains: string[];
  lastUpdate: Date;
  status: 'healthy' | 'degraded' | 'down';
  tvl?: number;
  marketShare?: number;
}

interface ProtocolDetailCardProps {
  protocol: ProtocolDetail | null;
  loading?: boolean;
  className?: string;
}

export function ProtocolDetailCard({ protocol, loading, className }: ProtocolDetailCardProps) {
  const { t } = useI18n();

  const statusConfig = useMemo(
    () => ({
      healthy: {
        color: 'bg-emerald-500',
        bgColor: 'bg-emerald-50',
        textColor: 'text-emerald-700',
        borderColor: 'border-emerald-200',
        icon: CheckCircle,
        label: t('protocol:status.healthy'),
      },
      degraded: {
        color: 'bg-amber-500',
        bgColor: 'bg-amber-50',
        textColor: 'text-amber-700',
        borderColor: 'border-amber-200',
        icon: AlertTriangle,
        label: t('protocol:status.degraded'),
      },
      down: {
        color: 'bg-rose-500',
        bgColor: 'bg-rose-50',
        textColor: 'text-rose-700',
        borderColor: 'border-rose-200',
        icon: Shield,
        label: t('protocol:status.down'),
      },
    }),
    [t]
  );

  if (loading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <Skeleton className="h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-24 w-full" />
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!protocol) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="bg-muted mb-4 flex h-16 w-16 items-center justify-center rounded-full">
            <Activity className="text-muted-foreground h-8 w-8" />
          </div>
          <p className="text-muted-foreground">{t('protocol:noData')}</p>
        </CardContent>
      </Card>
    );
  }

  const status = statusConfig[protocol.status];
  const StatusIcon = status.icon;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            {protocol.logo ? (
              <img
                src={protocol.logo}
                alt={protocol.name}
                className="h-16 w-16 rounded-xl object-contain"
              />
            ) : (
              <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-xl">
                <Layers className="text-primary h-8 w-8" />
              </div>
            )}
            <div>
              <CardTitle className="text-2xl">{protocol.name}</CardTitle>
              {protocol.description && (
                <p className="text-muted-foreground mt-1 text-sm">{protocol.description}</p>
              )}
              {protocol.website && (
                <a
                  href={protocol.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary mt-1 inline-flex items-center gap-1 text-sm hover:underline"
                >
                  <Globe className="h-3 w-3" />
                  {t('protocol:visitWebsite')}
                </a>
              )}
            </div>
          </div>
          <Badge
            variant="outline"
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5',
              status.bgColor,
              status.textColor,
              status.borderColor
            )}
          >
            <StatusIcon className="h-4 w-4" />
            {status.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Health Score */}
        <HealthScore score={protocol.healthScore} />

        {/* Key Metrics */}
        <KeyMetrics
          latency={protocol.latency}
          accuracy={protocol.accuracy}
          uptime={protocol.uptime}
          activeFeeds={protocol.activeFeeds}
          totalFeeds={protocol.totalFeeds}
        />

        {/* Active Feeds Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <Zap className="h-4 w-4" />
              {t('protocol:activeFeeds')}
            </span>
            <span className="font-medium">
              {protocol.activeFeeds} / {protocol.totalFeeds}
            </span>
          </div>
          <Progress
            value={(protocol.activeFeeds / protocol.totalFeeds) * 100}
            className="h-2"
          />
        </div>

        {/* Supported Chains */}
        <div className="space-y-2">
          <span className="text-muted-foreground flex items-center gap-1.5 text-sm">
            <Globe className="h-4 w-4" />
            {t('protocol:supportedChains')}
          </span>
          <div className="flex flex-wrap gap-2">
            {protocol.supportedChains.map((chain) => (
              <Badge key={chain} variant="secondary" className="text-xs">
                {chain}
              </Badge>
            ))}
          </div>
        </div>

        {/* TVL & Market Share */}
        {(protocol.tvl || protocol.marketShare) && (
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            {protocol.tvl && (
              <div className="space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <TrendingUp className="h-3 w-3" />
                  TVL
                </span>
                <p className="text-lg font-semibold">
                  ${(protocol.tvl / 1e9).toFixed(2)}B
                </p>
              </div>
            )}
            {protocol.marketShare && (
              <div className="space-y-1">
                <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                  <Activity className="h-3 w-3" />
                  {t('protocol:marketShare')}
                </span>
                <p className="text-lg font-semibold">{protocol.marketShare.toFixed(1)}%</p>
              </div>
            )}
          </div>
        )}

        {/* Last Update */}
        <div className="text-muted-foreground flex items-center gap-1.5 text-xs">
          <Clock className="h-3 w-3" />
          {t('protocol:lastUpdate')}: {protocol.lastUpdate.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}
