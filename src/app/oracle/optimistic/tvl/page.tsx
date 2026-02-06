'use client';

/* eslint-disable no-restricted-syntax */

import { useEffect, useState } from 'react';
import { TrendingUp, Layers, Activity, DollarSign, RefreshCw, BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/features/common/PageHeader';
import { cn, fetchApiData, formatTime } from '@/lib/utils';
import { logger } from '@/lib/logger';
import { useI18n } from '@/i18n/LanguageProvider';

interface TVLData {
  chainId: number;
  timestamp: string;
  totalStaked: string;
  totalBonded: string;
  totalRewards: string;
  oracleTvl: string;
  dvmTvl: string;
  activeAssertions: number;
  activeDisputes: number;
}

interface TVLResponse {
  chainId: number;
  current: TVLData | null;
  history: TVLData[];
}

export default function UMATvlPage() {
  const { lang } = useI18n();
  const [tvlData, setTvlData] = useState<TVLResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedChain, setSelectedChain] = useState<number>(1);

  useEffect(() => {
    fetchTvlData();

    const pollInterval = setInterval(() => {
      if (!isRefreshing) {
        fetchTvlData();
      }
    }, 60000);

    return () => clearInterval(pollInterval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChain]);

  async function fetchTvlData() {
    try {
      setIsRefreshing(true);
      const data = await fetchApiData<TVLResponse>(
        `/api/oracle/uma/tvl?chainId=${selectedChain}&hours=24`,
      );
      setTvlData(data);
    } catch (error) {
      logger.error('Failed to fetch TVL data', { error });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  async function triggerTvlSync() {
    try {
      setIsRefreshing(true);
      await fetchApiData(`/api/oracle/uma/tvl/sync?chainId=${selectedChain}`, { method: 'POST' });
      await fetchTvlData();
    } catch (error) {
      logger.error('Failed to trigger TVL sync', { error });
    } finally {
      setIsRefreshing(false);
    }
  }

  function formatUMA(amount: string): string {
    const num = Number(amount) / 1e18;
    return num.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }

  function formatUSD(amount: string, price: number = 2.5): string {
    const num = (Number(amount) / 1e18) * price;
    return `$${num.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  }

  const chains = [
    { id: 1, name: 'Ethereum', color: 'bg-blue-500' },
    { id: 137, name: 'Polygon', color: 'bg-purple-500' },
    { id: 42161, name: 'Arbitrum', color: 'bg-indigo-500' },
    { id: 10, name: 'Optimism', color: 'bg-red-500' },
  ];

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

  const current = tvlData?.current;

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <PageHeader
              title="UMA TVL Monitor"
              description="Track Total Value Locked across UMA contracts"
            />
            <div className="flex gap-2">
              <button
                onClick={triggerTvlSync}
                disabled={isRefreshing}
                className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 transition-colors hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                {isRefreshing ? 'Syncing...' : 'Sync TVL'}
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            {chains.map((chain) => (
              <button
                key={chain.id}
                onClick={() => setSelectedChain(chain.id)}
                className={cn(
                  'rounded-lg px-4 py-2 transition-colors',
                  selectedChain === chain.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/5 hover:bg-white/10',
                )}
              >
                {chain.name}
              </button>
            ))}
          </div>
        </div>

        {current && (
          <>
            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total TVL"
                value={formatUMA(current.oracleTvl)}
                subValue={formatUSD(current.oracleTvl)}
                icon={<TrendingUp className="h-5 w-5 text-green-400" />}
              />
              <StatCard
                title="DVM Staked"
                value={formatUMA(current.dvmTvl)}
                subValue={formatUSD(current.dvmTvl)}
                icon={<Layers className="h-5 w-5 text-blue-400" />}
              />
              <StatCard
                title="Active Assertions"
                value={current.activeAssertions.toLocaleString()}
                icon={<Activity className="h-5 w-5 text-yellow-400" />}
              />
              <StatCard
                title="Active Disputes"
                value={current.activeDisputes.toLocaleString()}
                icon={<BarChart3 className="h-5 w-5 text-orange-400" />}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <div className="rounded-xl bg-white/5 p-6">
                <h3 className="mb-4 text-lg font-semibold">TVL Breakdown</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20">
                        <Layers className="h-5 w-5 text-blue-400" />
                      </div>
                      <div>
                        <p className="font-medium">Optimistic Oracle</p>
                        <p className="text-sm text-gray-400">Bonded collateral</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatUMA(current.totalBonded)} UMA</p>
                      <p className="text-sm text-gray-400">{formatUSD(current.totalBonded)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20">
                        <DollarSign className="h-5 w-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium">DVM Staking</p>
                        <p className="text-sm text-gray-400">Voter stakes</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatUMA(current.totalStaked)} UMA</p>
                      <p className="text-sm text-gray-400">{formatUSD(current.totalStaked)}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20">
                        <TrendingUp className="h-5 w-5 text-green-400" />
                      </div>
                      <div>
                        <p className="font-medium">Reward Pool</p>
                        <p className="text-sm text-gray-400">Available rewards</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatUMA(current.totalRewards)} UMA</p>
                      <p className="text-sm text-gray-400">{formatUSD(current.totalRewards)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-white/5 p-6">
                <h3 className="mb-4 text-lg font-semibold">24h TVL History</h3>
                <div className="space-y-3">
                  {tvlData?.history.slice(0, 10).map((record) => (
                    <div
                      key={record.timestamp}
                      className="flex items-center justify-between rounded-lg bg-white/5 p-3"
                    >
                      <span className="text-sm text-gray-400">
                        {formatTime(record.timestamp, lang)}
                      </span>
                      <span className="font-mono">{formatUMA(record.oracleTvl)} UMA</span>
                    </div>
                  ))}
                  {(tvlData?.history.length || 0) === 0 && (
                    <p className="py-8 text-center text-gray-400">No TVL history available</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {!current && (
          <div className="rounded-xl bg-white/5 p-12 text-center">
            <TrendingUp className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-semibold">No TVL Data Available</h3>
            <p className="mb-4 text-gray-400">Click the sync button to fetch TVL data</p>
            <button
              onClick={triggerTvlSync}
              disabled={isRefreshing}
              className="rounded-lg bg-blue-600 px-6 py-2 transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {isRefreshing ? 'Syncing...' : 'Sync TVL Data'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subValue,
  icon,
}: {
  title: string;
  value: string | number;
  subValue?: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl bg-white/5 p-6">
      <div className="mb-2 flex items-center gap-3">
        <div className="text-gray-400">{icon}</div>
        <span className="text-sm text-gray-400">{title}</span>
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      {subValue && <div className="text-sm text-gray-400">{subValue}</div>}
    </div>
  );
}
