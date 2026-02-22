'use client';

import { ExternalLink, Clock, CheckCircle, AlertCircle } from 'lucide-react';

import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { SkeletonList } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn, truncateAddress, formatTime } from '@/shared/utils';
import type { Dispute } from '@/types/oracle/dispute';

interface DisputeListProps {
  disputes: Dispute[];
  isLoading: boolean;
  onSelect?: (dispute: Dispute) => void;
}

function getStatusColor(status: Dispute['status']): string {
  const colorMap: Record<string, string> = {
    active: '#f97316',
    disputed: '#f97316',
    resolved: '#22c55e',
    settled: '#22c55e',
    accepted: '#22c55e',
    expired: '#6b7280',
    rejected: '#dc2626',
  };
  return colorMap[status] ?? '#6b7280';
}

function StatusBadge({ status }: { status: Dispute['status'] }) {
  const { t } = useI18n();

  const badgeConfig: Record<
    string,
    {
      label: string;
      variant: 'default' | 'secondary' | 'destructive' | 'outline';
      icon: React.ReactNode;
    }
  > = {
    active: {
      label: t('analytics:disputes.disputes.statusActive'),
      variant: 'default' as const,
      icon: <Clock className="mr-1 h-3 w-3" />,
    },
    disputed: {
      label: t('analytics:disputes.disputes.statusDisputed'),
      variant: 'default' as const,
      icon: <AlertCircle className="mr-1 h-3 w-3" />,
    },
    resolved: {
      label: t('analytics:disputes.disputes.statusResolved'),
      variant: 'secondary' as const,
      icon: <CheckCircle className="mr-1 h-3 w-3" />,
    },
    settled: {
      label: t('analytics:disputes.disputes.statusSettled'),
      variant: 'secondary' as const,
      icon: <CheckCircle className="mr-1 h-3 w-3" />,
    },
    expired: {
      label: t('analytics:disputes.disputes.statusExpired'),
      variant: 'outline' as const,
      icon: <Clock className="mr-1 h-3 w-3" />,
    },
    accepted: {
      label: t('analytics:disputes.disputes.statusAccepted'),
      variant: 'secondary' as const,
      icon: <CheckCircle className="mr-1 h-3 w-3" />,
    },
    rejected: {
      label: t('analytics:disputes.disputes.statusRejected'),
      variant: 'destructive' as const,
      icon: <AlertCircle className="mr-1 h-3 w-3" />,
    },
  };

  const config = badgeConfig[status] ?? badgeConfig.active;

  if (!config) return null;

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
        <AlertCircle className="mb-4 h-12 w-12 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900">
          {t('analytics:disputes.disputes.empty')}
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          {t('analytics:disputes.disputes.emptyDescription')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {disputes.map((dispute) => (
        <Card
          key={dispute.id}
          className={cn(
            'group relative cursor-pointer overflow-hidden transition-all duration-200',
            'hover:border-primary hover:shadow-md',
          )}
          onClick={() => onSelect?.(dispute)}
        >
          <div
            className="absolute left-0 top-0 h-full w-1 rounded-l-lg"
            style={{ backgroundColor: getStatusColor(dispute.status) }}
          />
          <CardHeader className="pb-3 pl-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <CardTitle className="truncate text-base font-medium leading-tight">
                  {dispute.claim}
                </CardTitle>
                <CardDescription className="mt-2 flex items-center gap-2 text-xs">
                  <span className="font-mono">{truncateAddress(dispute.asserter)}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-mono">{truncateAddress(dispute.disputer)}</span>
                </CardDescription>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <StatusBadge status={dispute.status} />
                {dispute.resolutionResult !== undefined && (
                  <Badge variant={dispute.resolutionResult ? 'outline' : 'destructive'}>
                    {dispute.resolutionResult ? 'Success' : 'Failed'}
                  </Badge>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pl-5 pt-0">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-gray-600">
                  {t('analytics:disputes.disputes.bond')}:
                </span>
                <span>
                  {dispute.bond.toFixed(0)} {dispute.currency}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-gray-600">
                  {t('analytics:disputes.disputes.disputeBond')}:
                </span>
                <span>
                  {dispute.disputeBond.toFixed(0)} {dispute.currency}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-medium text-gray-600">
                  {t('analytics:disputes.disputes.disputedAt')}:
                </span>
                <span>{formatTime(dispute.disputedAt)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium uppercase">
                  {dispute.protocol}
                </span>
                <span className="text-gray-300">•</span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium uppercase">
                  {dispute.chain}
                </span>
              </div>
              <a
                href={`https://etherscan.io/tx/${dispute.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="ml-auto flex items-center gap-1 text-primary transition-colors hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>View</span>
              </a>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
