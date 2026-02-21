'use client';

import { ArrowRight, Clock, Activity, TrendingUp, AlertCircle } from 'lucide-react';

import { StatusBadge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

import type { Bridge } from '../types/band';

interface BridgeStatusCardProps {
  bridge: Bridge;
  onClick?: (bridge: Bridge) => void;
  className?: string;
}

const CHAIN_DISPLAY_NAMES: Record<string, string> = {
  ethereum: 'Ethereum',
  cosmos: 'Cosmos Hub',
  osmosis: 'Osmosis',
  juno: 'Juno',
  stargaze: 'Stargaze',
  axelar: 'Axelar',
  injective: 'Injective',
  evmos: 'Evmos',
  crescent: 'Crescent',
  kujira: 'Kujira',
};

const getStatusConfig = (status: Bridge['status']) => {
  const configs = {
    active: { status: 'active' as const, label: 'Active' },
    inactive: { status: 'offline' as const, label: 'Inactive' },
    degraded: { status: 'warning' as const, label: 'Degraded' },
  };
  return configs[status] ?? configs.inactive;
};

const getSuccessRateColor = (rate: number): string => {
  if (rate >= 99) return 'text-emerald-500';
  if (rate >= 95) return 'text-amber-500';
  return 'text-red-500';
};

const getLatencyColor = (latencyMs: number): string => {
  if (latencyMs <= 5000) return 'text-emerald-500';
  if (latencyMs <= 15000) return 'text-amber-500';
  return 'text-red-500';
};

export function BridgeStatusCard({ bridge, onClick, className }: BridgeStatusCardProps) {
  const { t } = useI18n();
  const statusConfig = getStatusConfig(bridge.status);

  const formatLatency = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatVolume = (volume: number): string => {
    if (volume >= 1_000_000) {
      return `$${(volume / 1_000_000).toFixed(2)}M`;
    }
    if (volume >= 1_000) {
      return `$${(volume / 1_000).toFixed(2)}K`;
    }
    return `$${volume.toFixed(2)}`;
  };

  return (
    <Card
      className={cn('cursor-pointer transition-all hover:border-primary/30', className)}
      onClick={() => onClick?.(bridge)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-base">
              {CHAIN_DISPLAY_NAMES[bridge.sourceChain] ?? bridge.sourceChain}
            </CardTitle>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">
              {CHAIN_DISPLAY_NAMES[bridge.destinationChain] ?? bridge.destinationChain}
            </CardTitle>
          </div>
          <StatusBadge status={statusConfig.status} text={statusConfig.label} size="sm" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Activity className="h-3 w-3" />
              {t('common.transfers')}
            </div>
            <p className="mt-1 text-lg font-semibold">
              {bridge.totalTransfers.toLocaleString('en-US', { notation: 'compact' })}
            </p>
          </div>

          <div className="rounded-lg bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              {t('common.volume')}
            </div>
            <p className="mt-1 text-lg font-semibold">{formatVolume(bridge.totalVolume)}</p>
          </div>

          <div className="rounded-lg bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {t('common.avgLatency')}
            </div>
            <p className={cn('mt-1 text-lg font-semibold', getLatencyColor(bridge.avgLatencyMs))}>
              {formatLatency(bridge.avgLatencyMs)}
            </p>
          </div>

          <div className="rounded-lg bg-muted/30 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3" />
              {t('common.successRate')}
            </div>
            <p
              className={cn('mt-1 text-lg font-semibold', getSuccessRateColor(bridge.successRate))}
            >
              {bridge.successRate.toFixed(1)}%
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{t('common.lastTransfer')}</span>
          <span>{formatTime(bridge.lastTransferAt)}</span>
        </div>

        {bridge.status === 'degraded' && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-700">
            <AlertCircle className="h-3.5 w-3.5" />
            <span>{t('band.bridge.degradedWarning')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
