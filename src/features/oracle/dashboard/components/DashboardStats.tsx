'use client';

import { Activity, Globe, AlertTriangle, Shield, Clock, BarChart3, Layers } from 'lucide-react';

import { ContentSection } from '@/components/common';
import { StaggerContainer, StaggerItem } from '@/components/common/AnimatedContainer';
import { UnifiedStatsPanel } from '@/components/common/StatCard';
import type { StatCardStatus } from '@/components/common/StatCard';
import { useI18n } from '@/i18n/LanguageProvider';

import type { DashboardStats as DashboardStatsType } from '../types/dashboard';

interface StatCardData {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  status: StatCardStatus;
  trend: { value: number; isPositive: boolean; label: string };
  sparkline?: { data: number[]; color: string };
}

interface DashboardStatsProps {
  statCardsData: StatCardData[];
  scaleCardsData: StatCardData[];
  isRefreshing: boolean;
  stats: DashboardStatsType | null;
}

const icons = {
  'Active Incidents': <AlertTriangle className="h-5 w-5" />,
  'Avg Latency': <Activity className="h-5 w-5" />,
  'Network Uptime': <Shield className="h-5 w-5" />,
  'Stale Feeds': <Clock className="h-5 w-5" />,
  Protocols: <Globe className="h-5 w-5" />,
  'Price Feeds': <BarChart3 className="h-5 w-5" />,
  TVS: <Shield className="h-5 w-5" />,
  'Updates (24h)': <Layers className="h-5 w-5" />,
};

export function DashboardStats({
  statCardsData,
  scaleCardsData,
  isRefreshing,
  stats,
}: DashboardStatsProps) {
  const { t } = useI18n();

  if (isRefreshing && !stats) {
    return (
      <StaggerContainer className="mb-4 space-y-3" staggerChildren={0.05}>
        <StaggerItem>
          <ContentSection
            title={t('dashboard.stats.systemHealth')}
            description={t('dashboard.stats.systemHealthDesc')}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse rounded-xl bg-card/50 p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <div className="h-4 w-24 rounded bg-muted" />
                    <div className="h-8 w-8 rounded-lg bg-muted" />
                  </div>
                  <div className="mb-1 h-6 w-32 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted/50" />
                </div>
              ))}
            </div>
          </ContentSection>
        </StaggerItem>
        <StaggerItem>
          <ContentSection
            title={t('dashboard.stats.networkScale')}
            description={t('dashboard.stats.networkScaleDesc')}
          >
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="animate-pulse rounded-xl bg-card/50 p-4">
                  <div className="mb-2 flex items-start justify-between">
                    <div className="h-4 w-24 rounded bg-muted" />
                    <div className="h-8 w-8 rounded-lg bg-muted" />
                  </div>
                  <div className="mb-1 h-6 w-32 rounded bg-muted" />
                  <div className="h-3 w-20 rounded bg-muted/50" />
                </div>
              ))}
            </div>
          </ContentSection>
        </StaggerItem>
      </StaggerContainer>
    );
  }

  return (
    <StaggerContainer className="mb-4 space-y-3" staggerChildren={0.05}>
      <StaggerItem>
        <ContentSection
          title={t('dashboard.stats.systemHealth')}
          description={t('dashboard.stats.systemHealthDesc')}
        >
          <div className="rounded-xl border border-border/30 bg-card/30 p-4">
            <UnifiedStatsPanel
              items={statCardsData.map((card) => ({
                title: card.title,
                value: card.value,
                icon: icons[card.title as keyof typeof icons],
                status: card.status,
                trend: card.trend,
              }))}
              columns={4}
            />
          </div>
        </ContentSection>
      </StaggerItem>

      <StaggerItem>
        <ContentSection
          title={t('dashboard.stats.networkScale')}
          description={t('dashboard.stats.networkScaleDesc')}
        >
          <div className="rounded-xl border border-border/30 bg-card/30 p-4">
            <UnifiedStatsPanel
              items={scaleCardsData.map((card) => ({
                title: card.title,
                value: card.value,
                icon: icons[card.title as keyof typeof icons],
                status: card.status,
                trend: card.trend,
              }))}
              columns={4}
            />
          </div>
        </ContentSection>
      </StaggerItem>
    </StaggerContainer>
  );
}
