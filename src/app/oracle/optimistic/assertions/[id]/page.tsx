'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  ExternalLink,
  Clock,
  User,
  FileText,
  Gavel,
  CheckCircle,
  DollarSign,
  Hash,
} from 'lucide-react';
import { PageHeader } from '@/components/features/common/PageHeader';
import { cn, fetchApiData, formatTime } from '@/lib/utils';
import { logger } from '@/lib/logger';

interface UMAAssertionDetail {
  id: string;
  chain: string;
  identifier: string;
  ancillaryData: string;
  proposer: string;
  proposedValue: bigint | null;
  reward: bigint;
  proposedAt: string | null;
  livenessEndsAt: string | null;
  disputedAt: string | null;
  settledAt: string | null;
  settlementValue: bigint | null;
  status: 'Proposed' | 'Disputed' | 'Settled' | 'Expired';
  bond: bigint;
  disputeBond: bigint;
  txHash: string;
  blockNumber: string;
  logIndex: number;
  version: 'v2' | 'v3';
  dispute: {
    id: string;
    disputer: string;
    disputeBond: bigint;
    status: string;
    votingRound: {
      votesFor: bigint;
      votesAgainst: bigint;
      totalVotes: bigint;
      totalUniqueVoters: number;
    };
  } | null;
}

function formatValue(value: bigint | null, version: string) {
  if (value === null || value === undefined) return 'N/A';
  if (version === 'v3') {
    return `0x${value.toString(16)}`;
  }
  return value.toString();
}

export default function UMAAssertionDetailPage() {
  const params = useParams();
  const assertionId = params.id as string;
  const [assertion, setAssertion] = useState<UMAAssertionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssertion = async () => {
      try {
        setLoading(true);
        const data = await fetchApiData<UMAAssertionDetail>(
          `/api/oracle/uma/assertions/${assertionId}`,
        );
        setAssertion(data);
      } catch (err) {
        setError('Assertion not found');
        logger.error('Failed to fetch assertion', { error: err });
      } finally {
        setLoading(false);
      }
    };

    if (assertionId) {
      fetchAssertion();
    }
  }, [assertionId]);

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

  if (error || !assertion) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] text-white">
        <div className="container mx-auto px-4 py-8">
          <Link
            href="/oracle/optimistic"
            className="mb-8 inline-flex items-center gap-2 text-gray-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to UMA Dashboard
          </Link>
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-red-400">
            {error || 'Assertion not found'}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="container mx-auto px-4 py-8">
        <Link
          href="/oracle/uma"
          className="mb-6 inline-flex items-center gap-2 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to UMA Dashboard
        </Link>

        <PageHeader
          title="Assertion Details"
          description={`${assertion.status} • ${assertion.version.toUpperCase()} • ${assertion.chain}`}
        />

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Info */}
          <div className="space-y-6 lg:col-span-2">
            {/* Basic Info */}
            <div className="rounded-xl bg-white/5 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <FileText className="h-5 w-5 text-blue-400" />
                Assertion Information
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <InfoRow label="Chain" value={assertion.chain} />
                <InfoRow label="Version" value={assertion.version.toUpperCase()} />
                <InfoRow label="Identifier" value={assertion.identifier} />
                <InfoRow label="Block" value={Number(assertion.blockNumber).toLocaleString()} />
                <div className="md:col-span-2">
                  <label className="mb-1 block text-sm text-gray-400">Ancillary Data / Claim</label>
                  <code className="block break-all rounded-lg bg-white/5 px-3 py-2 font-mono text-sm">
                    {assertion.ancillaryData || 'N/A'}
                  </code>
                </div>
              </div>
            </div>

            {/* Values */}
            <div className="rounded-xl bg-white/5 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <DollarSign className="h-5 w-5 text-green-400" />
                Values & Bonds
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <InfoRow
                  label="Proposed Value"
                  value={formatValue(assertion.proposedValue, assertion.version)}
                />
                <InfoRow
                  label="Settlement Value"
                  value={formatValue(assertion.settlementValue, assertion.version)}
                />
                <InfoRow label="Bond (UMA)" value={Number(assertion.bond).toLocaleString()} />
                <InfoRow
                  label="Dispute Bond"
                  value={Number(assertion.disputeBond).toLocaleString()}
                />
              </div>
            </div>

            {/* Dispute Info */}
            {assertion.dispute && (
              <div className="rounded-xl border border-orange-500/20 bg-orange-500/10 p-6">
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                  <Gavel className="h-5 w-5 text-orange-400" />
                  Dispute Details
                </h3>
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <InfoRow label="Disputer" value={assertion.dispute.disputer} />
                    <InfoRow label="Status" value={assertion.dispute.status} />
                    <InfoRow
                      label="Votes For"
                      value={Number(assertion.dispute.votingRound.votesFor).toLocaleString()}
                    />
                    <InfoRow
                      label="Votes Against"
                      value={Number(assertion.dispute.votingRound.votesAgainst).toLocaleString()}
                    />
                    <InfoRow
                      label="Total Voters"
                      value={assertion.dispute.votingRound.totalUniqueVoters.toString()}
                    />
                  </div>

                  {/* Vote Progress */}
                  <div className="mt-4">
                    <div className="mb-2 flex justify-between text-sm">
                      <span className="text-green-400">For</span>
                      <span className="text-orange-400">Against</span>
                    </div>
                    <div className="flex h-3 overflow-hidden rounded-full bg-white/10">
                      <div
                        className="bg-green-500"
                        style={{
                          width: `${
                            (Number(assertion.dispute.votingRound.votesFor) /
                              Number(assertion.dispute.votingRound.totalVotes || 1)) *
                            100
                          }%`,
                        }}
                      />
                      <div
                        className="bg-orange-500"
                        style={{
                          width: `${
                            (Number(assertion.dispute.votingRound.votesAgainst) /
                              Number(assertion.dispute.votingRound.totalVotes || 1)) *
                            100
                          }%`,
                        }}
                      />
                    </div>
                  </div>
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
                Timeline
              </h3>
              <div className="space-y-4">
                <TimelineEvent
                  label="Proposed"
                  time={assertion.proposedAt}
                  icon={<FileText className="h-4 w-4" />}
                  active={!!assertion.proposedAt}
                />
                <TimelineEvent
                  label="Disputed"
                  time={assertion.disputedAt}
                  icon={<Gavel className="h-4 w-4" />}
                  active={!!assertion.disputedAt}
                />
                <TimelineEvent
                  label="Settled"
                  time={assertion.settledAt}
                  icon={<CheckCircle className="h-4 w-4" />}
                  active={!!assertion.settledAt}
                />
              </div>
            </div>

            {/* Proposer */}
            <div className="rounded-xl bg-white/5 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <User className="h-5 w-5 text-blue-400" />
                Proposer
              </h3>
              <a
                href={`https://etherscan.io/address/${assertion.proposer}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-mono transition-colors hover:text-blue-400"
              >
                {assertion.proposer.slice(0, 6)}...{assertion.proposer.slice(-4)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>

            {/* Transaction */}
            <div className="rounded-xl bg-white/5 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold">
                <Hash className="h-5 w-5 text-gray-400" />
                Transaction
              </h3>
              <a
                href={`https://etherscan.io/tx/${assertion.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 font-mono text-sm transition-colors hover:text-blue-400"
              >
                {assertion.txHash.slice(0, 6)}...{assertion.txHash.slice(-4)}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
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
}: {
  label: string;
  time: string | null;
  icon: React.ReactNode;
  active: boolean;
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
        <div className="text-xs text-gray-400">{time ? formatTime(time, 'en') : 'Pending'}</div>
      </div>
    </div>
  );
}
