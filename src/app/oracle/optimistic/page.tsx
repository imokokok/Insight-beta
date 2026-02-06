'use client';

/* eslint-disable no-restricted-syntax */

import { useEffect, useState } from 'react';
import {
  ArrowUpRight,
  RefreshCw,
  Users,
  Gavel,
  FileText,
  TrendingUp,
  Settings,
  Coins,
  Layers,
  BarChart3,
  Scale,
  Shield,
  ChevronDown,
} from 'lucide-react';
import { PageHeader } from '@/components/features/common/PageHeader';
import { cn, fetchApiData } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { useI18n } from '@/i18n/LanguageProvider';
import { langToLocale } from '@/i18n/translations';

// 支持多协议乐观预言机
interface OptimisticProtocol {
  id: string;
  name: string;
  description: string;
  icon: string;
  supportedChains: string[];
}

const SUPPORTED_PROTOCOLS: OptimisticProtocol[] = [
  {
    id: 'uma',
    name: 'UMA',
    description: 'Universal Market Access - Optimistic oracle for custom data verification',
    icon: '⚖️',
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'base'],
  },
  {
    id: 'optimistic',
    name: 'Optimistic Oracle (Generic)',
    description: 'Generic optimistic oracle interface supporting multiple implementations',
    icon: '🛡️',
    supportedChains: ['ethereum', 'arbitrum', 'optimism'],
  },
];

interface OptimisticOracleOverview {
  instanceId: string;
  timestamp: string;
  protocol: string;
  config: {
    chain: string;
    ooV2Address?: string;
    ooV3Address?: string;
    enabled: boolean;
  };
  sync: {
    lastProcessedBlock: string;
    latestBlock: string | null;
    lastSuccessAt: string | null;
    lastError: string | null;
    syncing: boolean;
  };
  stats: {
    totalAssertions: number;
    totalDisputes: number;
  };
  availableInstances: Array<{ id: string; chain: string; protocol: string }>;
}

interface OptimisticOracleLeaderboard {
  metric: string;
  protocol: string;
  top: Array<{
    address: string;
    count: number;
    bond: string;
    won: number;
  }>;
  generatedAt: string;
}

export default function OptimisticOraclePage() {
  const { lang } = useI18n();
  const [selectedProtocol, setSelectedProtocol] = useState<string>('uma');
  const [overview, setOverview] = useState<OptimisticOracleOverview | null>(null);
  const [leaderboard, setLeaderboard] = useState<OptimisticOracleLeaderboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'stats'>('overview');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProtocolDropdown, setShowProtocolDropdown] = useState(false);

  useEffect(() => {
    fetchOverview();
    fetchLeaderboard();

    const pollInterval = setInterval(() => {
      if (!isRefreshing) {
        fetchOverview();
      }
    }, 30000);

    return () => clearInterval(pollInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProtocol]);

  async function fetchOverview() {
    try {
      setIsRefreshing(true);
      const data = await fetchApiData<OptimisticOracleOverview>(
        `/api/oracle/optimistic?protocol=${selectedProtocol}`,
      );
      setOverview(data);
      setLastUpdated(new Date());
    } catch (error) {
      logger.error('Failed to fetch optimistic oracle overview', { error });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  async function fetchLeaderboard() {
    try {
      setIsRefreshing(true);
      const data = await fetchApiData<OptimisticOracleLeaderboard>(
        `/api/oracle/optimistic/leaderboard?protocol=${selectedProtocol}&metric=proposals`,
      );
      setLeaderboard(data);
    } catch (error) {
      logger.error('Failed to fetch leaderboard', { error });
    } finally {
      setIsRefreshing(false);
    }
  }

  async function triggerSync() {
    try {
      setIsRefreshing(true);
      await fetchApiData(`/api/oracle/optimistic/sync?protocol=${selectedProtocol}`, {
        method: 'POST',
      });
      await fetchOverview();
    } catch (error) {
      logger.error('Failed to trigger sync', { error });
    } finally {
      setIsRefreshing(false);
    }
  }

  const currentProtocol = SUPPORTED_PROTOCOLS.find((p) => p.id === selectedProtocol);

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
              title="Optimistic Oracle Monitor"
              description="Track assertions, disputes, and resolutions across multiple optimistic oracle protocols"
            />
            <div className="flex gap-2">
              {/* Protocol Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowProtocolDropdown(!showProtocolDropdown)}
                  className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 transition-colors hover:bg-white/20"
                >
                  <span className="text-lg">{currentProtocol?.icon}</span>
                  <span>{currentProtocol?.name}</span>
                  <ChevronDown className="h-4 w-4" />
                </button>
                {showProtocolDropdown && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-lg border border-white/10 bg-[#1A1A1F] shadow-xl">
                    {SUPPORTED_PROTOCOLS.map((protocol) => (
                      <button
                        key={protocol.id}
                        onClick={() => {
                          setSelectedProtocol(protocol.id);
                          setShowProtocolDropdown(false);
                        }}
                        className={cn(
                          'flex w-full items-start gap-3 p-3 text-left transition-colors hover:bg-white/5',
                          selectedProtocol === protocol.id && 'bg-white/10',
                        )}
                      >
                        <span className="text-2xl">{protocol.icon}</span>
                        <div>
                          <div className="font-medium">{protocol.name}</div>
                          <div className="text-xs text-gray-400">{protocol.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={triggerSync}
                disabled={isRefreshing}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                {isRefreshing ? 'Syncing...' : 'Sync Now'}
              </button>
              <a
                href={`/api/oracle/optimistic/config?protocol=${selectedProtocol}`}
                className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 transition-colors hover:bg-white/20"
              >
                <Settings className="h-4 w-4" />
                Config
              </a>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'h-2 w-2 rounded-full',
                  overview?.sync.syncing ? 'animate-pulse bg-yellow-400' : 'bg-green-400',
                )}
              />
              <span className="text-gray-400">
                {overview?.sync.syncing ? 'Syncing...' : 'Idle'}
              </span>
            </div>
            {lastUpdated && (
              <span className="text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString(langToLocale[lang])}
              </span>
            )}
          </div>
        </div>

        <div className="mb-6 flex gap-4">
          {(['overview', 'leaderboard', 'stats'] as const).map((tab) => (
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

        {activeTab === 'overview' && overview && (
          <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Protocol"
              value={overview.protocol}
              icon={<Shield className="h-5 w-5" />}
            />
            <StatCard
              title="Chain"
              value={overview.config.chain}
              icon={<TrendingUp className="h-5 w-5" />}
            />
            <StatCard
              title="Assertions"
              value={overview.stats.totalAssertions.toLocaleString()}
              icon={<FileText className="h-5 w-5" />}
            />
            <StatCard
              title="Disputes"
              value={overview.stats.totalDisputes.toLocaleString()}
              icon={<Gavel className="h-5 w-5" />}
            />
          </div>
        )}

        {activeTab === 'overview' && overview && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-white/5 p-6">
              <h3 className="mb-4 text-lg font-semibold">Sync Status</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Processed Block</span>
                  <span className="font-mono">{overview.sync.lastProcessedBlock}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Latest Block</span>
                  <span className="font-mono">{overview.sync.latestBlock ?? 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span
                    className={cn(
                      'rounded px-2 py-1 text-xs',
                      overview.sync.syncing
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-green-500/20 text-green-400',
                    )}
                  >
                    {overview.sync.syncing ? 'Syncing' : 'Idle'}
                  </span>
                </div>
                {overview.sync.lastError && (
                  <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
                    {overview.sync.lastError}
                  </div>
                )}
              </div>
            </div>

            {overview.config.ooV2Address && (
              <div className="rounded-xl bg-white/5 p-6">
                <h3 className="mb-4 text-lg font-semibold">Contract Addresses</h3>
                <div className="space-y-3">
                  {overview.config.ooV2Address && (
                    <div>
                      <span className="mb-1 block text-sm text-gray-400">Optimistic Oracle V2</span>
                      <a
                        href={`https://etherscan.io/address/${overview.config.ooV2Address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 font-mono text-sm transition-colors hover:text-blue-400"
                      >
                        {overview.config.ooV2Address?.slice(0, 6)}...
                        {overview.config.ooV2Address?.slice(-4)}
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                  {overview.config.ooV3Address && (
                    <div>
                      <span className="mb-1 block text-sm text-gray-400">Optimistic Oracle V3</span>
                      <a
                        href={`https://etherscan.io/address/${overview.config.ooV3Address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 font-mono text-sm transition-colors hover:text-blue-400"
                      >
                        {overview.config.ooV3Address?.slice(0, 6)}...
                        {overview.config.ooV3Address?.slice(-4)}
                        <ArrowUpRight className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'leaderboard' && leaderboard && (
          <div className="rounded-xl bg-white/5 p-6">
            <h3 className="mb-4 text-lg font-semibold">Top Proposers ({leaderboard.metric})</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-left text-sm text-gray-400">
                    <th className="pb-3 pr-4">#</th>
                    <th className="pb-3 pr-4">Address</th>
                    <th className="pb-3 pr-4">Count</th>
                    <th className="pb-3 pr-4">Bond</th>
                    <th className="pb-3">Won</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.top.map((item, index) => (
                    <tr key={item.address} className="border-b border-white/5 hover:bg-white/5">
                      <td className="py-3 pr-4 text-gray-400">{index + 1}</td>
                      <td className="py-3 pr-4">
                        <a
                          href={`/api/oracle/optimistic/users/${item.address}/stats?protocol=${selectedProtocol}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono transition-colors hover:text-blue-400"
                        >
                          {item.address.slice(0, 6)}...{item.address.slice(-4)}
                        </a>
                      </td>
                      <td className="py-3 pr-4">{item.count}</td>
                      <td className="py-3 pr-4 font-mono">{Number(item.bond).toLocaleString()}</td>
                      <td className="py-3 text-green-400">{item.won}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {leaderboard.top.length === 0 && (
                <p className="py-8 text-center text-gray-400">No data yet. Start syncing!</p>
              )}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <a
              href={`/api/oracle/optimistic/assertions?protocol=${selectedProtocol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-white/5 p-6 transition-colors hover:bg-white/10"
            >
              <div className="mb-4 flex items-center gap-3">
                <FileText className="h-6 w-6 text-blue-400" />
                <h3 className="text-lg font-semibold">Assertions</h3>
              </div>
              <p className="text-gray-400">
                View all optimistic oracle assertions with filtering by status, identifier, and
                time.
              </p>
            </a>

            <a
              href={`/api/oracle/optimistic/disputes?protocol=${selectedProtocol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-white/5 p-6 transition-colors hover:bg-white/10"
            >
              <div className="mb-4 flex items-center gap-3">
                <Gavel className="h-6 w-6 text-orange-400" />
                <h3 className="text-lg font-semibold">Disputes</h3>
              </div>
              <p className="text-gray-400">
                View all active and settled disputes with voting status.
              </p>
            </a>

            <a
              href={`/api/oracle/optimistic/votes?protocol=${selectedProtocol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-white/5 p-6 transition-colors hover:bg-white/10"
            >
              <div className="mb-4 flex items-center gap-3">
                <Users className="h-6 w-6 text-purple-400" />
                <h3 className="text-lg font-semibold">Votes</h3>
              </div>
              <p className="text-gray-400">Query voting records for optimistic oracle proposals.</p>
            </a>

            <a
              href={`/api/oracle/optimistic/stats?protocol=${selectedProtocol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl bg-white/5 p-6 transition-colors hover:bg-white/10"
            >
              <div className="mb-4 flex items-center gap-3">
                <TrendingUp className="h-6 w-6 text-green-400" />
                <h3 className="text-lg font-semibold">Statistics</h3>
              </div>
              <p className="text-gray-400">
                View detailed statistics and metrics for optimistic oracle activity.
              </p>
            </a>

            <a
              href="/oracle/optimistic/rewards"
              className="rounded-xl bg-white/5 p-6 transition-colors hover:bg-white/10"
            >
              <div className="mb-4 flex items-center gap-3">
                <Coins className="h-6 w-6 text-yellow-400" />
                <h3 className="text-lg font-semibold">Rewards & Staking</h3>
              </div>
              <p className="text-gray-400">
                Monitor voter rewards, staking positions, and slashing events.
              </p>
            </a>

            <a
              href="/oracle/optimistic/tvl"
              className="rounded-xl bg-white/5 p-6 transition-colors hover:bg-white/10"
            >
              <div className="mb-4 flex items-center gap-3">
                <Layers className="h-6 w-6 text-cyan-400" />
                <h3 className="text-lg font-semibold">TVL Monitor</h3>
              </div>
              <p className="text-gray-400">
                Track Total Value Locked across optimistic oracle contracts on multiple chains.
              </p>
            </a>

            <a
              href="/oracle/optimistic/polymarket"
              className="rounded-xl bg-white/5 p-6 transition-colors hover:bg-white/10"
            >
              <div className="mb-4 flex items-center gap-3">
                <BarChart3 className="h-6 w-6 text-pink-400" />
                <h3 className="text-lg font-semibold">Prediction Markets</h3>
              </div>
              <p className="text-gray-400">
                Monitor prediction markets powered by optimistic oracle.
              </p>
            </a>

            <a
              href="/oracle/optimistic/governance"
              className="rounded-xl bg-white/5 p-6 transition-colors hover:bg-white/10"
            >
              <div className="mb-4 flex items-center gap-3">
                <Scale className="h-6 w-6 text-indigo-400" />
                <h3 className="text-lg font-semibold">Governance</h3>
              </div>
              <p className="text-gray-400">
                Track optimistic oracle protocol governance proposals and voting.
              </p>
            </a>
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
