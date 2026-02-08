'use client';

import { useEffect, useState } from 'react';

import {
  Scale,
  FileText,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

import { PageHeader } from '@/components/features/common/PageHeader';
import { logger } from '@/lib/logger';
import { cn, fetchApiData } from '@/lib/utils';

type ProposalState =
  | 'Pending'
  | 'Active'
  | 'Canceled'
  | 'Defeated'
  | 'Succeeded'
  | 'Queued'
  | 'Expired'
  | 'Executed';

interface Proposal {
  id: string;
  proposer: string;
  targets: string[];
  values: string[];
  signatures: string[];
  calldatas: string[];
  startBlock: string;
  endBlock: string;
  forVotes: string;
  againstVotes: string;
  abstainVotes: string;
  canceled: boolean;
  executed: boolean;
  state: ProposalState;
  description: string;
  createdAt: string;
}

interface GovernanceStats {
  totalProposals: number;
  activeProposals: number;
  executedProposals: number;
  totalVotes: number;
  uniqueVoters: number;
  averageParticipation: number;
}

export default function GovernancePage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [stats, setStats] = useState<GovernanceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'executed' | 'pending'>('all');

  useEffect(() => {
    fetchGovernanceData();

    const pollInterval = setInterval(() => {
      if (!isRefreshing) {
        fetchGovernanceData();
      }
    }, 60000);

    return () => clearInterval(pollInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function fetchGovernanceData() {
    try {
      setIsRefreshing(true);

      const response = await fetchApiData<{
        data: {
          proposals: Proposal[];
          stats: GovernanceStats;
        };
      }>('/api/oracle/uma/governance');

      setProposals(response.data.proposals || []);
      setStats(
        response.data.stats || {
          totalProposals: 0,
          activeProposals: 0,
          executedProposals: 0,
          totalVotes: 0,
          uniqueVoters: 0,
          averageParticipation: 0,
        },
      );
    } catch (error) {
      logger.error('Failed to fetch governance data', { error });
      // 显示空状态
      setProposals([]);
      setStats({
        totalProposals: 0,
        activeProposals: 0,
        executedProposals: 0,
        totalVotes: 0,
        uniqueVoters: 0,
        averageParticipation: 0,
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  function formatUMA(amount: string): string {
    const num = Number(amount) / 1e18;
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  function getStateColor(state: ProposalState): string {
    switch (state) {
      case 'Active':
        return 'bg-blue-500/20 text-blue-400';
      case 'Succeeded':
        return 'bg-green-500/20 text-green-400';
      case 'Executed':
        return 'bg-purple-500/20 text-purple-400';
      case 'Defeated':
        return 'bg-red-500/20 text-red-400';
      case 'Canceled':
        return 'bg-gray-500/20 text-gray-400';
      case 'Queued':
        return 'bg-yellow-500/20 text-yellow-400';
      case 'Expired':
        return 'bg-orange-500/20 text-orange-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  }

  function getStateIcon(state: ProposalState) {
    switch (state) {
      case 'Active':
        return <Clock className="h-3 w-3" />;
      case 'Succeeded':
      case 'Executed':
        return <CheckCircle className="h-3 w-3" />;
      case 'Defeated':
        return <XCircle className="h-3 w-3" />;
      case 'Canceled':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  }

  const filteredProposals = proposals.filter((p) => {
    if (activeTab === 'active') return p.state === 'Active';
    if (activeTab === 'executed') return p.state === 'Executed';
    if (activeTab === 'pending') return p.state === 'Pending' || p.state === 'Queued';
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0F] text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-white/10" />
            <div className="h-32 rounded-xl bg-white/5" />
            <div className="h-64 rounded-xl bg-white/5" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <PageHeader
              title="Optimistic Oracle Governance"
              description="Monitor governance proposals and voting for optimistic oracle protocols"
            />
            <div className="flex gap-2">
              <button
                onClick={fetchGovernanceData}
                disabled={isRefreshing}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>

        {stats && (
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total Proposals"
              value={stats.totalProposals.toLocaleString()}
              icon={<FileText className="h-5 w-5 text-blue-400" />}
            />
            <StatCard
              title="Active Proposals"
              value={stats.activeProposals.toLocaleString()}
              icon={<Clock className="h-5 w-5 text-green-400" />}
            />
            <StatCard
              title="Executed Proposals"
              value={stats.executedProposals.toLocaleString()}
              icon={<CheckCircle className="h-5 w-5 text-purple-400" />}
            />
            <StatCard
              title="Unique Voters"
              value={stats.uniqueVoters.toLocaleString()}
              icon={<Users className="h-5 w-5 text-yellow-400" />}
            />
          </div>
        )}

        <div className="mb-6 flex gap-4">
          {(['all', 'active', 'pending', 'executed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'rounded-lg px-4 py-2 capitalize transition-colors',
                activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white/5 hover:bg-white/10',
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-white/5 p-6">
          <h3 className="mb-4 text-lg font-semibold">
            {activeTab === 'all'
              ? 'All Proposals'
              : activeTab === 'active'
                ? 'Active Proposals'
                : activeTab === 'pending'
                  ? 'Pending Proposals'
                  : 'Executed Proposals'}
          </h3>

          {filteredProposals.length > 0 ? (
            <div className="space-y-4">
              {filteredProposals.map((proposal) => (
                <div key={proposal.id} className="rounded-lg bg-white/5 p-4">
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span className="font-mono text-sm text-gray-400">#{proposal.id}</span>
                        <span
                          className={cn(
                            'flex items-center gap-1 rounded px-2 py-0.5 text-xs',
                            getStateColor(proposal.state),
                          )}
                        >
                          {getStateIcon(proposal.state)}
                          {proposal.state}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-sm text-gray-300">{proposal.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                    <div>
                      <span className="text-gray-500">Proposer</span>
                      <p className="font-mono">{proposal.proposer.slice(0, 8)}...</p>
                    </div>
                    <div>
                      <span className="text-gray-500">For Votes</span>
                      <p className="text-green-400">{formatUMA(proposal.forVotes)} UMA</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Against</span>
                      <p className="text-red-400">{formatUMA(proposal.againstVotes)} UMA</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Abstain</span>
                      <p className="text-gray-400">{formatUMA(proposal.abstainVotes)} UMA</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center">
              <Scale className="mx-auto mb-4 h-12 w-12 text-gray-400" />
              <h3 className="mb-2 text-lg font-semibold">No Proposals Found</h3>
              <p className="text-gray-400">
                Governance data will appear here once the governance monitor is configured.
              </p>
              <div className="mt-6 rounded-lg bg-white/5 p-4 text-left">
                <h4 className="mb-2 font-semibold">To enable governance monitoring:</h4>
                <ol className="list-inside list-decimal space-y-1 text-sm text-gray-400">
                  <li>
                    Set{' '}
                    <code className="rounded bg-white/10 px-1">UMA_ETHEREUM_GOVERNOR_ADDRESS</code>{' '}
                    in your environment
                  </li>
                  <li>Ensure your RPC has access to Ethereum mainnet</li>
                  <li>Restart the application to start syncing governance data</li>
                </ol>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-xl bg-white/5 p-6">
            <h3 className="mb-4 text-lg font-semibold">Governance Parameters</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Proposal Threshold</span>
                <span className="font-mono">5,000 UMA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Quorum Votes</span>
                <span className="font-mono">35,000,000 UMA</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Voting Delay</span>
                <span className="font-mono">1 day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Voting Period</span>
                <span className="font-mono">5 days</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-white/5 p-6">
            <h3 className="mb-4 text-lg font-semibold">About Optimistic Oracle Governance</h3>
            <div className="space-y-3 text-gray-400">
              <p>
                Optimistic oracle protocols use decentralized governance systems where token holders
                can propose and vote on protocol changes, including dispute resolution parameters,
                bond requirements, and system upgrades.
              </p>
              <ul className="list-inside list-disc space-y-1">
                <li>Token holders with sufficient stake can create proposals</li>
                <li>Proposals go through a voting period before execution</li>
                <li>Successful proposals are queued in the timelock before execution</li>
                <li>Governance controls protocol parameters and upgrades</li>
              </ul>
              <p className="text-sm">
                Currently showing UMA protocol governance. Support for additional optimistic oracle
                protocols coming soon.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white/5 p-6">
      <div className="mb-2 flex items-center gap-3">
        <div className="text-gray-400">{icon}</div>
        <span className="text-sm text-gray-400">{title}</span>
      </div>
      <div className="text-2xl font-semibold">{value}</div>
    </div>
  );
}
