'use client';

import {
  X,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
  Gavel,
  User,
  Coins,
  Calendar,
  Link2,
  FileText,
  ArrowRight,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import { cn, truncateAddress, formatTime, getExplorerUrl } from '@/shared/utils';

import type { Dispute } from '../../types/disputes';

interface DisputeDetailPanelProps {
  dispute: Dispute | null;
  isOpen: boolean;
  onClose: () => void;
}

function TimelineItem({
  icon,
  title,
  timestamp,
  isLast,
}: {
  icon: React.ReactNode;
  title: string;
  timestamp: string;
  isLast: boolean;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </div>
        {!isLast && <div className="h-full w-0.5 bg-border" />}
      </div>
      <div className={cn('pb-4', isLast && 'pb-0')}>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{formatTime(timestamp)}</p>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 py-2', className)}>
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-right break-all">{value}</span>
    </div>
  );
}

function AddressLink({
  address,
  chain,
  type = 'address',
}: {
  address: string;
  chain: string;
  type?: 'address' | 'tx';
}) {
  const explorerUrl = getExplorerUrl(chain, address, type);

  if (!explorerUrl) {
    return <span className="font-mono text-xs">{truncateAddress(address)}</span>;
  }

  return (
    <a
      href={explorerUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 font-mono text-xs text-primary hover:underline"
    >
      {truncateAddress(address)}
      <ExternalLink className="h-3 w-3" />
    </a>
  );
}

export function DisputeDetailPanel({ dispute, isOpen, onClose }: DisputeDetailPanelProps) {
  const { t } = useI18n();

  if (!dispute) return null;

  const statusConfig = {
    active: {
      label: t('analytics:disputes.disputes.statusActive'),
      icon: <Clock className="h-4 w-4" />,
      variant: 'default' as const,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    resolved: {
      label: t('analytics:disputes.disputes.statusResolved'),
      icon: <CheckCircle className="h-4 w-4" />,
      variant: 'secondary' as const,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  };

  const config = statusConfig[dispute.status];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-md transform overflow-y-auto bg-background shadow-2xl transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 p-4 backdrop-blur">
          <h2 className="text-lg font-semibold">{t('analytics:disputes.disputes.details')}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-4 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-base">{t('analytics:disputes.disputes.claim')}</CardTitle>
                <Badge variant={config.variant} className="flex items-center gap-1 shrink-0">
                  {config.icon}
                  {config.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{dispute.claim}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <User className="h-4 w-4" />
                {t('analytics:disputes.detail.participants')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {t('analytics:disputes.disputes.asserter')}
                </p>
                <AddressLink address={dispute.asserter} chain={dispute.chain} />
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="h-4 w-4 text-muted-foreground rotate-90" />
              </div>
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {t('analytics:disputes.disputes.disputer')}
                </p>
                <AddressLink address={dispute.disputer} chain={dispute.chain} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Coins className="h-4 w-4" />
                {t('analytics:disputes.detail.bondDetails')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <DetailRow
                  label={t('analytics:disputes.disputes.bond')}
                  value={
                    <span className="font-medium">
                      {dispute.bond.toFixed(2)} {dispute.currency}
                    </span>
                  }
                />
                <DetailRow
                  label={t('analytics:disputes.disputes.disputeBond')}
                  value={
                    <span className="font-medium">
                      {dispute.disputeBond.toFixed(2)} {dispute.currency}
                    </span>
                  }
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Calendar className="h-4 w-4" />
                {t('analytics:disputes.detail.timeline')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                <TimelineItem
                  icon={<FileText className="h-4 w-4" />}
                  title={t('analytics:disputes.disputes.proposedAt')}
                  timestamp={dispute.proposedAt}
                  isLast={false}
                />
                <TimelineItem
                  icon={<Gavel className="h-4 w-4" />}
                  title={t('analytics:disputes.disputes.disputedAt')}
                  timestamp={dispute.disputedAt}
                  isLast={!!dispute.settledAt}
                />
                {dispute.settledAt && (
                  <TimelineItem
                    icon={<CheckCircle className="h-4 w-4" />}
                    title={t('analytics:disputes.disputes.settledAt')}
                    timestamp={dispute.settledAt}
                    isLast={true}
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {dispute.status === 'resolved' && dispute.resolutionResult !== undefined && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertCircle className="h-4 w-4" />
                  {t('analytics:disputes.detail.resolution')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-lg p-4',
                    dispute.resolutionResult ? 'bg-green-50' : 'bg-red-50'
                  )}
                >
                  {dispute.resolutionResult ? (
                    <>
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-green-700">
                        {t('analytics:disputes.detail.disputeSucceeded')}
                      </span>
                    </>
                  ) : (
                    <>
                      <X className="h-5 w-5 text-red-600" />
                      <span className="font-medium text-red-700">
                        {t('analytics:disputes.detail.disputeFailed')}
                      </span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Link2 className="h-4 w-4" />
                {t('analytics:disputes.detail.transactionInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-muted/50 p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {t('analytics:disputes.detail.transactionHash')}
                </p>
                <AddressLink address={dispute.txHash} chain={dispute.chain} type="tx" />
              </div>
              <DetailRow
                label={t('analytics:disputes.detail.blockNumber')}
                value={<span className="font-mono">{dispute.blockNumber.toLocaleString()}</span>}
              />
              <DetailRow
                label={t('analytics:disputes.detail.assertionId')}
                value={<AddressLink address={dispute.assertionId} chain={dispute.chain} />}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                {t('analytics:disputes.detail.protocolInfo')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="uppercase">
                  {dispute.protocol}
                </Badge>
                <Badge variant="secondary" className="uppercase">
                  {dispute.chain}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
