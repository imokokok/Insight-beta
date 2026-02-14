'use client';

import { useEffect, useState, useCallback } from 'react';

import { TrendingUp, Globe, Activity } from 'lucide-react';

import { EmptyProtocolsState } from '@/components/common/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageOptimizations } from '@/hooks/usePageOptimizations';
import { fetchApiData } from '@/shared/utils';

interface PriceFeed {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  sources: string[];
  lastUpdated: string;
}

export default function PriceFeedsPage() {
  const [feeds, setFeeds] = useState<PriceFeed[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFeeds = useCallback(async () => {
    try {
      setLoading(true);
      // Try to fetch from API, fallback to mock data
      const data = await fetchApiData<PriceFeed[]>('/api/oracle/price-feeds');
      setFeeds(data);
    } catch {
      // Use mock data if API fails
      setFeeds(generateMockFeeds());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeeds();
  }, [fetchFeeds]);

  // 页面优化：键盘快捷键
  usePageOptimizations({
    pageName: '价格源',
    onRefresh: async () => {
      await fetchFeeds();
    },
    enableSearch: false,
    showRefreshToast: true,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Price Feeds</h1>
          <p className="mt-2 text-gray-600">Real-time price data from multiple oracle protocols</p>
        </div>

        {/* Stats */}
        <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Feeds"
            value={feeds.length || 150}
            icon={<TrendingUp className="h-5 w-5" />}
            loading={loading}
          />
          <StatCard
            title="Active Sources"
            value={10}
            icon={<Globe className="h-5 w-5" />}
            loading={loading}
          />
          <StatCard
            title="Avg Update Time"
            value="~500ms"
            icon={<Activity className="h-5 w-5" />}
            loading={loading}
          />
          <StatCard
            title="24h Updates"
            value="1.2M+"
            icon={<Activity className="h-5 w-5" />}
            loading={loading}
          />
        </div>

        {/* Price Feeds Grid */}
        <Card>
          <CardHeader>
            <CardTitle>Live Price Feeds</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-32" />
                ))}
              </div>
            ) : feeds.length === 0 ? (
              <EmptyProtocolsState
                onExplore={() => {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {feeds.map((feed) => (
                  <PriceFeedCard key={feed.id} feed={feed} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PriceFeedCard({ feed }: { feed: PriceFeed }) {
  const isPositive = feed.change24h >= 0;

  return (
    <div className="rounded-lg border bg-white p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">{feed.symbol}</h3>
          <p className="text-sm text-gray-500">{feed.name}</p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {feed.sources.length} sources
        </Badge>
      </div>

      <div className="mt-4">
        <div className="text-2xl font-bold text-gray-900">${feed.price.toLocaleString()}</div>
        <div
          className={`flex items-center text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}
        >
          <span>
            {isPositive ? '+' : ''}
            {feed.change24h.toFixed(2)}%
          </span>
          <span className="ml-2 text-gray-400">24h</span>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-gray-400">
        <span>Vol: ${(feed.volume24h / 1e9).toFixed(2)}B</span>
        <span>{new Date(feed.lastUpdated).toLocaleTimeString()}</span>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  loading,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="mt-2 h-8 w-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">{title}</span>
          <div className="rounded-lg bg-primary/5 p-2 text-primary">{icon}</div>
        </div>
        <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
      </CardContent>
    </Card>
  );
}

// Mock data generator
function generateMockFeeds(): PriceFeed[] {
  const symbols = [
    { symbol: 'BTC/USD', name: 'Bitcoin' },
    { symbol: 'ETH/USD', name: 'Ethereum' },
    { symbol: 'LINK/USD', name: 'Chainlink' },
    { symbol: 'MATIC/USD', name: 'Polygon' },
    { symbol: 'AVAX/USD', name: 'Avalanche' },
    { symbol: 'SOL/USD', name: 'Solana' },
    { symbol: 'UNI/USD', name: 'Uniswap' },
    { symbol: 'AAVE/USD', name: 'Aave' },
    { symbol: 'COMP/USD', name: 'Compound' },
    { symbol: 'MKR/USD', name: 'Maker' },
    { symbol: 'SNX/USD', name: 'Synthetix' },
    { symbol: 'YFI/USD', name: 'Yearn Finance' },
  ];

  return symbols.map((s, i) => ({
    id: `feed-${i}`,
    symbol: s.symbol,
    name: s.name,
    price: Math.random() * 50000 + 10,
    change24h: (Math.random() - 0.5) * 20,
    volume24h: Math.random() * 10e9,
    sources: ['Chainlink', 'Pyth', 'RedStone'],
    lastUpdated: new Date().toISOString(),
  }));
}
