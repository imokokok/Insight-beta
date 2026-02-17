'use client';

import { useState } from 'react';
import { ExternalLink, Clock, CheckCircle, AlertCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SkeletonList } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';
import { cn, truncateAddress, formatTime } from '@/shared/utils';

import type { Dispute } from '../types/disputes';

interface DisputeListProps {
  disputes: Dispute[];
  isLoading: boolean;
  onSelect?: (dispute: Dispute) => void;
}

function StatusBadge({ status }: { status: Dispute['status'] }) {
  const { t } = useI18n();
  
  const badgeConfig = {
    active: {
      label: t('analytics:disputes.disputes.statusActive'),
      variant: 'default' as const,
      icon: <Clock className="h-3 w-3 mr-1" />,
    },
    resolved: {
      label: t('analytics:disputes.disputes.statusResolved'),
      variant: 'secondary' as const,
      icon: <CheckCircle className="h-3 w-3 mr-1" />,
    },
  };

  const config = badgeConfig[status];

  return (
    <Badge variant={config.variant} className="flex items-center">
      {config.icon}
      {config.label}
    </Badge>
  );
}

export function DisputeList({ disputes, isLoading, onSelect }: DisputeListProps) {
  const { t } = useI18n();

  if (isLoading) {
    return <SkeletonList count={5} />;
  }

  if (disputes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">{t('analytics:disputes.disputes.empty')}</h3>
        <p className="text-sm text-gray-500 mt-1">{t('analytics:disputes.disputes.emptyDescription')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {disputes.map((dispute) => (
        <Card
          key={dispute.id}
          className={cn(
            'cursor-pointer transition-all hover:shadow-md',
            onSelect && 'hover:border-primary'
          )}
          onClick={() => onSelect?.(dispute)}
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <CardTitle className="text-sm font-medium truncate">
                  {dispute.claim}
                </CardTitle>
                <CardDescription className="mt-1 text-xs flex items-center gap-2">
                  <span className="font-mono">{truncateAddress(dispute.asserter)}</span>
                  <span>→</span>
                  <span className="font-mono">{truncateAddress(dispute.disputer)}</span>
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <StatusBadge status={dispute.status} />
                {dispute.resolutionResult !== undefined && (
                  <Badge variant={dispute.resolutionResult ? 'outline' : 'destructive'}>
                    {dispute.resolutionResult ? 'Success' : 'Failed'}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <span className="font-medium">{t('analytics:disputes.disputes.bond')}:</span>
                <span>{dispute.bond.toFixed(0)} {dispute.currency}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">{t('analytics:disputes.disputes.disputeBond')}:</span>
                <span>{dispute.disputeBond.toFixed(0)} {dispute.currency}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium">{t('analytics:disputes.disputes.disputedAt')}:</span>
                <span>{formatTime(dispute.disputedAt)}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="uppercase">{dispute.protocol}</span>
                <span>•</span>
                <span className="uppercase">{dispute.chain}</span>
              </div>
              <a
                href={`https://etherscan.io/tx/${dispute.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                View
              </a>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
