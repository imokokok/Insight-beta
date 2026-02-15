'use client';

import { Activity, Globe, AlertTriangle, Shield, Clock, BarChart3, Layers } from 'lucide-react';

import { StaggerContainer, StaggerItem } from '@/components/common/AnimatedContainer';
import {
  EnhancedStatCard,
  StatCardGroup,
  DashboardStatsSection,
} from '@/components/common/StatCard';
import type { StatCardStatus } from '@/components/common/StatCard';

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
  stats: any;
}

const icons = {
  'Active Incidents': <AlertTriangle className="h-5 w-5" />,
  'Avg Latency': <Activity className="h-5 w-5" />,
  'Network Uptime': <Shield className="h-5 w-5" />,
  'Stale Feeds': <Clock className="h-5 w-5" />,
  'Protocols': <Globe className="h-5 w-5" />,
  'Price Feeds': <BarChart3 className="h-5 w-5" />,
  'TVS': <Shield className="h-5 w-5" />,
  'Updates (24h)': <Layers className="h-5 w-5" />,
};

export function DashboardStats({ statCardsData, scaleCardsData, isRefreshing, stats }: DashboardStatsProps) {
  return (
    <StaggerContainer className="mb-4 space-y-3" staggerChildren={0.05}>
      <StaggerItem>
        <DashboardStatsSection
          title="System Health"
          description="Real-time health and risk metrics"
          icon={<Activity className="h-4 w-4" />}
          color="amber"
        >
          <StatCardGroup columns={4} gap="sm">
            {statCardsData.map((card) => (
              <EnhancedStatCard
                key={card.title}
                title={card.title}
                value={card.value}
                icon={icons[card.title as keyof typeof icons]}
                status={card.status}
                trend={card.trend}
                sparkline={card.sparkline}
                variant="compact"
                loading={isRefreshing && !stats}
              />
            ))}
          </StatCardGroup>
        </DashboardStatsSection>
      </StaggerItem>

      <StaggerItem>
        <DashboardStatsSection
          title="Network Scale"
          description="Protocol scale and data volume"
          icon={<Globe className="h-4 w-4" />}
          color="blue"
        >
          <StatCardGroup columns={4} gap="sm">
            {scaleCardsData.map((card) => (
              <EnhancedStatCard
                key={card.title}
                title={card.title}
                value={card.value}
                icon={icons[card.title as keyof typeof icons]}
                status={card.status}
                trend={card.trend}
                variant="compact"
                loading={isRefreshing && !stats}
              />
            ))}
          </StatCardGroup>
        </DashboardStatsSection>
      </StaggerItem>
    </StaggerContainer>
  );
}
