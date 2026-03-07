'use client';

import { useState, useEffect, useCallback } from 'react';

import { Users, AlertTriangle, CheckCircle, XCircle, Shield } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { Skeleton, Badge } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

import type { Validator } from '../types/band';

interface ValidatorListProps {
  className?: string;
}

export function ValidatorList({ className }: ValidatorListProps) {
  const { t } = useI18n();
  const [validators, setValidators] = useState<Validator[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch('/api/oracle/band/validators');
      if (!response.ok) {
        throw new Error('Failed to fetch validator data');
      }

      const result = await response.json();
      if (result.success && result.data?.validators) {
        setValidators(result.data.validators);
      } else {
        // Use mock data as fallback
        setValidators([
          {
            validatorAddress: 'bandvaloper1abc123def456',
            moniker: 'Validator One',
            status: 'active',
            votingPower: 10000000,
            commissionRate: 0.1,
            uptimePercent: 99.9,
            lastSeenAt: new Date().toISOString(),
            totalRequestsProcessed: 1250000,
            missedBlocks: 2,
          },
          {
            validatorAddress: 'bandvaloper2def456ghi789',
            moniker: 'Validator Two',
            status: 'active',
            votingPower: 8500000,
            commissionRate: 0.08,
            uptimePercent: 99.5,
            lastSeenAt: new Date().toISOString(),
            totalRequestsProcessed: 980000,
            missedBlocks: 5,
          },
          {
            validatorAddress: 'bandvaloper3ghi789jkl012',
            moniker: 'Validator Three',
            status: 'jailed',
            votingPower: 5000000,
            commissionRate: 0.12,
            uptimePercent: 85.0,
            lastSeenAt: new Date(Date.now() - 86400000).toISOString(),
            totalRequestsProcessed: 450000,
            missedBlocks: 150,
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Use mock data as fallback
      setValidators([
        {
          validatorAddress: 'bandvaloper1abc123def456',
          moniker: 'Validator One',
          status: 'active',
          votingPower: 10000000,
          commissionRate: 0.1,
          uptimePercent: 99.9,
          lastSeenAt: new Date().toISOString(),
          totalRequestsProcessed: 1250000,
          missedBlocks: 2,
        },
        {
          validatorAddress: 'bandvaloper2def456ghi789',
          moniker: 'Validator Two',
          status: 'active',
          votingPower: 8500000,
          commissionRate: 0.08,
          uptimePercent: 99.5,
          lastSeenAt: new Date().toISOString(),
          totalRequestsProcessed: 980000,
          missedBlocks: 5,
        },
        {
          validatorAddress: 'bandvaloper3ghi789jkl012',
          moniker: 'Validator Three',
          status: 'jailed',
          votingPower: 5000000,
          commissionRate: 0.12,
          uptimePercent: 85.0,
          lastSeenAt: new Date(Date.now() - 86400000).toISOString(),
          totalRequestsProcessed: 450000,
          missedBlocks: 150,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getStatusConfig = (status: Validator['status']) => {
    switch (status) {
      case 'active':
        return { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10', label: t('band.validators.active') };
      case 'jailed':
        return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: t('band.validators.jailed') };
      default:
        return { icon: Shield, color: 'text-muted-foreground', bg: 'bg-muted', label: t('band.validators.inactive') };
    }
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('band.validators.listTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || validators.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            {t('band.validators.listTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-amber-500">
            <AlertTriangle className="h-5 w-5" />
            <span className="text-sm">{error || t('common.noData')}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5 text-primary" />
          {t('band.validators.listTitle')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border/30 text-xs text-muted-foreground">
                <th className="pb-2 text-left font-medium">{t('band.validators.moniker')}</th>
                <th className="pb-2 text-right font-medium">{t('band.validators.votingPower')}</th>
                <th className="pb-2 text-right font-medium">{t('band.validators.commission')}</th>
                <th className="pb-2 text-right font-medium">{t('band.validators.uptime')}</th>
                <th className="pb-2 text-center font-medium">{t('common.status.status')}</th>
              </tr>
            </thead>
            <tbody>
              {validators.map((validator) => {
                const statusConfig = getStatusConfig(validator.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <tr
                    key={validator.validatorAddress}
                    className="border-b border-border/20 transition-colors hover:bg-muted/30"
                  >
                    <td className="py-3 pr-4">
                      <div className="flex items-center gap-2">
                        <div className={cn('flex h-8 w-8 items-center justify-center rounded-full', statusConfig.bg)}>
                          <StatusIcon className={cn('h-4 w-4', statusConfig.color)} />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{validator.moniker}</p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {validator.validatorAddress.slice(0, 12)}...
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-right font-mono text-sm">
                      {(validator.votingPower / 1000000).toFixed(2)}M
                    </td>
                    <td className="py-3 text-right font-mono text-sm">
                      {(validator.commissionRate * 100).toFixed(1)}%
                    </td>
                    <td className="py-3 text-right font-mono text-sm">
                      <span
                        className={cn(
                          validator.uptimePercent >= 99
                            ? 'text-emerald-500'
                            : validator.uptimePercent >= 95
                              ? 'text-amber-500'
                              : 'text-red-500'
                        )}
                      >
                        {validator.uptimePercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 text-center">
                      <Badge
                        variant={validator.status === 'active' ? 'success' : validator.status === 'jailed' ? 'destructive' : 'secondary'}
                        size="sm"
                      >
                        {statusConfig.label}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
