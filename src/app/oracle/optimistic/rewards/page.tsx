'use client';

import { useEffect, useState } from 'react';
import { Coins, Users, AlertTriangle, RefreshCw, Shield } from 'lucide-react';
import { PageHeader } from '@/components/features/common/PageHeader';
import { cn, fetchApiData, formatTime } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { useI18n } from '@/i18n/LanguageProvider';

interface RewardsStats {
  totalRewardsDistributed: string;
  totalStaked: string;
  totalSlashed: string;
  activeStakers: number;
  averageStake: string;
}

interface Staker {
  id: string;
  voter: string;
  stakedAmount: string;
  pendingRewards: string;
  lastUpdateTime: string;
  chain: string;
}

interface VoterReward {
  id: string;
  voter: string;
  assertionId: string;
  rewardAmount: string;
  claimed: boolean;
  claimedAt?: string;
  claimDeadline: string;
  chain: string;
}

interface SlashingRecord {
  id: string;
  voter: string;
  assertionId: string;
  slashAmount: string;
  reason: string;
  timestamp: string;
  chain: string;
}

export default function UMARewardsPage() {
  const { lang } = useI18n();
  const [stats, setStats] = useState<RewardsStats | null>(null);
  const [stakers, setStakers] = useState<Staker[]>([]);
  const [rewards, setRewards] = useState<VoterReward[]>([]);
  const [slashing, setSlashing] = useState<SlashingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'stakers' | 'rewards' | 'slashing'>(
    'overview',
  );

  useEffect(() => {
    fetchAllData();

    const pollInterval = setInterval(() => {
      if (!isRefreshing) {
        fetchAllData();
      }
    }, 60000); // Poll every minute

    return () => clearInterval(pollInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchAllData() {
    try {
      setIsRefreshing(true);
      await Promise.all([
        fetchStats(),
        fetchStakers(),
        fetchRecentRewards(),
        fetchRecentSlashing(),
      ]);
    } catch (error) {
      logger.error('Failed to fetch rewards data', { error });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  async function fetchStats() {
    const data = await fetchApiData<RewardsStats>('/api/oracle/uma/rewards');
    setStats(data);
  }

  async function fetchStakers() {
    const data = await fetchApiData<{ stakers: Staker[]; pagination: { total: number } }>(
      '/api/oracle/uma/staking?limit=20',
    );
    setStakers(data.stakers);
  }

  async function fetchRecentRewards() {
    // Fetch recent claimed rewards
    const data = await fetchApiData<{ data: { rewards: VoterReward[] } }>(
      '/api/oracle/uma/rewards?claimed=true&limit=10',
    );
    setRewards(data.data.rewards);
  }

  async function fetchRecentSlashing() {
    // This would need a specific endpoint or filter
    // For now, we'll show empty state
    setSlashing([]);
  }

  async function triggerRewardsSync() {
    try {
      setIsRefreshing(true);
      await fetchApiData('/api/oracle/uma/rewards', { method: 'POST' });
      await fetchAllData();
    } catch (error) {
      logger.error('Failed to trigger rewards sync', { error });
    } finally {
      setIsRefreshing(false);
    }
  }

  function formatUMA(amount: string): string {
    const num = Number(amount) / 1e18;
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

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
              title="UMA Rewards & Staking"
              description="Monitor voter rewards, staking positions, and slashing events"
            />
            <div className="flex gap-2">
              <button
                onClick={triggerRewardsSync}
                disabled={isRefreshing}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                {isRefreshing ? 'Syncing...' : 'Sync Rewards'}
              </button>
            </div>
          </div>
        </div>

        <div className="mb-6 flex gap-4">
          {(['overview', 'stakers', 'rewards', 'slashing'] as const).map((tab) => (
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

        {activeTab === 'overview' && stats && (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Rewards Distributed"
                value={`${formatUMA(stats.totalRewardsDistributed)} UMA`}
                icon={<Coins className="h-5 w-5 text-green-400" />}
                trend="+12.5%"
              />
              <StatCard
                title="Total Staked"
                value={`${formatUMA(stats.totalStaked)} UMA`}
                icon={<Shield className="h-5 w-5 text-blue-400" />}
                trend="+5.2%"
              />
              <StatCard
                title="Active Stakers"
                value={stats.activeStakers.toLocaleString()}
                icon={<Users className="h-5 w-5 text-purple-400" />}
              />
              <StatCard
                title="Total Slashed"
                value={`${formatUMA(stats.totalSlashed)} UMA`}
                icon={<AlertTriangle className="h-5 w-5 text-red-400" />}
                trend="-2.1%"
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl bg-white/5 p-6">
                <h3 className="mb-4 text-lg font-semibold">Top Stakers</h3>
                <div className="space-y-3">
                  {stakers.slice(0, 5).map((staker, index) => (
                    <div
                      key={staker.id}
                      className="flex items-center justify-between rounded-lg bg-white/5 p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs">
                          {index + 1}
                        </span>
                        <span className="font-mono text-sm">
                          {staker.voter.slice(0, 6)}...{staker.voter.slice(-4)}
                        </span>
                      </div>
                      <span className="font-semibold">{formatUMA(staker.stakedAmount)} UMA</span>
                    </div>
                  ))}
                  {stakers.length === 0 && (
                    <p className="py-8 text-center text-gray-400">No staking data yet</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-white/5 p-6">
                <h3 className="mb-4 text-lg font-semibold">Recent Rewards</h3>
                <div className="space-y-3">
                  {rewards.slice(0, 5).map((reward) => (
                    <div
                      key={reward.id}
                      className="flex items-center justify-between rounded-lg bg-white/5 p-3"
                    >
                      <div>
                        <span className="font-mono text-sm">
                          {reward.voter.slice(0, 6)}...{reward.voter.slice(-4)}
                        </span>
                        <span className="ml-2 text-xs text-gray-400">
                          {reward.claimed ? 'Claimed' : 'Pending'}
                        </span>
                      </div>
                      <span className="font-semibold text-green-400">
                        +{formatUMA(reward.rewardAmount)} UMA
                      </span>
                    </div>
                  ))}
                  {rewards.length === 0 && (
                    <p className="py-8 text-center text-gray-400">No rewards claimed yet</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab === 'stakers' && (
          <div className="rounded-xl bg-white/5 p-6">
            <h3 className="mb-4 text-lg font-semibold">All Stakers</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-left text-sm text-gray-400">
                    <th className="pb-3 pr-4">Rank</th>
                    <th className="pb-3 pr-4">Voter</th>
                    <th className="pb-3 pr-4">Staked Amount</th>
                    <th className="pb-3 pr-4">Pending Rewards</th>
                    <th className="pb-3">Last Update</th>
                  </tr>
                </thead>
                <tbody>
                  {stakers.map((staker, index) => (
                    <tr key={staker.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 pr-4 text-gray-400">{index + 1}</td>
                      <td className="py-3 pr-4 font-mono">{staker.voter}</td>
                      <td className="py-3 pr-4">{formatUMA(staker.stakedAmount)} UMA</td>
                      <td className="py-3 pr-4 text-green-400">
                        {formatUMA(staker.pendingRewards)} UMA
                      </td>
                      <td className="py-3 text-gray-400">
                        {formatTime(staker.lastUpdateTime, lang)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {stakers.length === 0 && (
                <p className="py-8 text-center text-gray-400">No stakers found</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'rewards' && (
          <div className="rounded-xl bg-white/5 p-6">
            <h3 className="mb-4 text-lg font-semibold">Reward History</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-left text-sm text-gray-400">
                    <th className="pb-3 pr-4">Voter</th>
                    <th className="pb-3 pr-4">Assertion ID</th>
                    <th className="pb-3 pr-4">Amount</th>
                    <th className="pb-3 pr-4">Status</th>
                    <th className="pb-3">Claim Deadline</th>
                  </tr>
                </thead>
                <tbody>
                  {rewards.map((reward) => (
                    <tr key={reward.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 pr-4 font-mono">{reward.voter.slice(0, 12)}...</td>
                      <td className="py-3 pr-4 font-mono">{reward.assertionId.slice(0, 16)}...</td>
                      <td className="py-3 pr-4 text-green-400">
                        {formatUMA(reward.rewardAmount)} UMA
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={cn(
                            'rounded px-2 py-1 text-xs',
                            reward.claimed
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-yellow-500/20 text-yellow-400',
                          )}
                        >
                          {reward.claimed ? 'Claimed' : 'Pending'}
                        </span>
                      </td>
                      <td className="py-3 text-gray-400">
                        {formatTime(reward.claimDeadline, lang)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rewards.length === 0 && (
                <p className="py-8 text-center text-gray-400">No rewards found</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'slashing' && (
          <div className="rounded-xl bg-white/5 p-6">
            <h3 className="mb-4 text-lg font-semibold">Slashing History</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-left text-sm text-gray-400">
                    <th className="pb-3 pr-4">Voter</th>
                    <th className="pb-3 pr-4">Assertion ID</th>
                    <th className="pb-3 pr-4">Amount Slashed</th>
                    <th className="pb-3 pr-4">Reason</th>
                    <th className="pb-3">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {slashing.map((record) => (
                    <tr key={record.id} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 pr-4 font-mono">{record.voter.slice(0, 12)}...</td>
                      <td className="py-3 pr-4 font-mono">{record.assertionId.slice(0, 16)}...</td>
                      <td className="py-3 pr-4 text-red-400">
                        {formatUMA(record.slashAmount)} UMA
                      </td>
                      <td className="py-3 pr-4">{record.reason}</td>
                      <td className="py-3 text-gray-400">{formatTime(record.timestamp, lang)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {slashing.length === 0 && (
                <p className="py-8 text-center text-gray-400">No slashing events found</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  trend,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
}) {
  return (
    <div className="rounded-xl bg-white/5 p-6">
      <div className="mb-2 flex items-center gap-3">
        <div className="text-gray-400">{icon}</div>
        <span className="text-sm text-gray-400">{title}</span>
      </div>
      <div className="flex items-end justify-between">
        <div className="text-2xl font-semibold">{value}</div>
        {trend && (
          <span
            className={cn('text-sm', trend.startsWith('+') ? 'text-green-400' : 'text-red-400')}
          >
            {trend}
          </span>
        )}
      </div>
    </div>
  );
}
