'use client';

import { useState } from 'react';

import {
  X,
  ExternalLink,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  User,
  Coins,
  Link2,
  FileText,
  ArrowRight,
} from 'lucide-react';
import useSWR from 'swr';

import { Button } from '@/components/ui';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';
import { Badge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui';
import { useI18n } from '@/i18n';
import type {
  UMAAssertionEvent,
  UMADisputeEvent,
  UMASettlementEvent,
} from '@/lib/blockchain/umaOracle';
import { cn, truncateAddress, getExplorerUrl } from '@/shared/utils';
import type { Dispute } from '@/types/oracle/dispute';

import { AssertionTimeline } from '../timeline';
import { VoteRecordsCard, VoterStatsCard, VoteSummaryCard } from '../votes';

interface VotesResponse {
  votes: Array<{
    id: string;
    assertionId: string;
    voter: string;
    support: boolean;
    weight: number;
    txHash: string;
    timestamp: string;
    blockNumber: number;
  }>;
  voterStats: Array<{
    address: string;
    totalVotes: number;
    correctVotes: number;
    accuracy: number;
    totalWeight: number;
    avgWeight: number;
    firstVoteAt: string;
    lastVoteAt: string;
  }>;
  summary: {
    totalVotes: number;
    supportVotes: number;
    againstVotes: number;
    totalWeight: number;
    avgWeight: number;
    uniqueVoters: number;
  };
}

interface DisputeDetailPanelProps {
  dispute: Dispute | null;
  isOpen: boolean;
  onClose: () => void;
  assertionEvent?: UMAAssertionEvent | null;
  disputeEvent?: UMADisputeEvent | null;
  settlementEvent?: UMASettlementEvent | null;
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
      <span className="shrink-0 text-sm text-muted-foreground">{label}</span>
      <span className="break-all text-right text-sm font-medium">{value}</span>
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

export function DisputeDetailPanel({
  dispute,
  isOpen,
  onClose,
  assertionEvent,
  disputeEvent,
  settlementEvent,
}: DisputeDetailPanelProps) {
  const { t } = useI18n();
  const [activeDetailTab, setActiveDetailTab] = useState('details');

  const { data: votesData, isLoading: votesLoading } = useSWR<VotesResponse>(
    dispute ? `/api/oracle/uma/votes?assertionId=${dispute.assertionId}` : null,
    async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) return null;
      return res.json();
    },
  );

  if (!dispute) return null;

  const statusConfig: Record<
    string,
    {
      label: string;
      icon: React.ReactNode;
      variant: 'default' | 'secondary' | 'destructive' | 'outline';
      color: string;
      bgColor: string;
    }
  > = {
    active: {
      label: t('analytics:disputes.disputes.statusActive'),
      icon: <Clock className="h-4 w-4" />,
      variant: 'default' as const,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    disputed: {
      label: t('analytics:disputes.disputes.statusDisputed'),
      icon: <AlertCircle className="h-4 w-4" />,
      variant: 'default' as const,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    resolved: {
      label: t('analytics:disputes.disputes.statusResolved'),
      icon: <CheckCircle className="h-4 w-4" />,
      variant: 'secondary' as const,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    settled: {
      label: t('analytics:disputes.disputes.statusSettled'),
      icon: <CheckCircle className="h-4 w-4" />,
      variant: 'secondary' as const,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    expired: {
      label: t('analytics:disputes.disputes.statusExpired'),
      icon: <XCircle className="h-4 w-4" />,
      variant: 'outline' as const,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
    },
    accepted: {
      label: t('analytics:disputes.disputes.statusAccepted'),
      icon: <CheckCircle className="h-4 w-4" />,
      variant: 'secondary' as const,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    rejected: {
      label: t('analytics:disputes.disputes.statusRejected'),
      icon: <XCircle className="h-4 w-4" />,
      variant: 'destructive' as const,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  };

  const config = statusConfig[dispute.status] ?? statusConfig.active;

  if (!config) return null;

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      )}

      <div
        className={cn(
          'fixed right-0 top-0 z-50 h-full w-full max-w-md transform overflow-y-auto bg-background shadow-2xl transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 p-4 backdrop-blur">
          <h2 className="text-lg font-semibold">{t('analytics:disputes.disputes.details')}</h2>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4 p-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <CardTitle className="text-base">
                  {t('analytics:disputes.disputes.claim')}
                </CardTitle>
                <Badge variant={config.variant} className="flex shrink-0 items-center gap-1">
                  {config.icon}
                  {config.label}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed">{dispute.claim}</p>
            </CardContent>
          </Card>

          <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">{t('analytics:disputes.detail.tabDetails')}</TabsTrigger>
              <TabsTrigger value="votes">{t('analytics:disputes.detail.tabVotes')}</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <User className="h-4 w-4" />
                    {t('analytics:disputes.detail.participants')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="mb-1 text-xs text-muted-foreground">
                      {t('analytics:disputes.disputes.asserter')}
                    </p>
                    <AddressLink address={dispute.asserter} chain={dispute.chain} />
                  </div>
                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-4 w-4 rotate-90 text-muted-foreground" />
                  </div>
                  <div className="rounded-lg bg-muted/50 p-3">
                    <p className="mb-1 text-xs text-muted-foreground">
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

              <AssertionTimeline
                assertionEvent={assertionEvent}
                disputeEvent={disputeEvent}
                settlementEvent={settlementEvent}
                chain={dispute.chain}
              />

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
                        dispute.resolutionResult ? 'bg-green-50' : 'bg-red-50',
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
                    <p className="mb-1 text-xs text-muted-foreground">
                      {t('analytics:disputes.detail.transactionHash')}
                    </p>
                    <AddressLink address={dispute.txHash} chain={dispute.chain} type="tx" />
                  </div>
                  <DetailRow
                    label={t('analytics:disputes.detail.blockNumber')}
                    value={
                      <span className="font-mono">{dispute.blockNumber.toLocaleString()}</span>
                    }
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
            </TabsContent>

            <TabsContent value="votes" className="space-y-4">
              <VoteSummaryCard
                summary={
                  votesData?.summary || {
                    totalVotes: 0,
                    supportVotes: 0,
                    againstVotes: 0,
                    totalWeight: 0,
                    avgWeight: 0,
                    uniqueVoters: 0,
                  }
                }
                isLoading={votesLoading}
              />
              <VoteRecordsCard
                votes={votesData?.votes || []}
                isLoading={votesLoading}
                chain={dispute.chain}
              />
              <VoterStatsCard
                voterStats={votesData?.voterStats || []}
                isLoading={votesLoading}
                chain={dispute.chain}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
