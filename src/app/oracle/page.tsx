'use client';

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
  Clock,
  Bell,
  TrendingUp,
} from 'lucide-react';

import { StatCard } from '@/components/common';
import { Button } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import {
  HeroActionCard,
  FeatureCard,
  ProtocolCard,
} from '@/features/oracle/components/LandingPageCards';
import { PROTOCOLS } from '@/features/oracle/constants/protocols';
import { usePlatformStats } from '@/features/oracle/hooks';

import { useI18n } from '@/i18n';

export default function OraclePlatformPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { stats, loading } = usePlatformStats();

  return (
    <div className="relative min-h-screen">
      <div className="mesh-gradient" />
      <section className="relative overflow-hidden px-4 py-20 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary-900/20 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-7xl text-center">
          <Badge variant="secondary" className="mb-6">
            <Zap className="mr-1 h-3 w-3" />
            {t('home.hero.badge')}
          </Badge>

          <h1 className="mb-6 text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            {t('home.hero.title')}
            <span className="bg-gradient-to-r from-primary-400 to-cyan-400 bg-clip-text text-transparent">
              {' '}
              {t('home.hero.titleHighlight')}
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-3xl text-lg text-muted-foreground sm:text-xl">
            {t('home.hero.description')}
          </p>

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
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
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

      <section className="border-y border-border/50 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title={t('home.stats.supportedProtocols')}
              value={stats.totalProtocols}
              icon={<Layers className="h-5 w-5" />}
              loading={loading}
              color="blue"
            />
            <StatCard
              title={t('home.stats.priceFeeds')}
              value={stats.totalPriceFeeds}
              icon={<TrendingUp className="h-5 w-5" />}
              loading={loading}
              color="green"
            />
            <StatCard
              title={t('home.stats.supportedChains')}
              value={stats.supportedChains}
              icon={<Globe className="h-5 w-5" />}
              loading={loading}
              color="purple"
            />
            <StatCard
              title={t('home.stats.avgLatency')}
              value={`${stats.avgUpdateLatency}ms`}
              icon={<Zap className="h-5 w-5" />}
              loading={loading}
              color="amber"
            />
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground">
              {t('home.capabilities.title')}
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">{t('home.capabilities.subtitle')}</p>
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

      <section className="bg-card/50 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground">{t('home.protocols.title')}</h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">{t('home.protocols.subtitle')}</p>
          </div>

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

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-6 text-3xl font-bold text-foreground">{t('home.cta.title')}</h2>
          <p className="mb-8 text-lg text-muted-foreground">{t('home.cta.subtitle')}</p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              variant="gradient"
              onClick={() => router.push('/oracle/dashboard')}
              className="inline-flex flex-nowrap items-center gap-3 whitespace-nowrap px-8"
            >
              <Activity className="h-5 w-5 flex-shrink-0" />
              <span className="text-base font-semibold">{t('home.cta.launchDashboard')}</span>
            </Button>
            <Link
              href="/oracle/comparison"
              className="hover:text-primary-dark inline-flex items-center gap-2 text-primary"
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
