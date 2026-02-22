'use client';

import { useState, useEffect, useCallback } from 'react';

import {
  Users,
  Shield,
  Activity,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react';

import { ContentSection, ContentGrid } from '@/components/common';
import { Button } from '@/components/ui';
import { Badge, StatusBadge } from '@/components/ui';
import { Skeleton } from '@/components/ui';
import { cn } from '@/shared/utils';

import type { ValidatorHealthSummary } from '../types';

interface ValidatorHealthCardProps {
  className?: string;
}

const mockValidatorSummary: ValidatorHealthSummary = {
  totalValidators: 100,
  activeValidators: 95,
  jailedValidators: 2,
  networkParticipationRate: 97.5,
  avgUptimePercent: 99.8,
  totalVotingPower: 1000000000,
};

const formatVotingPower = (power: number): string => {
  if (power >= 1000000000) return `${(power / 1000000000).toFixed(1)}B`;
  if (power >= 1000000) return `${(power / 1000000).toFixed(1)}M`;
  if (power >= 1000) return `${(power / 1000).toFixed(1)}K`;
  return power.toString();
};

const getParticipationColor = (rate: number): string => {
  if (rate >= 95) return 'text-emerald-500';
  if (rate >= 85) return 'text-amber-500';
  return 'text-red-500';
};

const getParticipationBgColor = (rate: number): string => {
  if (rate >= 95) return 'bg-emerald-500';
  if (rate >= 85) return 'bg-amber-500';
  return 'bg-red-500';
};

export function ValidatorHealthCard({ className }: ValidatorHealthCardProps) {
  const [data, setData] = useState<ValidatorHealthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      setData(mockValidatorSummary);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return (
      <ContentSection className={className}>
        <div className="space-y-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </ContentSection>
    );
  }

  if (error) {
    return (
      <ContentSection className={className}>
        <div className="flex flex-col items-center justify-center gap-4 py-8 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <div>
            <p className="font-medium text-foreground">加载失败</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="mr-2 h-4 w-4" />
            重试
          </Button>
        </div>
      </ContentSection>
    );
  }

  if (!data) {
    return (
      <ContentSection className={className}>
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <Users className="h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">暂无验证者数据</p>
        </div>
      </ContentSection>
    );
  }

  const isHealthy = data.networkParticipationRate >= 95 && data.avgUptimePercent >= 99;

  return (
    <ContentSection
      className={className}
      title={
        <span className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          验证者网络健康
        </span>
      }
      description="验证者参与率与网络状态"
      action={
        <div className="flex items-center gap-2">
          <StatusBadge
            status={
              isHealthy ? 'active' : data.networkParticipationRate >= 85 ? 'warning' : 'error'
            }
            text={isHealthy ? '健康' : data.networkParticipationRate >= 85 ? '注意' : '异常'}
            size="sm"
            pulse={isHealthy}
          />
          <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        <ContentGrid columns={2}>
          <div className="rounded-lg border border-border/30 bg-muted/20 p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Users className="h-3 w-3" />
              验证者总数
            </div>
            <p className="mt-1 text-lg font-semibold">{data.totalValidators}</p>
            <p className="text-xs text-muted-foreground">
              活跃: {data.activeValidators} | 监禁: {data.jailedValidators}
            </p>
          </div>

          <div className="rounded-lg border border-border/30 bg-muted/20 p-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Shield className="h-3 w-3" />
              总投票权
            </div>
            <p className="mt-1 text-lg font-semibold">{formatVotingPower(data.totalVotingPower)}</p>
            <p className="text-xs text-muted-foreground">Band Tokens</p>
          </div>
        </ContentGrid>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">网络参与率</span>
            <span
              className={cn(
                'text-sm font-semibold',
                getParticipationColor(data.networkParticipationRate),
              )}
            >
              {data.networkParticipationRate.toFixed(1)}%
            </span>
          </div>

          <div className="relative h-4 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full transition-all duration-500',
                getParticipationBgColor(data.networkParticipationRate),
              )}
              style={{ width: `${data.networkParticipationRate}%` }}
            />
            <div className="absolute inset-0 flex items-center">
              <div className="h-full w-px bg-border" style={{ left: '85%' }} title="85%阈值" />
              <div className="h-full w-px bg-border" style={{ left: '95%' }} title="95%阈值" />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>0%</span>
            <span>85%</span>
            <span>95%</span>
            <span>100%</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div
            className={cn(
              'flex flex-col items-center rounded-lg p-2 text-center',
              data.activeValidators >= data.totalValidators * 0.9
                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                : 'bg-muted/30',
            )}
          >
            <CheckCircle2
              className={cn(
                'h-4 w-4',
                data.activeValidators >= data.totalValidators * 0.9
                  ? 'text-emerald-500'
                  : 'text-muted-foreground',
              )}
            />
            <span className="mt-1 text-xs">活跃</span>
            <span className="font-mono text-sm">{data.activeValidators}</span>
          </div>
          <div
            className={cn(
              'flex flex-col items-center rounded-lg p-2 text-center',
              data.avgUptimePercent >= 99 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-muted/30',
            )}
          >
            <Activity
              className={cn(
                'h-4 w-4',
                data.avgUptimePercent >= 99 ? 'text-emerald-500' : 'text-muted-foreground',
              )}
            />
            <span className="mt-1 text-xs">平均在线</span>
            <span className="font-mono text-sm">{data.avgUptimePercent.toFixed(1)}%</span>
          </div>
          <div
            className={cn(
              'flex flex-col items-center rounded-lg p-2 text-center',
              data.jailedValidators === 0
                ? 'bg-emerald-100 dark:bg-emerald-900/30'
                : 'bg-amber-100 dark:bg-amber-900/30',
            )}
          >
            {data.jailedValidators === 0 ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-amber-500" />
            )}
            <span className="mt-1 text-xs">监禁</span>
            <span className="font-mono text-sm">{data.jailedValidators}</span>
          </div>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-center gap-2">
            {isHealthy ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            ) : (
              <XCircle className="h-4 w-4 text-red-500" />
            )}
            <span className="text-sm">网络健康状态</span>
          </div>
          <Badge variant={isHealthy ? 'success' : 'destructive'} size="sm">
            {isHealthy ? '健康' : '异常'}
          </Badge>
        </div>
      </div>
    </ContentSection>
  );
}
