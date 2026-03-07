'use client';

import { useState, useEffect, useCallback } from 'react';

import { motion } from 'framer-motion';
import { AlertTriangle, Activity, TrendingUp, Shield } from 'lucide-react';
import { toast } from 'sonner';

import { ErrorBoundary } from '@/components/common';
import {
  HeroSection,
  PriceTicker,
  ProtocolTimeline,
  MarketOverview,
  AnomalyCenter,
  ActivityFeed,
  QuickNavGrid,
} from '@/features/overview/components';

// Types
interface ProtocolHealth {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  feeds: number;
  activeFeeds: number;
  avgLatency: number;
  lastUpdate: string;
  healthScore: number;
  latencyTrend: number[];
  tvl: string;
  href: string;
}

interface PriceData {
  symbol: string;
  price: number;
  change24h: number;
  protocols: {
    name: string;
    price: number;
    diff: number;
  }[];
}

interface AnomalyData {
  id: string;
  symbol: string;
  timestamp: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  deviationPercent: number;
  avgPrice: number;
  outlierProtocols: string[];
  prices: Record<string, number>;
}

interface ActivityItem {
  id: string;
  type: 'price_update' | 'status_change' | 'anomaly' | 'sync';
  title: string;
  description: string;
  timestamp: string;
  protocol?: string;
  symbol?: string;
  value?: string;
  change?: 'up' | 'down' | 'neutral';
}

interface OverviewStats {
  totalTVL: string;
  activeProtocols: number;
  updates24h: number;
  healthScore: number;
}

// Mock data generators
const generateMockProtocols = (): ProtocolHealth[] => [
  {
    name: 'Chainlink',
    status: 'healthy',
    feeds: 156,
    activeFeeds: 152,
    avgLatency: 180,
    lastUpdate: new Date().toISOString(),
    healthScore: 94,
    latencyTrend: [175, 178, 182, 176, 180, 185, 180],
    tvl: '$22.5B',
    href: '/protocols/chainlink',
  },
  {
    name: 'Pyth',
    status: 'healthy',
    feeds: 150,
    activeFeeds: 148,
    avgLatency: 95,
    lastUpdate: new Date(Date.now() - 30000).toISOString(),
    healthScore: 96,
    latencyTrend: [90, 92, 95, 88, 93, 97, 95],
    tvl: '$15.8B',
    href: '/protocols/pyth',
  },
  {
    name: 'API3',
    status: 'warning',
    feeds: 45,
    activeFeeds: 44,
    avgLatency: 320,
    lastUpdate: new Date(Date.now() - 120000).toISOString(),
    healthScore: 78,
    latencyTrend: [310, 325, 315, 330, 320, 340, 320],
    tvl: '$4.2B',
    href: '/protocols/api3',
  },
  {
    name: 'Band',
    status: 'healthy',
    feeds: 85,
    activeFeeds: 82,
    avgLatency: 280,
    lastUpdate: new Date(Date.now() - 60000).toISOString(),
    healthScore: 88,
    latencyTrend: [275, 280, 285, 278, 282, 290, 280],
    tvl: '$2.7B',
    href: '/protocols/band',
  },
];

const generateMockPrices = (): PriceData[] => [
  {
    symbol: 'BTC/USD',
    price: 67234.56,
    change24h: 2.34,
    protocols: [
      { name: 'Chainlink', price: 67235.0, diff: 0.001 },
      { name: 'Pyth', price: 67234.0, diff: -0.001 },
      { name: 'API3', price: 67233.0, diff: -0.002 },
    ],
  },
  {
    symbol: 'ETH/USD',
    price: 3456.78,
    change24h: -1.23,
    protocols: [
      { name: 'Chainlink', price: 3457.0, diff: 0.006 },
      { name: 'Pyth', price: 3456.5, diff: -0.008 },
      { name: 'API3', price: 3456.2, diff: -0.017 },
    ],
  },
  {
    symbol: 'SOL/USD',
    price: 178.45,
    change24h: 5.67,
    protocols: [
      { name: 'Chainlink', price: 178.5, diff: 0.028 },
      { name: 'Pyth', price: 178.4, diff: -0.028 },
      { name: 'API3', price: 178.45, diff: 0 },
    ],
  },
  {
    symbol: 'LINK/USD',
    price: 18.92,
    change24h: 0.45,
    protocols: [
      { name: 'Chainlink', price: 18.92, diff: 0 },
      { name: 'Pyth', price: 18.91, diff: -0.053 },
      { name: 'API3', price: 18.93, diff: 0.053 },
    ],
  },
];

const generateMockAnomalies = (): AnomalyData[] => [
  {
    id: '1',
    symbol: 'BTC/USD',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    severity: 'medium',
    deviationPercent: 0.025,
    avgPrice: 67234.56,
    outlierProtocols: ['Band'],
    prices: {
      Chainlink: 67235.0,
      Pyth: 67234.0,
      API3: 67233.0,
      Band: 67050.0,
    },
  },
  {
    id: '2',
    symbol: 'ETH/USD',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    severity: 'low',
    deviationPercent: 0.018,
    avgPrice: 3456.78,
    outlierProtocols: ['API3'],
    prices: {
      Chainlink: 3457.0,
      Pyth: 3456.5,
      API3: 3520.0,
      Band: 3456.0,
    },
  },
];

const generateMockActivities = (): ActivityItem[] => [
  {
    id: '1',
    type: 'price_update',
    title: 'BTC/USD Price Updated',
    description: 'New price feed from Chainlink',
    timestamp: new Date(Date.now() - 60000).toISOString(),
    protocol: 'Chainlink',
    symbol: 'BTC/USD',
    value: '$67,234.56',
    change: 'up',
  },
  {
    id: '2',
    type: 'anomaly',
    title: 'Price Deviation Detected',
    description: 'Band showing 0.25% deviation for BTC/USD',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    protocol: 'Band',
    symbol: 'BTC/USD',
  },
  {
    id: '3',
    type: 'status_change',
    title: 'API3 Status Changed',
    description: 'Latency increased to 320ms',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    protocol: 'API3',
  },
  {
    id: '4',
    type: 'sync',
    title: 'Data Sync Complete',
    description: 'All protocols synchronized successfully',
    timestamp: new Date(Date.now() - 900000).toISOString(),
  },
  {
    id: '5',
    type: 'price_update',
    title: 'ETH/USD Price Updated',
    description: 'New price feed from Pyth',
    timestamp: new Date(Date.now() - 1200000).toISOString(),
    protocol: 'Pyth',
    symbol: 'ETH/USD',
    value: '$3,456.78',
    change: 'down',
  },
];

export default function OverviewPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(false);

  // Data states
  const [protocols, setProtocols] = useState<ProtocolHealth[]>([]);
  const [prices, setPrices] = useState<PriceData[]>([]);
  const [anomalies, setAnomalies] = useState<AnomalyData[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [stats] = useState<OverviewStats>({
    totalTVL: '$45.2B',
    activeProtocols: 4,
    updates24h: 1250000,
    healthScore: 89,
  });

  // Market data for charts
  const [marketShare] = useState([
    { name: 'Chainlink', value: 45.2, color: '#3B82F6' },
    { name: 'Pyth', value: 32.5, color: '#EAB308' },
    { name: 'API3', value: 12.8, color: '#10B981' },
    { name: 'Band', value: 9.5, color: '#A855F7' },
  ]);

  const [tvlTrend] = useState(() => {
    const data = [];
    for (let i = 24; i >= 0; i--) {
      data.push({
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
        value: 45000000000 + Math.random() * 2000000000,
      });
    }
    return data;
  });

  const [activityData] = useState(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      data.push({
        date: new Date(Date.now() - i * 86400000).toISOString(),
        updates: 120000 + Math.floor(Math.random() * 20000),
        activeFeeds: 400 + Math.floor(Math.random() * 50),
      });
    }
    return data;
  });

  const fetchData = useCallback(async () => {
    try {
      setIsSyncing(true);
      setSyncStatus('syncing');

      // Simulate API calls
      await new Promise((resolve) => setTimeout(resolve, 800));

      setProtocols(generateMockProtocols());
      setPrices(generateMockPrices());
      setAnomalies(generateMockAnomalies());
      setActivities(generateMockActivities());
      setLastUpdated(new Date());
      setSyncStatus('success');

      toast.success('Data synced successfully', {
        duration: 2000,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      setError(errorMessage);
      setSyncStatus('error');

      toast.error('Sync failed', {
        description: errorMessage,
        duration: 5000,
      });
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Auto refresh
  useEffect(() => {
    if (!autoRefreshEnabled) return;

    const interval = setInterval(() => {
      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefreshEnabled, fetchData]);

  if (error && !protocols.length) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex flex-col items-center justify-center py-20">
          <div className="mb-4 rounded-full bg-red-500/10 p-4">
            <AlertTriangle className="h-8 w-8 text-red-400" />
          </div>
          <h2 className="mb-2 text-xl font-semibold">Failed to load data</h2>
          <p className="mb-4 text-muted-foreground">{error}</p>
          <button
            onClick={fetchData}
            className="text-primary-foreground rounded-lg bg-primary px-4 py-2 transition-colors hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        {/* Hero Section */}
        <HeroSection
          totalTVL={stats.totalTVL}
          activeProtocols={stats.activeProtocols}
          updates24h={stats.updates24h}
          healthScore={stats.healthScore}
          lastUpdated={lastUpdated}
          isSyncing={isSyncing}
          syncStatus={syncStatus}
          autoRefreshEnabled={autoRefreshEnabled}
          onRefresh={fetchData}
          onToggleAutoRefresh={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
        />

        {/* Price Ticker */}
        <PriceTicker prices={prices} isLoading={loading} />

        {/* Main Content */}
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl space-y-8">
            {/* Two Column Layout */}
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
              {/* Left Column - Protocol Timeline */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.1 }}
                className="lg:col-span-2"
              >
                <SectionHeader
                  title="Protocol Status"
                  icon={<Shield className="h-4 w-4" />}
                  description="Real-time health monitoring"
                />
                <div className="mt-4">
                  <ProtocolTimeline protocols={protocols} isLoading={loading} />
                </div>
              </motion.div>

              {/* Right Column - Activity Feed */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <SectionHeader
                  title="Live Activity"
                  icon={<Activity className="h-4 w-4" />}
                  description="Real-time updates"
                />
                <div className="mt-4">
                  <ActivityFeed activities={activities} isLoading={loading} />
                </div>
              </motion.div>
            </div>

            {/* Market Overview Charts */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            >
              <SectionHeader
                title="Market Overview"
                icon={<TrendingUp className="h-4 w-4" />}
                description="Analytics and trends"
              />
              <div className="mt-4">
                <MarketOverview
                  marketShare={marketShare}
                  tvlTrend={tvlTrend}
                  activityData={activityData}
                  isLoading={loading}
                />
              </div>
            </motion.div>

            {/* Anomaly Center */}
            {anomalies.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 }}
              >
                <SectionHeader
                  title="Recent Anomalies"
                  icon={<AlertTriangle className="h-4 w-4" />}
                  description="Price deviations detected"
                />
                <div className="mt-4">
                  <AnomalyCenter anomalies={anomalies} isLoading={loading} />
                </div>
              </motion.div>
            )}

            {/* Quick Navigation */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.5 }}
            >
              <SectionHeader
                title="Quick Access"
                icon={<Activity className="h-4 w-4" />}
                description="Navigate to key features"
              />
              <div className="mt-4">
                <QuickNavGrid isLoading={loading} />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

// Section Header Component
interface SectionHeaderProps {
  title: string;
  icon: React.ReactNode;
  description?: string;
}

function SectionHeader({ title, icon, description }: SectionHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg bg-primary/10 p-2 text-primary">{icon}</div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </div>
    </div>
  );
}
