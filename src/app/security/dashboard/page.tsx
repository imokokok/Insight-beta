/**
 * Optimized Security Dashboard - Data Visualization Enhanced
 *
 * 优化版安全仪表板
 * - 增强数据可视化
 * - 安全态势感知
 * - 威胁检测可视化
 */

'use client';

import { useState, useCallback, useMemo, type ReactNode } from 'react';

import dynamic from 'next/dynamic';

import {
  Shield,
  AlertTriangle,
  Activity,
  TrendingUp,
  Clock,
  Target,
  Lock,
  Eye,
  Zap,
  BarChart3,
  PieChart,
} from 'lucide-react';

import {
  EnhancedPieChart,
  EnhancedRadarChart,
  EnhancedGaugeChart,
  CHART_COLORS,
} from '@/components/charts';
import { ChartCard } from '@/components/common/ChartCard';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { DashboardPageHeader } from '@/components/common/PageHeader';
import {
  EnhancedStatCard,
  StatCardGroup,
  DashboardStatsSection,
  type StatCardStatus,
} from '@/components/common/StatCard';
import { ThreatLevelBadge } from '@/components/security';
import { EmptySecurityState, LoadingOverlay, RefreshIndicator } from '@/components/ui';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useIsMobile, useAutoRefresh } from '@/hooks';
import { cn, formatNumber } from '@/shared/utils';

const EnhancedAreaChart = dynamic(
  () => import('@/components/charts').then((mod) => mod.EnhancedAreaChart),
  { ssr: false },
);

const EnhancedBarChart = dynamic(
  () => import('@/components/charts').then((mod) => mod.EnhancedBarChart),
  { ssr: false },
);

// ============================================================================
// Types
// ============================================================================

interface SecurityStats {
  totalDetections: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  safeCount: number;
  avgDetectionTime: number;
  blockedTransactions: number;
  totalValueAtRisk: string;
  activeMonitors: number;
  threatScore: number;
  lastIncident: string | null;
}

interface ThreatDataPoint {
  timestamp: string;
  threats: number;
  blocked: number;
  label: string;
  [key: string]: unknown;
}

interface RiskDistributionItem {
  name: string;
  value: number;
  color: string;
}

interface RadarDataItem {
  metric: string;
  value: number;
  fullMark: number;
}

// ============================================================================
// Constants
// ============================================================================

const MOCK_STATS: SecurityStats = {
  totalDetections: 185,
  highRiskCount: 12,
  mediumRiskCount: 28,
  lowRiskCount: 45,
  safeCount: 115,
  avgDetectionTime: 2.3,
  blockedTransactions: 156,
  totalValueAtRisk: '$2.4M',
  activeMonitors: 24,
  threatScore: 85,
  lastIncident: '2 hours ago',
};

const getSecurityStatus = (score: number): string => {
  if (score >= 90) return 'Excellent';
  if (score >= 70) return 'Good';
  if (score >= 50) return 'Fair';
  return 'Poor';
};

// ============================================================================
// Mock Data Generators
// ============================================================================

const generateMockThreatData = (points: number = 24): ThreatDataPoint[] => {
  const data: ThreatDataPoint[] = [];
  const now = new Date();
  for (let i = points; i >= 0; i--) {
    const time = new Date(now.getTime() - i * 60 * 60 * 1000);
    data.push({
      timestamp: time.toISOString(),
      threats: Math.floor(Math.random() * 50) + 10,
      blocked: Math.floor(Math.random() * 40) + 5,
      label: time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    });
  }
  return data;
};

const generateMockRiskDistribution = (stats: SecurityStats): RiskDistributionItem[] => [
  { name: 'High Risk', value: stats.highRiskCount, color: CHART_COLORS.semantic.error.DEFAULT },
  {
    name: 'Medium Risk',
    value: stats.mediumRiskCount,
    color: CHART_COLORS.semantic.warning.DEFAULT,
  },
  { name: 'Low Risk', value: stats.lowRiskCount, color: CHART_COLORS.semantic.info.DEFAULT },
  { name: 'Safe', value: stats.safeCount, color: CHART_COLORS.semantic.success.DEFAULT },
];

const generateMockRadarData = (): RadarDataItem[] => [
  { metric: 'Network Security', value: 85, fullMark: 100 },
  { metric: 'Data Protection', value: 92, fullMark: 100 },
  { metric: 'Access Control', value: 78, fullMark: 100 },
  { metric: 'Threat Detection', value: 88, fullMark: 100 },
  { metric: 'Incident Response', value: 75, fullMark: 100 },
  { metric: 'Compliance', value: 95, fullMark: 100 },
];

// ============================================================================
// Components
// ============================================================================

function SecurityScoreGauge({ score }: { score: number }) {
  const status = getSecurityStatus(score);

  return (
    <div
      className="flex flex-col items-center"
    >
      <EnhancedGaugeChart
        value={score}
        max={100}
        height={150}
        thresholds={{ warning: 70, critical: 50 }}
      />
      <div className="-mt-4 text-center">
        <p className="text-sm font-medium text-muted-foreground">Security Score</p>
        <p className={cn('text-lg font-bold', score >= 70 ? 'text-green-500' : 'text-amber-500')}>
          {status}
        </p>
      </div>
    </div>
  );
}

interface ChartErrorFallbackProps {
  title: string;
}

function ChartErrorFallback({ title }: ChartErrorFallbackProps) {
  return (
    <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-border bg-card p-6">
      <p className="text-sm text-muted-foreground">{title} 加载失败，请刷新页面重试</p>
    </div>
  );
}

interface ChartWrapperProps {
  children: ReactNode;
  fallbackTitle: string;
}

function ChartWrapper({ children, fallbackTitle }: ChartWrapperProps) {
  return (
    <ErrorBoundary fallback={<ChartErrorFallback title={fallbackTitle} />}>
      {children}
    </ErrorBoundary>
  );
}

// ============================================================================
// Main Dashboard Component
// ============================================================================

export default function OptimizedSecurityDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats] = useState<SecurityStats>(MOCK_STATS);
  const isMobile = useIsMobile();

  const [threatData] = useState<ThreatDataPoint[]>(() => generateMockThreatData());
  const [riskDistribution] = useState<RiskDistributionItem[]>(() =>
    generateMockRiskDistribution(stats),
  );
  const [radarData] = useState<RadarDataItem[]>(() => generateMockRadarData());

  const fetchSecurityData = useCallback(async () => {
  }, []);

  const { isRefreshing, refresh, lastUpdated } =
    useAutoRefresh({
      pageId: 'security-dashboard',
      fetchFn: fetchSecurityData,
      enabled: false,
    });

  const threatCardsData = useMemo(
    () => [
      {
        title: 'Total Detections',
        value: stats.totalDetections,
        icon: <AlertTriangle className="h-5 w-5" />,
        status: (stats.totalDetections > 100 ? 'warning' : 'healthy') as StatCardStatus,
        trend: { value: 15, isPositive: false, label: 'vs yesterday' },
      },
      {
        title: 'Blocked Transactions',
        value: stats.blockedTransactions,
        icon: <Lock className="h-5 w-5" />,
        status: 'healthy' as StatCardStatus,
        trend: { value: 8, isPositive: true, label: 'vs yesterday' },
      },
      {
        title: 'Avg Detection Time',
        value: `${stats.avgDetectionTime}s`,
        icon: <Clock className="h-5 w-5" />,
        status: (stats.avgDetectionTime < 5 ? 'healthy' : 'warning') as StatCardStatus,
        trend: { value: 12, isPositive: true, label: 'faster' },
      },
      {
        title: 'Value at Risk',
        value: stats.totalValueAtRisk,
        icon: <Target className="h-5 w-5" />,
        status: 'warning' as StatCardStatus,
        trend: { value: 5, isPositive: false, label: 'vs yesterday' },
      },
    ],
    [
      stats.totalDetections,
      stats.blockedTransactions,
      stats.avgDetectionTime,
      stats.totalValueAtRisk,
    ],
  );

  const monitoringCardsData = useMemo(
    () => [
      {
        title: 'Active Monitors',
        value: stats.activeMonitors,
        icon: <Eye className="h-5 w-5" />,
        status: 'neutral' as StatCardStatus,
        trend: { value: 4, isPositive: true, label: 'new today' },
      },
      {
        title: 'Security Score',
        value: `${stats.threatScore}/100`,
        icon: <Shield className="h-5 w-5" />,
        status: (stats.threatScore >= 80 ? 'healthy' : 'warning') as StatCardStatus,
        trend: { value: 3, isPositive: true, label: 'vs last week' },
      },
      {
        title: 'Last Incident',
        value: stats.lastIncident || 'None',
        icon: <Activity className="h-5 w-5" />,
        status: 'neutral' as StatCardStatus,
      },
      {
        title: 'Response Time',
        value: '< 30s',
        icon: <Zap className="h-5 w-5" />,
        status: 'healthy' as StatCardStatus,
        trend: { value: 10, isPositive: true, label: 'faster' },
      },
    ],
    [stats.activeMonitors, stats.threatScore, stats.lastIncident],
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <main className="flex flex-1 flex-col overflow-hidden">
        <DashboardPageHeader
          title="Security Operations Center"
          description="Threat detection and security monitoring"
          icon={<Shield className="h-5 w-5 text-primary" />}
          statusBadge={<ThreatLevelBadge level="high" count={stats.highRiskCount} />}
          refreshControl={
            <RefreshIndicator
              lastUpdated={lastUpdated}
              isRefreshing={isRefreshing}
              onRefresh={refresh}
            />
          }
          showMobileMenu={false}
        />

        <div className="relative flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4">
          {isRefreshing && <LoadingOverlay message="Loading security data..." />}

          {!isRefreshing && stats.totalDetections === 0 && (
            <div className="py-12">
              <EmptySecurityState onRefresh={refresh} />
            </div>
          )}

          <section
            className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3"
          >
            <ThreatLevelBadge level="high" count={stats.highRiskCount} />
            <ThreatLevelBadge level="medium" count={stats.mediumRiskCount} />
            <ThreatLevelBadge level="low" count={stats.lowRiskCount} />
            <ThreatLevelBadge level="safe" count={stats.safeCount} />
          </section>

          <div className="mb-4 space-y-3">
            <DashboardStatsSection
              title="Threat Overview"
              description="Real-time threat detection metrics"
              icon={<AlertTriangle className="h-4 w-4" />}
              color="red"
            >
              <StatCardGroup columns={4}>
                {threatCardsData.map((card) => (
                  <EnhancedStatCard
                    key={card.title}
                    title={card.title}
                    value={card.value}
                    icon={card.icon}
                    status={card.status}
                    trend={card.trend}
                    variant="compact"
                  />
                ))}
              </StatCardGroup>
            </DashboardStatsSection>

            <DashboardStatsSection
              title="Monitoring Status"
              description="Security monitoring and response metrics"
              icon={<Eye className="h-4 w-4" />}
              color="blue"
            >
              <StatCardGroup columns={4}>
                {monitoringCardsData.map((card) => (
                  <EnhancedStatCard
                    key={card.title}
                    title={card.title}
                    value={card.value}
                    icon={card.icon}
                    status={card.status}
                    trend={card.trend}
                    variant="compact"
                  />
                ))}
              </StatCardGroup>
            </DashboardStatsSection>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
            <TabsList className="w-full justify-start overflow-x-auto lg:w-auto">
              <TabsTrigger value="overview" className="gap-1 sm:gap-2">
                <Shield className="h-4 w-4" />
                <span>Overview</span>
              </TabsTrigger>
              <TabsTrigger value="threats" className="gap-1 sm:gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>Threats</span>
              </TabsTrigger>
              <TabsTrigger value="analysis" className="gap-1 sm:gap-2">
                <BarChart3 className="h-4 w-4" />
                <span>Analysis</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3 sm:space-y-4">
              <div className="grid gap-3 sm:gap-4 xl:grid-cols-3">
                <ChartWrapper fallbackTitle="Security Score">
                  <ChartCard
                    title="Security Score"
                    description="Overall security posture assessment"
                    icon={<Shield className="h-5 w-5" />}
                  >
                    <SecurityScoreGauge score={stats.threatScore} />
                  </ChartCard>
                </ChartWrapper>

                <ChartWrapper fallbackTitle="Risk Distribution">
                  <ChartCard
                    title="Risk Distribution"
                    description="Asset risk level breakdown"
                    icon={<PieChart className="h-5 w-5" />}
                  >
                    <EnhancedPieChart
                      data={riskDistribution}
                      height={isMobile ? 200 : 250}
                      innerRadius={60}
                      showLabels
                    />
                  </ChartCard>
                </ChartWrapper>

                <ChartWrapper fallbackTitle="Security Dimensions">
                  <ChartCard
                    title="Security Dimensions"
                    description="Security capability assessment"
                    icon={<Activity className="h-5 w-5" />}
                  >
                    <EnhancedRadarChart
                      data={radarData}
                      height={isMobile ? 200 : 250}
                      color={CHART_COLORS.primary.DEFAULT}
                    />
                  </ChartCard>
                </ChartWrapper>
              </div>

              <ChartWrapper fallbackTitle="Threat Activity Timeline">
                <ChartCard
                  title="Threat Activity Timeline"
                  description="Detected threats and blocked attempts over time"
                  icon={<BarChart3 className="h-5 w-5" />}
                >
                  <EnhancedAreaChart
                    data={threatData}
                    dataKey="threats"
                    color={CHART_COLORS.semantic.error.DEFAULT}
                    height={isMobile ? 200 : 280}
                    valueFormatter={(v) => formatNumber(v, 0)}
                    labelFormatter={(l) =>
                      new Date(l).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    }
                    showGrid
                    gradient
                    thresholds={[
                      {
                        value: 40,
                        label: 'High Threshold',
                        color: CHART_COLORS.semantic.error.DEFAULT,
                        type: 'warning',
                      },
                    ]}
                  />
                </ChartCard>
              </ChartWrapper>
            </TabsContent>

            <TabsContent value="threats" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartWrapper fallbackTitle="Threats vs Blocked">
                  <ChartCard
                    title="Threats vs Blocked"
                    description="Detection and prevention comparison"
                    icon={<Shield className="h-5 w-5" />}
                  >
                    <EnhancedBarChart
                      data={threatData}
                      bars={[
                        {
                          dataKey: 'threats',
                          name: 'Detected',
                          color: CHART_COLORS.semantic.error.DEFAULT,
                        },
                        {
                          dataKey: 'blocked',
                          name: 'Blocked',
                          color: CHART_COLORS.semantic.success.DEFAULT,
                        },
                      ]}
                      height={300}
                      valueFormatter={(v) => formatNumber(v, 0)}
                      showGrid
                      showLegend
                    />
                  </ChartCard>
                </ChartWrapper>

                <ChartWrapper fallbackTitle="Threat Trends">
                  <ChartCard
                    title="Threat Trends"
                    description="Threat detection trends over time"
                    icon={<TrendingUp className="h-5 w-5" />}
                  >
                    <EnhancedAreaChart
                      data={threatData}
                      dataKey="threats"
                      color={CHART_COLORS.semantic.warning.DEFAULT}
                      height={300}
                      valueFormatter={(v) => formatNumber(v, 0)}
                      showGrid
                      gradient
                    />
                  </ChartCard>
                </ChartWrapper>
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="space-y-4">
              <ChartCard
                title="Security Posture Analysis"
                description="Multi-dimensional security assessment"
                icon={<Activity className="h-5 w-5" />}
              >
                <div className="grid gap-6 lg:grid-cols-2">
                  <ChartWrapper fallbackTitle="Security Radar">
                    <EnhancedRadarChart
                      data={radarData}
                      height={350}
                      color={CHART_COLORS.primary.DEFAULT}
                    />
                  </ChartWrapper>
                  <div className="space-y-4">
                    {radarData.map((item) => (
                      <div key={item.metric} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">{item.metric}</span>
                          <span
                            className={cn(
                              'text-sm font-bold',
                              item.value >= 80
                                ? 'text-emerald-600'
                                : item.value >= 60
                                  ? 'text-amber-600'
                                  : 'text-rose-600',
                            )}
                          >
                            {item.value}%
                          </span>
                        </div>
                        <Progress
                          value={item.value}
                          className="h-2"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </ChartCard>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
