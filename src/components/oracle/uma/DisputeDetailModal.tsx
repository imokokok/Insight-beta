'use client';

import { memo } from 'react';

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui';
import { Button } from '@/components/ui';
import { ScrollArea } from '@/components/ui';
import { useI18n } from '@/i18n';
import { getExplorerUrl } from '@/shared/utils/blockchain';
import { formatTime } from '@/shared/utils/format/date';
import { cn } from '@/shared/utils/ui';

import { VoteProgress } from './VoteProgress';

export interface DisputeDetailModalProps {
  dispute: {
    id: string;
    assertionId: string;
    chain: string;
    identifier: string | null;
    disputer: string;
    disputeBond: string;
    disputedAt: string;
    votingEndsAt: string | null;
    status: string;
    currentVotesFor: string;
    currentVotesAgainst: string;
    totalVotes: string;
    txHash: string;
    blockNumber: number;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DisputeDetailModal = memo(function DisputeDetailModal({
  dispute,
  open,
  onOpenChange,
}: DisputeDetailModalProps) {
  const { t } = useI18n();

  const txUrl = getExplorerUrl(dispute.chain, dispute.txHash, 'tx');
  const addressUrl = getExplorerUrl(dispute.chain, dispute.disputer, 'address');

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'destructive';
      case 'pending':
        return 'secondary';
      case 'resolved':
        return 'default';
      default:
        return 'outline';
    }
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/80 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-2xl translate-x-[-50%] translate-y-[-50%]',
            'border border-border bg-background shadow-lg duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-100',
            'rounded-lg',
          )}
        >
          <div className="flex items-center justify-between border-b px-6 py-4">
            <DialogPrimitive.Title className="text-lg font-semibold">
              {t('uma.detail.disputeDetails')}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-6 p-6">
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t('uma.detail.basicInfo')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {t('uma.detail.relatedAssertion')}
                    </p>
                    <p className="break-all font-mono text-sm">
                      {dispute.assertionId.slice(0, 20)}...{dispute.assertionId.slice(-8)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('uma.disputes.disputer')}</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm">
                        {dispute.disputer.slice(0, 6)}...{dispute.disputer.slice(-4)}
                      </p>
                      {addressUrl && (
                        <a
                          href={addressUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('uma.disputes.disputeBond')}</p>
                    <p className="text-sm font-medium">
                      ${Number(dispute.disputeBond).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('uma.disputes.status')}</p>
                    <Badge variant={getStatusVariant(dispute.status)}>{dispute.status}</Badge>
                  </div>
                  {dispute.identifier && (
                    <div className="col-span-2 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {t('uma.assertions.identifier')}
                      </p>
                      <p className="text-sm">{dispute.identifier}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t('uma.detail.timeInfo')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('uma.disputes.disputedAt')}</p>
                    <p className="text-sm">{formatTime(dispute.disputedAt)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('uma.disputes.votingEnds')}</p>
                    <p className="text-sm">
                      {dispute.votingEndsAt ? formatTime(dispute.votingEndsAt) : '—'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t('uma.detail.votingProgress')}
                </h3>
                <div className="space-y-2">
                  <VoteProgress
                    votesFor={dispute.currentVotesFor}
                    votesAgainst={dispute.currentVotesAgainst}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {t('uma.disputes.votesFor')}:{' '}
                      {Number(dispute.currentVotesFor).toLocaleString()}
                    </span>
                    <span>
                      {t('uma.disputes.votesAgainst')}:{' '}
                      {Number(dispute.currentVotesAgainst).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t('uma.detail.onChainInfo')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('uma.detail.txHash')}</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm">
                        {dispute.txHash.slice(0, 10)}...{dispute.txHash.slice(-8)}
                      </p>
                      {txUrl && (
                        <a
                          href={txUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('uma.detail.blockNumber')}</p>
                    <p className="text-sm">{dispute.blockNumber.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
});
