/**
 * Optimized Security Dashboard - Data Visualization Enhanced
 *
 * 优化版安全仪表板
 * - 增强数据可视化
 * - 安全态势感知
 * - 威胁检测可视化
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
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
  AlertCircle,
  CheckCircle,
} from 'lucide-react';

import {
  EnhancedStatCard,
  StatCardGroup,
  DashboardStatsSection,
  type StatCardStatus,
} from '@/components/common/StatCard';
import {
  EnhancedAreaChart,
  EnhancedBarChart,
  EnhancedPieChart,
  EnhancedRadarChart,
  EnhancedGaugeChart,
  CHART_COLORS,
} from '@/components/charts';
import { ChartCard } from '@/components/common/ChartCard';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { useAutoRefresh } from '@/hooks/use-auto-refresh';
import { useIsMobile } from '@/hooks';
import { cn, formatNumber } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface SecurityStats {
  totalDetections: number;
  highRiskCount: number;
  mediumRiskCount: number;
  lowRiskCount: number;
  avgDetectionTime: number;
  blockedTransactions: number;
  totalValueAtRisk: string;
  activeMonitors: number;
  threatScore: number;
  lastIncident: string | null;
}

import type { ChartDataPoint } from '@/components/charts';

interface ThreatData extends ChartDataPoint {
  threats: number;
  blocked: number;
}

interface RiskDistribution {
  name: string;
  value: number;
  color: string;
}

// ============================================================================
// Mock Data Generators
// ============================================================================

const generateMockThreatData = (points: number = 24): ThreatData[] => {
  const data: ThreatData[] = [];
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

const generateMockRiskDistribution = (): RiskDistribution[] => [
  { name: 'High Risk', value: 12, color: CHART_COLORS.semantic.error.DEFAULT },
  { name: 'Medium Risk', value: 28, color: CHART_COLORS.semantic.warning.DEFAULT },
  { name: 'Low Risk', value: 45, color: CHART_COLORS.semantic.info.DEFAULT },
  { name: 'Safe', value: 115, color: CHART_COLORS.semantic.success.DEFAULT },
];

const generateMockRadarData = () => [
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

function ThreatLevelBadge({ level, count }: { level: 'high' | 'medium' | 'low' | 'safe'; count: number }) {
  const config = {
    high: {
      bg: 'bg-rose-100',
      text: 'text-rose-700',
      border: 'border-rose-200',
      icon: <AlertCircle className="h-4 w-4" />,
      label: 'High Risk',
    },
    medium: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      border: 'border-amber-200',
      icon: <AlertTriangle className="h-4 w-4" />,
      label: 'Medium Risk',
    },
    low: {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-200',
      icon: <Eye className="h-4 w-4" />,
      label: 'Low Risk',
    },
    safe: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      icon: <CheckCircle className="h-4 w-4" />,
      label: 'Safe',
    },
  }[level];

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2',
        config.bg,
        config.border,
      )}
    >
      <div className={config.text}>{config.icon}</div>
      <div>
        <span className={cn('text-xs font-semibold', config.text)}>{config.label}</span>
        <span className={cn('ml-2 text-sm font-bold', config.text)}>{count}</span>
      </div>
    </div>
  );
}

function SecurityScoreGauge({ score }: { score: number }) {
  const getStatus = () => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="flex flex-col items-center">
      <EnhancedGaugeChart
        value={score}
        max={100}
        height={150}
        thresholds={{ warning: 70, critical: 50 }}
      />
      <div className="text-center -mt-4">
        <p className="text-sm font-medium text-gray-600">Security Score</p>
        <p className={cn('text-lg font-bold', score >= 70 ? 'text-emerald-600' : 'text-amber-600')}>
          {getStatus()}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// Main Dashboard Component
// ============================================================================

export default function OptimizedSecurityDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const isMobile = useIsMobile();

  // Chart data states
  const [threatData] = useState<ThreatData[]>(generateMockThreatData());
  const [riskDistribution] = useState<RiskDistribution[]>(generateMockRiskDistribution());
  const [radarData] = useState(generateMockRadarData());

  // Auto refresh
  const { lastUpdated, isRefreshing, refresh } = useAutoRefresh({
    pageId: 'security-dashboard',
    fetchFn: useCallback(async () => {
      // Fetch security stats
    }, []),
    enabled: true,
  });

  // Mock stats
  const stats: SecurityStats = {
    totalDetections: 185,
    highRiskCount: 12,
    mediumRiskCount: 28,
    lowRiskCount: 45,
    avgDetectionTime: 2.3,
    blockedTransactions: 156,
    totalValueAtRisk: '$2.4M',
    activeMonitors: 24,
    threatScore: 85,
    lastIncident: '2 hours ago',
  };

  // Stat cards data
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
    [stats],
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
    [stats],
  );

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50/50">
      {/* Main Content */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-gray-200/50 bg-white/80 px-4 py-3 backdrop-blur-sm lg:px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 lg:text-2xl">Security Operations Center</h1>
              <p className="text-muted-foreground hidden text-sm sm:block">
                Threat detection and security monitoring
              </p>
            </div>
            <div className="flex items-center gap-3">
              <ThreatLevelBadge level="high" count={stats.highRiskCount} />
              <Button variant="outline" size="sm" onClick={refresh} disabled={isRefreshing}>
                {isRefreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-2 sm:p-3 lg:p-4">
          {/* Risk Level Summary */}
          <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
            <ThreatLevelBadge level="high" count={stats.highRiskCount} />
            <ThreatLevelBadge level="medium" count={stats.mediumRiskCount} />
            <ThreatLevelBadge level="low" count={stats.lowRiskCount} />
            <ThreatLevelBadge level="safe" count={115} />
          </div>

          {/* Stats Sections */}
          <div className="mb-4 space-y-3">
            {/* Threat Overview Section */}
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

            {/* Monitoring Status Section */}
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

          {/* Tabs */}
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

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-3 sm:space-y-4">
              <div className="grid gap-3 sm:gap-4 xl:grid-cols-3">
                {/* Security Score */}
                <ChartCard
                  title="Security Score"
                  description="Overall security posture assessment"
                  icon={<Shield className="h-5 w-5" />}
                >
                  <SecurityScoreGauge score={stats.threatScore} />
                </ChartCard>

                {/* Risk Distribution */}
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

                {/* Security Radar */}
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
              </div>

              {/* Threat Timeline */}
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
                  labelFormatter={(l) => new Date(l).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  showGrid
                  gradient
                  thresholds={[
                    { value: 40, label: 'High Threshold', color: CHART_COLORS.semantic.error.DEFAULT, type: 'warning' },
                  ]}
                />
              </ChartCard>
            </TabsContent>

            {/* Threats Tab */}
            <TabsContent value="threats" className="space-y-4">
              <div className="grid gap-4 lg:grid-cols-2">
                <ChartCard
                  title="Threats vs Blocked"
                  description="Detection and prevention comparison"
                  icon={<Shield className="h-5 w-5" />}
                >
                  <EnhancedBarChart
                    data={threatData}
                    bars={[
                      { dataKey: 'threats', name: 'Detected', color: CHART_COLORS.semantic.error.DEFAULT },
                      { dataKey: 'blocked', name: 'Blocked', color: CHART_COLORS.semantic.success.DEFAULT },
                    ]}
                    height={300}
                    valueFormatter={(v) => formatNumber(v, 0)}
                    showGrid
                    showLegend
                  />
                </ChartCard>

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
              </div>
            </TabsContent>

            {/* Analysis Tab */}
            <TabsContent value="analysis" className="space-y-4">
              <ChartCard
                title="Security Posture Analysis"
                description="Multi-dimensional security assessment"
                icon={<Activity className="h-5 w-5" />}
              >
                <div className="grid gap-6 lg:grid-cols-2">
                  <EnhancedRadarChart
                    data={radarData}
                    height={350}
                    color={CHART_COLORS.primary.DEFAULT}
                  />
                  <div className="space-y-4">
                    {radarData.map((item, index) => (
                      <div key={item.metric} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">{item.metric}</span>
                          <span className={cn(
                            'text-sm font-bold',
                            item.value >= 80 ? 'text-emerald-600' : item.value >= 60 ? 'text-amber-600' : 'text-rose-600'
                          )}>
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
