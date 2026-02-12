'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';
import { useParams } from 'next/navigation';

import {
  ArrowLeft,
  ExternalLink,
  Clock,
  User,
  Gavel,
  Users,
  CheckCircle,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';





import { PageHeader } from '@/components/common/PageHeader';
import { useI18n } from '@/i18n/LanguageProvider';
import { logger } from '@/shared/logger';
import { cn, fetchApiData, formatTime } from '@/shared/utils';

interface UMADisputeDetail {
  id: string;
  chain: string;
  assertionId: string;
  disputer: string;
  disputeBond: bigint;
  status: 'Voting' | 'Resolved';
  resolvedAt: string | null;
  resolution: {
    winner: 'Asserter' | 'Disputer' | 'Tie';
    payoutToAsserter: bigint;
    payoutToDisputer: bigint;
  } | null;
  votingRound: {
    votesForAssertion: bigint;
    votesAgainstAssertion: bigint;
    totalVotes: bigint;
    totalUniqueVoters: number;
    votingEndedAt: string | null;
  };
  assertion: {
    id: string;
    identifier: string;
    asserter: string;
    bond: bigint;
    claim: string;
    proposedAt: string;
    settledAt: string | null;
  };
  txHash: string;
  blockNumber: string;
}

export default function UMADisputeDetailPage() {
  const { t, lang } = useI18n();
  const params = useParams();
  const disputeId = params.id as string;
  const [dispute, setDispute] = useState<UMADisputeDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (disputeId) {
      fetchDispute();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disputeId]);

  async function fetchDispute() {
    try {
      setLoading(true);
      const data = await fetchApiData<UMADisputeDetail>(`/api/oracle/uma/disputes/${disputeId}`);
      setDispute(data);
    } catch (error: unknown) {
      setError(t('errors.noItems'));
      logger.error('Failed to fetch dispute', { error });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-32 rounded bg-white/10" />
            <div className="h-48 rounded-xl bg-white/5" />
            <div className="h-32 rounded-xl bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !dispute) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] text-white">
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/oracle/optimistic"
            className="mb-8 inline-flex items-center gap-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('oracle.detail.back')}
          </Link>
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
            {error || t('errors.noItems')}
          </div>
        </div>
      </div>
    );
  }

  const forPercentage =
    Number(dispute.votingRound.totalVotes) > 0
      ? (Number(dispute.votingRound.votesForAssertion) / Number(dispute.votingRound.totalVotes)) *
        100
      : 0;
  const againstPercentage = 100 - forPercentage;

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/oracle/uma"
          className="mb-6 inline-flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('oracle.detail.back')}
        </Link>

        <PageHeader
          title={t('uma.disputeDetail.title')}
          description={`${dispute.status} • ${dispute.chain} • ${dispute.id.slice(0, 8)}...${dispute.id.slice(-8)}`}
        />

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="space-y-6 lg:col-span-2">
            {/* Voting Results */}
            <div className="rounded-xl bg-white/5 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <TrendingUp className="h-5 w-5 text-blue-400" />
                {t('disputes.votingProgress')}
              </h3>

              <div className="mb-6">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-green-400">
                    {t('uma.assertionDetail.for')} ({forPercentage.toFixed(1)}%)
                  </span>
                  <span className="text-gray-400">
                    {Number(dispute.votingRound.votesForAssertion).toLocaleString()}{' '}
                    {t('disputes.card.votes')}
                  </span>
                </div>
                <div className="flex h-4 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full bg-green-500" style={{ width: `${forPercentage}%` }} />
                  <div
                    className="h-full bg-amber-500"
                    style={{ width: `${againstPercentage}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-sm">
                  <span />
                  <span className="text-amber-400">
                    {t('uma.assertionDetail.against')} ({againstPercentage.toFixed(1)}%) -{' '}
                    {Number(dispute.votingRound.votesAgainstAssertion).toLocaleString()}{' '}
                    {t('disputes.card.votes')}
                  </span>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <InfoRow
                  label={t('uma.disputeDetail.totalVotes')}
                  value={Number(dispute.votingRound.totalVotes).toLocaleString()}
                />
                <InfoRow
                  label={t('uma.disputeDetail.uniqueVoters')}
                  value={dispute.votingRound.totalUniqueVoters.toString()}
                />
                <InfoRow
                  label={t('uma.disputeDetail.winner')}
                  value={
                    <span
                      className={cn(
                        dispute.resolution?.winner === 'Asserter' && 'text-green-400',
                        dispute.resolution?.winner === 'Disputer' && 'text-amber-400',
                        dispute.resolution?.winner === 'Tie' && 'text-gray-400',
                      )}
                    >
                      {dispute.resolution?.winner || 'Pending'}
                    </span>
                  }
                />
              </div>
            </div>

            {/* Related Assertion */}
            <div className="rounded-xl bg-white/5 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Gavel className="h-5 w-5 text-purple-400" />
                {t('oracle.detail.relatedAssertion')}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <InfoRow
                  label={t('uma.disputeDetail.assertionId')}
                  value={dispute.assertion.id.slice(0, 12) + '...'}
                />
                <InfoRow
                  label={t('uma.disputeDetail.identifier')}
                  value={dispute.assertion.identifier}
                />
                <InfoRow
                  label={t('uma.disputeDetail.asserter')}
                  value={
                    <a
                      href={`https://etherscan.io/address/${dispute.assertion.asserter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-mono hover:text-blue-400"
                    >
                      {dispute.assertion.asserter.slice(0, 6)}...
                      {dispute.assertion.asserter.slice(-4)}
                    </a>
                  }
                />
                <InfoRow
                  label={t('oracle.card.bond')}
                  value={`${Number(dispute.assertion.bond).toLocaleString()} UMA`}
                />
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm text-gray-400">
                    {t('uma.disputeDetail.claim')}
                  </label>
                  <code className="block break-all rounded-lg bg-white/5 px-3 py-2 font-mono text-sm">
                    {dispute.assertion.claim || 'N/A'}
                  </code>
                </div>
              </div>
            </div>

            {/* Resolution */}
            {dispute.resolution && (
              <div
                className={cn(
                  'rounded-xl p-6',
                  dispute.resolution.winner === 'Asserter'
                    ? 'border border-green-500/20 bg-green-500/10'
                    : dispute.resolution.winner === 'Disputer'
                      ? 'border border-amber-500/20 bg-amber-500/10'
                      : 'border border-gray-500/20 bg-gray-500/10',
                )}
              >
                <h3 className="mb-4 text-lg font-semibold">{t('uma.disputeDetail.resolution')}</h3>
                <div className="grid gap-4 md:grid-cols-3">
                  <InfoRow
                    label={t('uma.disputeDetail.winner')}
                    value={
                      <span
                        className={cn(
                          dispute.resolution.winner === 'Asserter' && 'text-green-400',
                          dispute.resolution.winner === 'Disputer' && 'text-orange-400',
                        )}
                      >
                        {dispute.resolution.winner}
                      </span>
                    }
                  />
                  <InfoRow
                    label={t('uma.disputeDetail.payoutToAsserter')}
                    value={`${Number(dispute.resolution.payoutToAsserter).toLocaleString()} UMA`}
                  />
                  <InfoRow
                    label={t('uma.disputeDetail.payoutToDisputer')}
                    value={`${Number(dispute.resolution.payoutToDisputer).toLocaleString()} UMA`}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Timeline */}
            <div className="rounded-xl bg-white/5 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Clock className="h-5 w-5 text-purple-400" />
                {t('oracle.detail.timeline')}
              </h3>
              <div className="space-y-4">
                <TimelineEvent
                  label={t('uma.disputeDetail.disputeCreated')}
                  time={dispute.votingRound.votingEndedAt || 'N/A'}
                  icon={<Gavel className="h-4 w-4" />}
                  active={!!dispute.votingRound.votingEndedAt}
                  lang={lang}
                />
                <TimelineEvent
                  label={t('uma.disputeDetail.votingEnded')}
                  time={dispute.votingRound.votingEndedAt || 'Pending'}
                  icon={<Users className="h-4 w-4" />}
                  active={!!dispute.votingRound.votingEndedAt}
                  lang={lang}
                />
                <TimelineEvent
                  label={t('uma.disputeDetail.resolved')}
                  time={dispute.resolvedAt}
                  icon={<CheckCircle className="h-4 w-4" />}
                  active={!!dispute.resolvedAt}
                  lang={lang}
                />
              </div>
            </div>

            {/* Disputer */}
            <div className="rounded-xl bg-white/5 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <User className="h-5 w-5 text-amber-400" />
                {t('disputes.disputer')}
              </h3>
              <a
                href={`https://etherscan.io/address/${dispute.disputer}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-mono transition-colors hover:text-amber-400"
              >
                {dispute.disputer.slice(0, 6)}...{dispute.disputer.slice(-4)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Bond Info */}
            <div className="rounded-xl bg-white/5 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
                {t('oracle.card.bond')}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('uma.disputeDetail.disputeBond')}</span>
                  <span className="font-mono">
                    {Number(dispute.disputeBond).toLocaleString()} UMA
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">{t('uma.disputeDetail.block')}</span>
                  <span className="font-mono">{Number(dispute.blockNumber).toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Transaction */}
            <div className="rounded-xl bg-white/5 p-6">
              <h3 className="mb-4 text-lg font-semibold">{t('uma.disputeDetail.transaction')}</h3>
              <a
                href={`https://etherscan.io/tx/${dispute.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-mono text-sm transition-colors hover:text-blue-400"
              >
                {dispute.txHash.slice(0, 6)}...{dispute.txHash.slice(-4)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-sm text-gray-400">{label}</label>
      <span className="font-mono">{value}</span>
    </div>
  );
}

function TimelineEvent({
  label,
  time,
  icon,
  active,
  lang,
}: {
  label: string;
  time: string | null;
  icon: React.ReactNode;
  active: boolean;
  lang: string;
}) {
  return (
    <div className={cn('flex items-start gap-3', !active && 'opacity-50')}>
      <div
        className={cn(
          'mt-0.5 flex h-6 w-6 items-center justify-center rounded-full',
          active ? 'bg-blue-500/20 text-blue-400' : 'bg-white/10 text-gray-500',
        )}
      >
        {icon}
      </div>
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-gray-400">{time ? formatTime(time, lang) : 'Pending'}</div>
      </div>
    </div>
  );
}
