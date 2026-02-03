'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Globe,
  Activity,
  Shield,
  Zap,
  TrendingUp,
  ArrowRight,
  BarChart3,
  Layers,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn, fetchApiData } from '@/lib/utils';

interface PlatformStats {
  totalProtocols: number;
  totalPriceFeeds: number;
  supportedChains: number;
  avgUpdateLatency: number;
}

interface ProtocolHighlight {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'active' | 'beta' | 'coming_soon';
  features: string[];
}

const PROTOCOLS: ProtocolHighlight[] = [
  {
    id: 'chainlink',
    name: 'Chainlink',
    description: 'The industry-standard decentralized oracle network',
    icon: '🔗',
    status: 'active',
    features: ['Price Feeds', 'VRF', 'Automation'],
  },
  {
    id: 'pyth',
    name: 'Pyth Network',
    description: 'Low-latency financial data from institutional sources',
    icon: '🐍',
    status: 'active',
    features: ['Low Latency', 'High Frequency', 'Confidence Scores'],
  },
  {
    id: 'uma',
    name: 'UMA',
    description: 'Optimistic oracle for custom data verification',
    icon: '⚖️',
    status: 'active',
    features: ['Optimistic Oracle', 'Assertions', 'Disputes'],
  },
  {
    id: 'band',
    name: 'Band Protocol',
    description: 'Cross-chain data oracle platform',
    icon: '🎸',
    status: 'active',
    features: ['Cross-chain', 'Decentralized', 'Custom Data'],
  },
  {
    id: 'api3',
    name: 'API3',
    description: 'First-party oracle with dAPIs',
    icon: '📡',
    status: 'beta',
    features: ['First-party', 'dAPIs', 'DAO Governed'],
  },
  {
    id: 'redstone',
    name: 'RedStone',
    description: 'Modular oracle for L2s and rollups',
    icon: '💎',
    status: 'beta',
    features: ['Modular', 'L2 Optimized', 'Cost Efficient'],
  },
];

export default function OraclePlatformPage() {
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPlatformStats();
  }, []);

  async function fetchPlatformStats() {
    try {
      const data = await fetchApiData<PlatformStats>('/api/oracle/unified/stats');
      setStats(data);
    } catch {
      // Use default stats if API fails
      setStats({
        totalProtocols: 10,
        totalPriceFeeds: 150,
        supportedChains: 15,
        avgUpdateLatency: 500,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-100 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl text-center">
          <Badge variant="secondary" className="mb-6">
            <Zap className="mr-1 h-3 w-3" />
            Multi-Protocol Oracle Monitoring
          </Badge>

          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Universal Oracle
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {' '}
              Monitoring Platform
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-gray-600 sm:text-xl">
            Real-time monitoring, price comparison, and analytics across 10+ oracle protocols.
            Ensure data integrity with cross-protocol verification.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" onClick={() => router.push('/oracle/dashboard')} className="gap-2">
              <Activity className="h-4 w-4" />
              Launch Dashboard
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => router.push('/oracle/protocols/uma')}
              className="gap-2"
            >
              <Shield className="h-4 w-4" />
              Optimistic Oracle
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Supported Protocols"
              value={stats?.totalProtocols || 10}
              icon={<Layers className="h-5 w-5" />}
              loading={loading}
              color="blue"
            />
            <StatCard
              title="Price Feeds"
              value={stats?.totalPriceFeeds || 150}
              icon={<TrendingUp className="h-5 w-5" />}
              loading={loading}
              color="green"
            />
            <StatCard
              title="Supported Chains"
              value={stats?.supportedChains || 15}
              icon={<Globe className="h-5 w-5" />}
              loading={loading}
              color="purple"
            />
            <StatCard
              title="Avg Latency"
              value={`${stats?.avgUpdateLatency || 500}ms`}
              icon={<Zap className="h-5 w-5" />}
              loading={loading}
              color="orange"
            />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">Why Use Our Platform?</h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              Comprehensive monitoring and comparison tools for DeFi oracle infrastructure
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <FeatureCard
              icon={<BarChart3 className="h-8 w-8" />}
              title="Cross-Protocol Comparison"
              description="Compare prices across Chainlink, Pyth, Band, and more. Detect anomalies and ensure data accuracy."
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8" />}
              title="Optimistic Oracle Monitoring"
              description="Track assertions, disputes, and voting across UMA and other optimistic oracle protocols."
            />
            <FeatureCard
              icon={<Activity className="h-8 w-8" />}
              title="Real-Time Alerts"
              description="Get notified of price deviations, stale data, and protocol issues before they impact your dApp."
            />
          </div>
        </div>
      </section>

      {/* Protocols Section */}
      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">Supported Protocols</h2>
            <p className="mx-auto max-w-2xl text-gray-600">
              Monitor all major oracle networks from a single interface
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {PROTOCOLS.map((protocol) => (
              <ProtocolCard key={protocol.id} protocol={protocol} />
            ))}
          </div>

          <div className="mt-12 text-center">
            <Button
              variant="outline"
              onClick={() => router.push('/oracle/dashboard')}
              className="gap-2"
            >
              View All Protocols
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-3xl font-bold text-gray-900">
            Ready to Monitor Your Oracle Infrastructure?
          </h2>
          <p className="mb-8 text-lg text-gray-600">
            Get started with real-time monitoring, price comparisons, and comprehensive analytics
            across all major oracle protocols.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" onClick={() => router.push('/oracle/dashboard')} className="gap-2">
              <Activity className="h-4 w-4" />
              Go to Dashboard
            </Button>
            <Link
              href="/oracle/comparison"
              className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700"
            >
              Compare Protocols
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface StatCardProps {
  title: string;
  value: number | string;
  icon: React.ReactNode;
  loading?: boolean;
  color: 'blue' | 'green' | 'purple' | 'orange';
}

function StatCard({ title, value, icon, loading, color }: StatCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="flex items-center gap-4 p-6">
        <div className={cn('rounded-lg p-3', colorClasses[color])}>{icon}</div>
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className={cn('text-2xl font-bold', loading && 'animate-pulse')}>
            {loading ? '...' : value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <Card className="border-0 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="mb-4 text-purple-600">{icon}</div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </CardContent>
    </Card>
  );
}

interface ProtocolCardProps {
  protocol: ProtocolHighlight;
}

function ProtocolCard({ protocol }: ProtocolCardProps) {
  const statusColors = {
    active: 'bg-green-100 text-green-700',
    beta: 'bg-yellow-100 text-yellow-700',
    coming_soon: 'bg-gray-100 text-gray-500',
  };

  return (
    <Card className="border-0 shadow-sm transition-all hover:shadow-md">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{protocol.icon}</span>
            <div>
              <CardTitle className="text-lg">{protocol.name}</CardTitle>
              <Badge
                variant="secondary"
                className={cn('mt-1 text-xs', statusColors[protocol.status])}
              >
                {protocol.status === 'active' && (
                  <>
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Active
                  </>
                )}
                {protocol.status === 'beta' && 'Beta'}
                {protocol.status === 'coming_soon' && 'Coming Soon'}
              </Badge>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="mb-4 text-sm text-gray-600">{protocol.description}</p>
        <div className="flex flex-wrap gap-2">
          {protocol.features.map((feature) => (
            <span
              key={feature}
              className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600"
            >
              {feature}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
