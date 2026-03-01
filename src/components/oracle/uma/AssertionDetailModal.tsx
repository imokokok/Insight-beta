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

export interface AssertionDetailModalProps {
  assertion: {
    id: string;
    assertionId: string;
    identifier: string;
    claim: string;
    proposer: string;
    bond: string;
    status: 'pending' | 'disputed' | 'resolved' | 'settled';
    chain: string;
    blockNumber: number;
    txHash: string;
    timestamp: string;
    expirationTimestamp: string;
    resolutionTimestamp?: string;
    settlementTimestamp?: string;
    challenger?: string;
    settledPrice?: string;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AssertionDetailModal = memo(function AssertionDetailModal({
  assertion,
  open,
  onOpenChange,
}: AssertionDetailModalProps) {
  const { t } = useI18n();

  const txUrl = getExplorerUrl(assertion.chain, assertion.txHash, 'tx');
  const proposerUrl = getExplorerUrl(assertion.chain, assertion.proposer, 'address');
  const challengerUrl = assertion.challenger
    ? getExplorerUrl(assertion.chain, assertion.challenger, 'address')
    : null;

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'disputed':
        return 'destructive';
      case 'pending':
        return 'secondary';
      case 'resolved':
      case 'settled':
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
              {t('uma.detail.assertionDetails')}
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
                      {t('uma.assertions.identifier')}
                    </p>
                    <p className="text-sm font-medium">{assertion.identifier}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('uma.assertions.status')}</p>
                    <Badge variant={getStatusVariant(assertion.status)}>{assertion.status}</Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('uma.assertions.bond')}</p>
                    <p className="text-sm font-medium">
                      ${Number(assertion.bond).toLocaleString()}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('uma.assertions.chain')}</p>
                    <p className="text-sm capitalize">{assertion.chain}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {t('uma.detail.basicInfo')}
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">{t('uma.detail.proposer')}</p>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm">
                        {assertion.proposer.slice(0, 6)}...{assertion.proposer.slice(-4)}
                      </p>
                      {proposerUrl && (
                        <a
                          href={proposerUrl}
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
                    <p className="text-xs text-muted-foreground">{t('uma.detail.proposedValue')}</p>
                    <p className="break-all text-sm">{assertion.claim || '—'}</p>
                  </div>
                  {assertion.challenger && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">{t('uma.disputes.disputer')}</p>
                      <div className="flex items-center gap-2">
                        <p className="font-mono text-sm">
                          {assertion.challenger.slice(0, 6)}...{assertion.challenger.slice(-4)}
                        </p>
                        {challengerUrl && (
                          <a
                            href={challengerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                  {assertion.settledPrice && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {t('uma.detail.settlementValue')}
                      </p>
                      <p className="text-sm">{assertion.settledPrice}</p>
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
                    <p className="text-xs text-muted-foreground">{t('uma.assertions.timestamp')}</p>
                    <p className="text-sm">{formatTime(assertion.timestamp)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">
                      {t('uma.detail.expirationTime')}
                    </p>
                    <p className="text-sm">{formatTime(assertion.expirationTimestamp)}</p>
                  </div>
                  {assertion.resolutionTimestamp && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {t('uma.detail.resolutionTime')}
                      </p>
                      <p className="text-sm">{formatTime(assertion.resolutionTimestamp)}</p>
                    </div>
                  )}
                  {assertion.settlementTimestamp && (
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {t('uma.detail.settlementTime')}
                      </p>
                      <p className="text-sm">{formatTime(assertion.settlementTimestamp)}</p>
                    </div>
                  )}
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
                        {assertion.txHash.slice(0, 10)}...{assertion.txHash.slice(-8)}
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
                    <p className="text-sm">{assertion.blockNumber.toLocaleString()}</p>
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
