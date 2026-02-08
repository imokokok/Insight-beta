'use client';

import { useEffect, useState } from 'react';

import { BarChart3, TrendingUp, CheckCircle, RefreshCw, Activity } from 'lucide-react';

import { PageHeader } from '@/components/features/common/PageHeader';
import { useI18n } from '@/i18n/LanguageProvider';
import { logger } from '@/lib/logger';
import { cn, fetchApiData, formatTime } from '@/lib/utils';

interface Market {
  id: string;
  conditionId: string;
  question: string;
  creator: string;
  collateralToken: string;
  fee: string;
  createdAt: string;
  resolved: boolean;
  resolutionTime?: string;
  outcome?: number;
  volume: string;
  liquidity: string;
  chain: string;
  updatedAt: string;
}

interface MarketStats {
  totalMarkets: number;
  resolvedMarkets: number;
  activeMarkets: number;
  totalVolume: string;
  totalLiquidity: string;
}

export default function PolymarketPage() {
  const { lang } = useI18n();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [stats, setStats] = useState<MarketStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'resolved'>('all');

  useEffect(() => {
    fetchMarkets();

    const pollInterval = setInterval(() => {
      if (!isRefreshing) {
        fetchMarkets();
      }
    }, 60000);

    return () => clearInterval(pollInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  async function fetchMarkets() {
    try {
      setIsRefreshing(true);

      const resolvedParam =
        activeTab === 'active' ? 'false' : activeTab === 'resolved' ? 'true' : undefined;
      const url = resolvedParam
        ? `/api/oracle/uma/polymarket?resolved=${resolvedParam}&limit=50`
        : '/api/oracle/uma/polymarket?limit=50';

      const data = await fetchApiData<{ markets: Market[]; stats: MarketStats }>(url);
      setMarkets(data.markets);
      setStats(data.stats);
    } catch (error) {
      logger.error('Failed to fetch Polymarket data', { error });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  function formatUSDC(amount: string): string {
    const num = Number(amount) / 1e6;
    return `$${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }

  function formatFee(fee: string): string {
    const num = Number(fee) / 1e18;
    return `${(num * 100).toFixed(2)}%`;
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
              title="Polymarket Integration"
              description="Monitor prediction markets powered by UMA oracle"
            />
            <div className="flex gap-2">
              <button
                onClick={fetchMarkets}
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
              title="Total Markets"
              value={stats.totalMarkets.toLocaleString()}
              icon={<BarChart3 className="h-5 w-5 text-blue-400" />}
            />
            <StatCard
              title="Active Markets"
              value={stats.activeMarkets.toLocaleString()}
              icon={<Activity className="h-5 w-5 text-green-400" />}
            />
            <StatCard
              title="Total Volume"
              value={formatUSDC(stats.totalVolume)}
              icon={<TrendingUp className="h-5 w-5 text-purple-400" />}
            />
            <StatCard
              title="Total Liquidity"
              value={formatUSDC(stats.totalLiquidity)}
              icon={<TrendingUp className="h-5 w-5 text-yellow-400" />}
            />
          </div>
        )}

        <div className="mb-6 flex gap-4">
          {(['all', 'active', 'resolved'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                'rounded-lg px-4 py-2 capitalize transition-colors',
                activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white/5 hover:bg-white/10',
              )}
            >
              {tab} Markets
            </button>
          ))}
        </div>

        <div className="rounded-xl bg-white/5 p-6">
          <h3 className="mb-4 text-lg font-semibold">
            {activeTab === 'all'
              ? 'All Markets'
              : activeTab === 'active'
                ? 'Active Markets'
                : 'Resolved Markets'}
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10 text-left text-sm text-gray-400">
                  <th className="pb-3 pr-4">Condition ID</th>
                  <th className="pb-3 pr-4">Creator</th>
                  <th className="pb-3 pr-4">Fee</th>
                  <th className="pb-3 pr-4">Volume</th>
                  <th className="pb-3 pr-4">Liquidity</th>
                  <th className="pb-3 pr-4">Status</th>
                  <th className="pb-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {markets.map((market) => (
                  <tr key={market.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-3 pr-4 font-mono text-sm">
                      {market.conditionId.slice(0, 12)}...{market.conditionId.slice(-4)}
                    </td>
                    <td className="py-3 pr-4 font-mono text-sm">
                      {market.creator.slice(0, 6)}...{market.creator.slice(-4)}
                    </td>
                    <td className="py-3 pr-4">{formatFee(market.fee)}</td>
                    <td className="py-3 pr-4">{formatUSDC(market.volume)}</td>
                    <td className="py-3 pr-4">{formatUSDC(market.liquidity)}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={cn(
                          'flex items-center gap-1 rounded px-2 py-1 text-xs',
                          market.resolved
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-blue-500/20 text-blue-400',
                        )}
                      >
                        {market.resolved ? (
                          <>
                            <CheckCircle className="h-3 w-3" /> Resolved
                          </>
                        ) : (
                          <>
                            <Activity className="h-3 w-3" /> Active
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-400">
                      {formatTime(market.createdAt, lang)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {markets.length === 0 && (
              <p className="py-8 text-center text-gray-400">No markets found</p>
            )}
          </div>
        </div>

        <div className="mt-8 rounded-xl bg-white/5 p-6">
          <h3 className="mb-4 text-lg font-semibold">About Polymarket Integration</h3>
          <div className="space-y-4 text-gray-400">
            <p>
              Polymarket is a prediction market platform that uses UMA&apos;s Optimistic Oracle for
              trustless market resolution. This integration allows you to:
            </p>
            <ul className="list-inside list-disc space-y-2">
              <li>Monitor all prediction markets created on Polymarket</li>
              <li>Track market resolutions and outcomes</li>
              <li>View trading volume and liquidity data</li>
              <li>Verify UMA oracle resolutions</li>
            </ul>
            <p className="text-sm">
              Note: This is a read-only monitoring interface. To trade on Polymarket, visit{' '}
              <a
                href="https://polymarket.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:underline"
              >
                polymarket.com
              </a>
            </p>
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
