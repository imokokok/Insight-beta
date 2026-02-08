'use client';

import React, { useEffect, useState, useCallback } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  Globe,
  Activity,
  Zap,
  ArrowRight,
  BarChart3,
  Layers,
  CheckCircle,
  Shield,
  Clock,
  Bell,
  TrendingUp,
} from 'lucide-react';

import { StatCard } from '@/components/features/common/StatCard';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n';
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
  category: 'price_feed' | 'optimistic' | 'hybrid';
}

// 所有支持的协议列表 - 平等展示，不区分类别
const PROTOCOLS: ProtocolHighlight[] = [
  {
    id: 'chainlink',
    name: 'Chainlink',
    description: 'Industry-standard decentralized oracle network with comprehensive data feeds',
    icon: '🔗',
    status: 'active',
    features: ['Price Feeds', 'VRF', 'Automation', 'CCIP'],
    category: 'price_feed',
  },
  {
    id: 'pyth',
    name: 'Pyth Network',
    description: 'Low-latency financial data from institutional sources',
    icon: '🐍',
    status: 'active',
    features: ['Low Latency', 'High Frequency', 'Confidence Scores'],
    category: 'price_feed',
  },
  {
    id: 'band',
    name: 'Band Protocol',
    description: 'Cross-chain data oracle platform with decentralized consensus',
    icon: '🎸',
    status: 'active',
    features: ['Cross-chain', 'Decentralized', 'Custom Data'],
    category: 'price_feed',
  },
  {
    id: 'api3',
    name: 'API3',
    description: 'First-party oracle with DAO-governed dAPIs',
    icon: '📡',
    status: 'beta',
    features: ['First-party', 'dAPIs', 'DAO Governed'],
    category: 'price_feed',
  },
  {
    id: 'redstone',
    name: 'RedStone',
    description: 'Modular oracle optimized for L2s and rollups',
    icon: '💎',
    status: 'beta',
    features: ['Modular', 'L2 Optimized', 'Cost Efficient'],
    category: 'price_feed',
  },
  {
    id: 'flux',
    name: 'Flux',
    description: 'Decentralized oracle aggregator with on-chain data verification',
    icon: '⚡',
    status: 'active',
    features: ['Aggregator', 'On-chain Verification', 'Multi-source'],
    category: 'price_feed',
  },
  {
    id: 'uma',
    name: 'UMA',
    description: 'Optimistic oracle for custom data verification and dispute resolution',
    icon: '⚖️',
    status: 'active',
    features: ['Optimistic Oracle', 'Assertions', 'Disputes'],
    category: 'optimistic',
  },
  {
    id: 'switchboard',
    name: 'Switchboard',
    description: 'Permissionless oracle network for Solana and EVM chains',
    icon: '🎛️',
    status: 'beta',
    features: ['Permissionless', 'Solana', 'EVM Compatible'],
    category: 'price_feed',
  },
];

export default function OraclePlatformPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPlatformStats = useCallback(async () => {
    try {
      const data = await fetchApiData<PlatformStats>('/api/oracle/unified/stats');
      setStats(data);
    } catch {
      setStats({
        totalProtocols: 10,
        totalPriceFeeds: 150,
        supportedChains: 15,
        avgUpdateLatency: 500,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlatformStats();
  }, [fetchPlatformStats]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section - 完全通用化 */}
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-100 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl text-center">
          <Badge variant="secondary" className="mb-6">
            <Zap className="mr-1 h-3 w-3" />
            {t('home.hero.badge')}
          </Badge>

          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            {t('home.hero.title')}
            <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              {' '}
              {t('home.hero.titleHighlight')}
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-3xl text-lg text-gray-600 sm:text-xl">
            {t('home.hero.description')}
          </p>

          {/* 三个主要功能入口 - 平衡展示 */}
          <div className="mx-auto mb-12 grid max-w-3xl gap-4 sm:grid-cols-3">
            <HeroActionCard
              icon={<Activity className="h-6 w-6" />}
              title={t('home.actions.dashboard.title')}
              description={t('home.actions.dashboard.description')}
              onClick={() => router.push('/oracle/dashboard')}
              primary
            />
            <HeroActionCard
              icon={<BarChart3 className="h-6 w-6" />}
              title={t('home.actions.comparison.title')}
              description={t('home.actions.comparison.description')}
              onClick={() => router.push('/oracle/comparison')}
            />
            <HeroActionCard
              icon={<Shield className="h-6 w-6" />}
              title={t('home.actions.optimistic.title')}
              description={t('home.actions.optimistic.description')}
              onClick={() => router.push('/oracle/optimistic')}
            />
          </div>

          {/* 信任指标 */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              {t('home.trustIndicators.protocols')}
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              {t('home.trustIndicators.chains')}
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              {t('home.trustIndicators.realTime')}
            </span>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="border-y border-gray-100 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={t('home.stats.supportedProtocols')}
              value={stats?.totalProtocols || 10}
              icon={<Layers className="h-5 w-5" />}
              loading={loading}
              color="blue"
            />
            <StatCard
              title={t('home.stats.priceFeeds')}
              value={stats?.totalPriceFeeds || 150}
              icon={<TrendingUp className="h-5 w-5" />}
              loading={loading}
              color="green"
            />
            <StatCard
              title={t('home.stats.supportedChains')}
              value={stats?.supportedChains || 15}
              icon={<Globe className="h-5 w-5" />}
              loading={loading}
              color="purple"
            />
            <StatCard
              title={t('home.stats.avgLatency')}
              value={`${stats?.avgUpdateLatency || 500}ms`}
              icon={<Zap className="h-5 w-5" />}
              loading={loading}
              color="orange"
            />
          </div>
        </div>
      </section>

      {/* Features Section - 通用功能描述 */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">
              {t('home.capabilities.title')}
            </h2>
            <p className="mx-auto max-w-2xl text-gray-600">{t('home.capabilities.subtitle')}</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={<BarChart3 className="h-8 w-8" />}
              title={t('home.capabilities.items.priceComparison.title')}
              description={t('home.capabilities.items.priceComparison.description')}
            />
            <FeatureCard
              icon={<Globe className="h-8 w-8" />}
              title={t('home.capabilities.items.multiChain.title')}
              description={t('home.capabilities.items.multiChain.description')}
            />
            <FeatureCard
              icon={<Bell className="h-8 w-8" />}
              title={t('home.capabilities.items.smartAlerts.title')}
              description={t('home.capabilities.items.smartAlerts.description')}
            />
            <FeatureCard
              icon={<Clock className="h-8 w-8" />}
              title={t('home.capabilities.items.assertDispute.title')}
              description={t('home.capabilities.items.assertDispute.description')}
            />
          </div>
        </div>
      </section>

      {/* Protocols Section - 统一网格展示，不区分类别 */}
      <section className="bg-gray-50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-gray-900">{t('home.protocols.title')}</h2>
            <p className="mx-auto max-w-2xl text-gray-600">{t('home.protocols.subtitle')}</p>
          </div>

          {/* 统一网格展示所有协议 */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
              {t('home.protocols.exploreAll')}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-3xl font-bold text-gray-900">{t('home.cta.title')}</h2>
          <p className="mb-8 text-lg text-gray-600">{t('home.cta.subtitle')}</p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button size="lg" onClick={() => router.push('/oracle/dashboard')} className="gap-2">
              <Activity className="h-4 w-4" />
              {t('home.cta.launchDashboard')}
            </Button>
            <Link
              href="/oracle/comparison"
              className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700"
            >
              {t('home.cta.compareProtocols')}
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

interface HeroActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
  primary?: boolean;
}

const HeroActionCard = React.memo(function HeroActionCard({
  icon,
  title,
  description,
  onClick,
  primary,
}: HeroActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group flex flex-col items-center gap-3 rounded-2xl p-6 transition-all duration-200',
        primary
          ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25 hover:bg-purple-700 hover:shadow-xl hover:shadow-purple-500/30'
          : 'bg-white text-gray-700 shadow-md hover:text-purple-700 hover:shadow-lg',
      )}
    >
      <div
        className={cn(
          'rounded-xl p-3',
          primary ? 'bg-white/20' : 'bg-purple-50 group-hover:bg-purple-100',
        )}
      >
        {icon}
      </div>
      <div className="text-center">
        <h3 className="font-semibold">{title}</h3>
        <p className={cn('text-sm', primary ? 'text-purple-100' : 'text-gray-500')}>
          {description}
        </p>
      </div>
    </button>
  );
});

// Note: StatCard component has been extracted to @/components/features/common/StatCard

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const FeatureCard = React.memo(function FeatureCard({
  icon,
  title,
  description,
}: FeatureCardProps) {
  return (
    <Card className="border-0 shadow-sm transition-shadow hover:shadow-md">
      <CardContent className="p-6">
        <div className="mb-4 text-purple-600">{icon}</div>
        <h3 className="mb-2 text-lg font-semibold text-gray-900">{title}</h3>
        <p className="text-gray-600">{description}</p>
      </CardContent>
    </Card>
  );
});

interface ProtocolCardProps {
  protocol: ProtocolHighlight;
}

const ProtocolCard = React.memo(function ProtocolCard({ protocol }: ProtocolCardProps) {
  const { t } = useI18n();
  const statusColors = {
    active: 'bg-green-100 text-green-700',
    beta: 'bg-yellow-100 text-yellow-700',
    coming_soon: 'bg-gray-100 text-gray-500',
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return t('home.protocolStatus.active');
      case 'beta':
        return t('home.protocolStatus.beta');
      case 'coming_soon':
        return t('home.protocolStatus.comingSoon');
      default:
        return status;
    }
  };

  return (
    <Card className="group cursor-pointer border-0 shadow-sm transition-all hover:shadow-md">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{protocol.icon}</span>
            <div>
              <CardTitle className="text-lg transition-colors group-hover:text-purple-700">
                {protocol.name}
              </CardTitle>
              <Badge
                variant="secondary"
                className={cn('mt-1 text-xs', statusColors[protocol.status])}
              >
                {protocol.status === 'active' && (
                  <>
                    <CheckCircle className="mr-1 h-3 w-3" />
                    {getStatusText(protocol.status)}
                  </>
                )}
                {protocol.status === 'beta' && getStatusText(protocol.status)}
                {protocol.status === 'coming_soon' && getStatusText(protocol.status)}
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
});
