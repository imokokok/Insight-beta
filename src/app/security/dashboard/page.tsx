/**
 * Security Detection Dashboard
 *
 * 安全检测仪表板
 * - 实时检测状态
 * - 检测统计概览
 * - 可疑交易列表
 * - 攻击类型分布
 */

'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';

import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Clock,
  TrendingUp,
  RefreshCw,
  Search,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';

import { StatCard, StatCardSkeleton, StatCardGroup } from '@/components/common';
import {
  AnimatedContainer,
  StaggerContainer,
  HoverCard,
} from '@/components/common/AnimatedContainer';
import { AutoRefreshControl } from '@/components/common/AutoRefreshControl';
import { ChartCard, ChartCardSkeleton } from '@/components/common/ChartCard';
import { ToastContainer, useToast } from '@/components/common/DashboardToast';
import { EmptySecurityState, EmptySearchState } from '@/components/common/EmptyState';
import { PageHeader } from '@/components/common/PageHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CardSkeleton, SkeletonList } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useDashboardShortcuts, useAutoRefreshLegacy, useDataCache } from '@/hooks';
import { logger } from '@/lib/logger';
import type {
  ManipulationDetection,
  DetectionMetrics,
  ManipulationType,
  DetectionSeverity,
} from '@/lib/types/security/detection';
import { fetchApiData, cn, formatTime, formatPercentValue, formatConfidence, formatChangePercent } from '@/lib/utils';
import { TimeRangeSelector, DashboardSection, DashboardGrid } from '@/components/dashboard/ProfessionalDashboard';
import { MetricCard } from '@/components/charts/ProfessionalChart';

// ============================================================================
// Types
// ============================================================================

interface MonitorStatus {
  isRunning: boolean;
  activeMonitors: string[];
  totalMonitoredFeeds: number;
  lastCheckTime: string;
  recentDetections: number;
  systemHealth: 'healthy' | 'degraded' | 'unhealthy';
}

interface DetectionFilters {
  type?: ManipulationType;
  severity?: DetectionSeverity;
  search?: string;
}

// ============================================================================
// Components
// ============================================================================

function DetectionStatusCard({ status }: { status: MonitorStatus }) {
  const config = {
    healthy: {
      icon: ShieldCheck,
      color: 'text-green-500',
      bg: 'bg-green-500/10',
      label: 'System Healthy',
      description: 'All monitoring systems operational',
    },
    degraded: {
      icon: ShieldAlert,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      label: 'System Degraded',
      description: 'Elevated detection activity',
    },
    unhealthy: {
      icon: ShieldAlert,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      label: 'System Alert',
      description: 'High detection rate - investigation recommended',
    },
  };

  const { icon: Icon, color, bg, label, description } = config[status.systemHealth];

  return (
    <Card
      className={cn(
        'border-l-4',
        status.systemHealth === 'healthy'
          ? 'border-l-green-500'
          : status.systemHealth === 'degraded'
            ? 'border-l-yellow-500'
            : 'border-l-red-500',
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className={cn('rounded-lg p-3', bg)}>
              <Icon className={cn('h-6 w-6', color)} />
            </div>
            <div>
              <h3 className="font-semibold">{label}</h3>
              <p className="text-muted-foreground text-sm">{description}</p>
            </div>
          </div>
          <Badge variant={status.isRunning ? 'default' : 'secondary'}>
            {status.isRunning ? 'Monitoring Active' : 'Monitoring Paused'}
          </Badge>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-4">
          <div>
            <p className="text-muted-foreground text-xs">Monitored Feeds</p>
            <p className="text-xl font-bold">{status.totalMonitoredFeeds}</p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Recent Detections (1h)</p>
            <p
              className={cn(
                'text-xl font-bold',
                status.recentDetections > 10 ? 'text-red-500' : 'text-green-500',
              )}
            >
              {status.recentDetections}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground text-xs">Last Check</p>
            <p className="text-sm font-medium">{formatTime(status.lastCheckTime)}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DetectionTypeChart({ metrics }: { metrics: DetectionMetrics | null }) {
  const typeData = metrics?.detectionsByType || {};
  const total = Object.values(typeData).reduce((a, b) => a + b, 0);

  const typeConfig: Record<string, { label: string; color: string }> = {
    flash_loan_attack: { label: 'Flash Loan Attack', color: 'bg-red-500' },
    sandwich_attack: { label: 'Sandwich Attack', color: 'bg-amber-500' },
    liquidity_manipulation: { label: 'Liquidity Manipulation', color: 'bg-yellow-500' },
    statistical_anomaly: { label: 'Statistical Anomaly', color: 'bg-blue-500' },
    price_manipulation: { label: 'Price Manipulation', color: 'bg-purple-500' },
    oracle_manipulation: { label: 'Oracle Manipulation', color: 'bg-pink-500' },
  };

  return (
    <ChartCard
      title="Detection Types"
      description="Distribution of detected attack types"
      icon={<TrendingUp className="h-5 w-5" />}
      tooltip="Breakdown of different attack types detected by the system"
    >
      <div className="space-y-4">
        {Object.entries(typeData)
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => {
            const config = typeConfig[type] || { label: type, color: 'bg-gray-500' };
            const percentage = total > 0 ? (count / total) * 100 : 0;

            return (
              <div key={type} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{config.label}</span>
                  <span className="text-muted-foreground">
                    {count} ({formatPercentValue(percentage, 1)})
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className={cn('h-2 rounded-full transition-all', config.color)}
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}

        {total === 0 && (
          <div className="text-muted-foreground py-8 text-center">
            <ShieldCheck className="mx-auto mb-2 h-12 w-12 text-green-500" />
            <p>No detections recorded yet</p>
            <p className="text-sm">System is monitoring and will alert on suspicious activity</p>
          </div>
        )}
      </div>
    </ChartCard>
  );
}

function SeverityDistribution({ metrics }: { metrics: DetectionMetrics | null }) {
  const severityData = metrics?.detectionsBySeverity || {};

  const severityConfig: Record<string, { label: string; color: string; bg: string }> = {
    critical: { label: 'Critical', color: 'text-red-500', bg: 'bg-red-500' },
    high: { label: 'High', color: 'text-amber-500', bg: 'bg-amber-500' },
    medium: { label: 'Medium', color: 'text-yellow-500', bg: 'bg-yellow-500' },
    low: { label: 'Low', color: 'text-blue-500', bg: 'bg-blue-500' },
  };

  return (
    <ChartCard
      title="Severity Distribution"
      description="Breakdown by severity level"
      icon={<AlertTriangle className="h-5 w-5" />}
      tooltip="Distribution of detections by severity level"
    >
      <div className="grid grid-cols-2 gap-4">
        {Object.entries(severityConfig).map(([severity, config]) => {
          const count = severityData[severity] || 0;

          return (
            <div
              key={severity}
              className={cn(
                'rounded-lg border p-4 transition-all duration-300 hover:shadow-md',
                count > 0 ? 'border-opacity-50' : 'opacity-50',
              )}
              style={{
                borderColor:
                  severity === 'critical'
                    ? '#ef4444'
                    : severity === 'high'
                      ? '#f97316'
                      : severity === 'medium'
                        ? '#eab308'
                        : '#3b82f6',
              }}
            >
              <div className="flex items-center gap-2">
                <div className={cn('h-3 w-3 rounded-full', config.bg)} />
                <span className={cn('font-semibold', config.color)}>{config.label}</span>
              </div>
              <p className="mt-2 text-2xl font-bold">{count}</p>
            </div>
          );
        })}
      </div>
    </ChartCard>
  );
}

function DetectionList({
  detections,
  isLoading,
  onSelect,
}: {
  detections: ManipulationDetection[];
  isLoading: boolean;
  onSelect: (detection: ManipulationDetection) => void;
}) {
  const getSeverityColor = (severity: DetectionSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500 text-white';
      case 'high':
        return 'bg-amber-500 text-white';
      case 'medium':
        return 'bg-yellow-500 text-black';
      case 'low':
        return 'bg-blue-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getTypeIcon = (type: ManipulationType) => {
    switch (type) {
      case 'flash_loan_attack':
        return '⚡';
      case 'sandwich_attack':
        return '🥪';
      case 'liquidity_manipulation':
        return '💧';
      case 'statistical_anomaly':
        return '📊';
      default:
        return '🔍';
    }
  };

  if (isLoading) {
    return <SkeletonList count={5} />;
  }

  if (detections.length === 0) {
    return <EmptySecurityState onRefresh={() => window.location.reload()} />;
  }

  return (
    <StaggerContainer className="space-y-3" staggerDelay={50}>
      {detections.map((detection) => (
        <HoverCard key={detection.id} hoverScale={false} hoverShadow={true} hoverBorder={true}>
          <button
            type="button"
            onClick={() => onSelect(detection)}
            className="group relative w-full cursor-pointer overflow-hidden rounded-lg border bg-white p-4 text-left transition-all"
          >
            {/* 左侧装饰条 */}
            <div
              className={cn(
                'absolute bottom-0 left-0 top-0 w-1 -translate-x-full transition-transform duration-300 group-hover:translate-x-0',
                detection.severity === 'critical'
                  ? 'bg-red-500'
                  : detection.severity === 'high'
                    ? 'bg-amber-500'
                    : detection.severity === 'medium'
                      ? 'bg-yellow-500'
                      : 'bg-blue-500',
              )}
            />
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <span className="text-2xl">{getTypeIcon(detection.type)}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold capitalize">
                      {detection.type.replace(/_/g, ' ')}
                    </h4>
                    <Badge className={getSeverityColor(detection.severity)}>
                      {detection.severity}
                    </Badge>
                    {detection.status === 'confirmed' && (
                      <Badge variant="outline" className="border-green-500 text-green-500">
                        Confirmed
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    {detection.protocol} • {detection.symbol} • {detection.chain}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(detection.detectedAt)}
                    </span>
                    <span>Confidence: {formatConfidence(detection.confidenceScore, 1)}</span>
                    {detection.financialImpactUsd && (
                      <span className="text-red-500">
                        Impact: ${detection.financialImpactUsd.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight className="text-muted-foreground h-5 w-5 transition-transform group-hover:translate-x-1" />
            </div>
          </button>
        </HoverCard>
      ))}
    </StaggerContainer>
  );
}

function DetectionDetail({
  detection,
  onClose,
}: {
  detection: ManipulationDetection | null;
  onClose: () => void;
}) {
  if (!detection) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-auto">
        <CardHeader className="sticky top-0 z-10 border-b bg-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="capitalize">{detection.type.replace(/_/g, ' ')}</CardTitle>
              <CardDescription>
                {detection.protocol} • {detection.symbol} • {detection.chain}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-muted-foreground text-xs">Severity</p>
              <Badge
                className={
                  detection.severity === 'critical'
                    ? 'bg-red-500'
                    : detection.severity === 'high'
                      ? 'bg-amber-500'
                      : detection.severity === 'medium'
                        ? 'bg-yellow-500 text-black'
                        : 'bg-blue-500'
                }
              >
                {detection.severity.toUpperCase()}
              </Badge>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-muted-foreground text-xs">Confidence Score</p>
              <p className="text-lg font-bold">{formatConfidence(detection.confidenceScore, 1)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-muted-foreground text-xs">Detected At</p>
              <p className="text-sm font-medium">{formatTime(detection.detectedAt)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-muted-foreground text-xs">Status</p>
              <Badge variant={detection.status === 'confirmed' ? 'default' : 'secondary'}>
                {detection.status}
              </Badge>
            </div>
          </div>

          {/* Evidence */}
          {detection.evidence.length > 0 && (
            <div>
              <h4 className="mb-3 font-semibold">Evidence</h4>
              <div className="space-y-3">
                {detection.evidence.map((evidence, index) => (
                  <div key={index} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium capitalize">
                        {evidence.type.replace(/_/g, ' ')}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        Confidence: {formatConfidence(evidence.confidence, 1)}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">{evidence.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suspicious Transactions */}
          {detection.suspiciousTransactions.length > 0 && (
            <div>
              <h4 className="mb-3 font-semibold">Suspicious Transactions</h4>
              <div className="space-y-2">
                {detection.suspiciousTransactions.map((tx, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div>
                      <p className="font-mono text-sm">{tx.hash.slice(0, 20)}...</p>
                      <p className="text-muted-foreground text-xs">
                        {tx.type} • {formatTime(tx.timestamp)}
                      </p>
                    </div>
                    <a
                      href={`https://etherscan.io/tx/${tx.hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-purple-600 hover:text-purple-800"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Impact */}
          {(detection.priceImpact || detection.financialImpactUsd) && (
            <div>
              <h4 className="mb-3 font-semibold">Impact Assessment</h4>
              <div className="grid grid-cols-2 gap-4">
                {detection.priceImpact && (
                  <div className="rounded-lg bg-red-50 p-4">
                    <p className="text-muted-foreground text-xs">Price Impact</p>
                    <p className="text-lg font-bold text-red-600">
                      {formatChangePercent(detection.priceImpact / 100, 2, false)}
                    </p>
                  </div>
                )}
                {detection.financialImpactUsd && (
                  <div className="rounded-lg bg-red-50 p-4">
                    <p className="text-muted-foreground text-xs">Financial Impact</p>
                    <p className="text-lg font-bold text-red-600">
                      ${detection.financialImpactUsd.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function SecurityDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<MonitorStatus | null>(null);
  const [metrics, setMetrics] = useState<DetectionMetrics | null>(null);
  const [detections, setDetections] = useState<ManipulationDetection[]>([]);
  const [selectedDetection, setSelectedDetection] = useState<ManipulationDetection | null>(null);
  const [filters, setFilters] = useState<DetectionFilters>({});
  const [activeTab, setActiveTab] = useState('overview');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState('24h');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Toast notifications
  const { toasts, removeToast, success, error: showError } = useToast();

  // Data cache
  const { getCachedData, setCachedData } = useDataCache<{
    status: MonitorStatus;
    metrics: DetectionMetrics;
    detections: ManipulationDetection[];
  }>({ key: 'security_dashboard', ttl: 5 * 60 * 1000 });

  // Auto refresh
  const {
    isEnabled: autoRefreshEnabled,
    setIsEnabled: setAutoRefreshEnabled,
    refreshInterval,
    setRefreshInterval,
    timeUntilRefresh,
    refresh,
  } = useAutoRefreshLegacy({
    onRefresh: () => fetchData(false),
    interval: 30000,
    enabled: true,
    pauseWhenHidden: true,
  });

  const fetchData = useCallback(
    async (showToast = true) => {
      try {
        setLoading(true);
        setError(null);

        // Try to load from cache first
        const cached = getCachedData();
        if (cached && !lastUpdated) {
          setStatus(cached.status);
          setMetrics(cached.metrics);
          setDetections(cached.detections);
          setLoading(false);
        }

        const [statusRes, metricsRes, detectionsRes] = await Promise.all([
          fetchApiData<{ status: MonitorStatus }>('/api/security/monitor-status'),
          fetchApiData<{ metrics: DetectionMetrics }>('/api/security/metrics'),
          fetchApiData<{ detections: ManipulationDetection[] }>(
            '/api/security/detections?limit=50',
          ),
        ]);

        setStatus(statusRes.status);
        setMetrics(metricsRes.metrics);
        setDetections(detectionsRes.detections);
        setLastUpdated(new Date());

        // Cache the data
        setCachedData({
          status: statusRes.status,
          metrics: metricsRes.metrics,
          detections: detectionsRes.detections,
        });

        if (showToast) {
          success('Data refreshed', 'Security data has been updated');
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch security data';
        setError(errorMessage);
        showError('Failed to refresh', errorMessage);
        logger.error('Failed to fetch security data', { error });
      } finally {
        setLoading(false);
      }
    },
    [getCachedData, setCachedData, lastUpdated, success, showError],
  );

  // Keyboard shortcuts
  useDashboardShortcuts({
    onRefresh: () => {
      refresh();
    },
    onExport: () => {
      handleExport();
      success('Export complete', 'Security report has been downloaded');
    },
    onSearchFocus: () => {
      searchInputRef.current?.focus();
    },
    onTabChange: (tab) => setActiveTab(tab),
    tabs: ['overview', 'detections', 'analytics'],
    enabled: true,
  });

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const filteredDetections = useMemo(() => {
    return detections.filter((d) => {
      if (filters.type && d.type !== filters.type) return false;
      if (filters.severity && d.severity !== filters.severity) return false;
      if (filters.search) {
        const search = filters.search.toLowerCase();
        return (
          d.type.toLowerCase().includes(search) ||
          d.protocol.toLowerCase().includes(search) ||
          d.symbol.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [detections, filters]);

  const handleExport = () => {
    const data = {
      metrics,
      detections: filteredDetections,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-report-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Loading state for stats
  const renderStats = () => {
    if (loading && !metrics) {
      return (
        <StatCardGroup>
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </StatCardGroup>
      );
    }

    return (
      <StatCardGroup>
        <AnimatedContainer delay={0}>
          <StatCard
            title="Total Detections"
            value={metrics?.totalDetections || 0}
            icon={<ShieldAlert className="h-5 w-5 text-red-600" />}
            loading={loading}
            color="red"
            trend={{ value: 12.5, isPositive: false }}
            sparklineData={[10, 15, 12, 18, 20, 16, 25]}
          />
        </AnimatedContainer>
        <AnimatedContainer delay={100}>
          <StatCard
            title="Critical Alerts"
            value={metrics?.detectionsBySeverity?.critical || 0}
            icon={<AlertTriangle className="h-5 w-5 text-amber-600" />}
            loading={loading}
            color="amber"
            trend={{ value: 5.2, isPositive: false }}
            sparklineData={[2, 3, 5, 4, 6, 8, 7]}
          />
        </AnimatedContainer>
        <AnimatedContainer delay={200}>
          <StatCard
            title="Avg Confidence"
            value={formatConfidence(metrics?.averageConfidence, 1)}
            icon={<Activity className="h-5 w-5 text-blue-600" />}
            loading={loading}
            color="blue"
            trend={{ value: 3.8, isPositive: true }}
            sparklineData={[85, 87, 86, 88, 89, 91, 92]}
          />
        </AnimatedContainer>
        <AnimatedContainer delay={300}>
          <StatCard
            title="False Positives"
            value={metrics?.falsePositives || 0}
            icon={<ShieldCheck className="h-5 w-5 text-green-600" />}
            loading={loading}
            color="green"
            trend={{ value: 8.1, isPositive: true }}
            sparklineData={[5, 4, 6, 3, 4, 2, 3]}
          />
        </AnimatedContainer>
      </StatCardGroup>
    );
  };

  // Error state
  if (error && !loading && !status) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-20">
          <ShieldAlert className="mb-4 h-16 w-16 text-red-500" />
          <h2 className="text-xl font-semibold">Failed to Load Security Data</h2>
          <p className="text-muted-foreground mt-2">{error}</p>
          <Button onClick={() => fetchData()} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  // 计算检测统计
  const detectionStats = useMemo(() => {
    const critical = detections.filter(d => d.severity === 'critical').length;
    const high = detections.filter(d => d.severity === 'high').length;
    const confirmed = detections.filter(d => d.status === 'confirmed').length;
    return { critical, high, confirmed, total: detections.length };
  }, [detections]);

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header - 使用专业级 PageHeader 组件 */}
      <PageHeader
        breadcrumbs={[{ label: 'Security', href: '/security' }, { label: 'Dashboard' }]}
        title="Security Detection Center"
        description="Real-time monitoring for price manipulation and suspicious activities"
        icon={<Shield className="text-primary h-6 w-6" />}
        onRefresh={() => refresh()}
        onExport={handleExport}
        refreshDisabled={loading}
        exportDisabled={!metrics}
        loading={loading}
        extraActions={
          <div className="flex items-center gap-3">
            <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
            <AutoRefreshControl
              isEnabled={autoRefreshEnabled}
              onToggle={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              interval={refreshInterval}
              onIntervalChange={setRefreshInterval}
              timeUntilRefresh={timeUntilRefresh}
            />
          </div>
        }
      />

      {/* 关键指标卡片 */}
      <DashboardSection title="Detection Overview" description="Security detection statistics">
        <DashboardGrid columns={4}>
          <MetricCard
            title="Critical"
            value={detectionStats.critical}
            status={detectionStats.critical > 0 ? 'critical' : 'healthy'}
            icon={<ShieldAlert className="h-5 w-5" />}
          />
          <MetricCard
            title="High Risk"
            value={detectionStats.high}
            status={detectionStats.high > 0 ? 'warning' : 'healthy'}
            icon={<AlertTriangle className="h-5 w-5" />}
          />
          <MetricCard
            title="Confirmed"
            value={detectionStats.confirmed}
            status="healthy"
            icon={<ShieldCheck className="h-5 w-5" />}
          />
          <MetricCard
            title="Total"
            value={detectionStats.total}
            status={detectionStats.total > 10 ? 'warning' : 'healthy'}
            icon={<Activity className="h-5 w-5" />}
          />
        </DashboardGrid>
      </DashboardSection>

      {/* Status Card */}
      {loading && !status ? (
        <CardSkeleton />
      ) : status ? (
        <DetectionStatusCard status={status} />
      ) : null}

      {/* Main Content */}
      <AnimatedContainer delay={100}>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="overview">
              <Activity className="mr-2 h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="detections">
              <ShieldAlert className="mr-2 h-4 w-4" />
              Detections ({filteredDetections.length})
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <TrendingUp className="mr-2 h-4 w-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Stats Cards */}
            {renderStats()}

            {/* Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              {loading && !metrics ? (
                <>
                  <ChartCardSkeleton />
                  <ChartCardSkeleton />
                </>
              ) : (
                <>
                  <AnimatedContainer delay={400}>
                    <DetectionTypeChart metrics={metrics} />
                  </AnimatedContainer>
                  <AnimatedContainer delay={500}>
                    <SeverityDistribution metrics={metrics} />
                  </AnimatedContainer>
                </>
              )}
            </div>

            {/* Recent Detections Preview */}
            <ChartCard
              title="Recent Detections"
              description="Latest security detections"
              icon={<ShieldAlert className="h-5 w-5" />}
              extraActions={
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('detections')}>
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              }
            >
              <DetectionList
                detections={filteredDetections.slice(0, 5)}
                isLoading={loading}
                onSelect={setSelectedDetection}
              />
            </ChartCard>
          </TabsContent>

          {/* Detections Tab */}
          <TabsContent value="detections" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="relative flex-1">
                    <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
                    <Input
                      ref={searchInputRef}
                      placeholder="Search by type, protocol, or symbol... (⌘F)"
                      value={filters.search || ''}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      className="pl-9"
                    />
                  </div>
                  <div className="flex gap-2">
                    <select
                      className="rounded-md border px-3 py-2 text-sm"
                      value={filters.severity || ''}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          severity: (e.target.value as DetectionSeverity) || undefined,
                        })
                      }
                    >
                      <option value="">All Severities</option>
                      <option value="critical">Critical</option>
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                    <select
                      className="rounded-md border px-3 py-2 text-sm"
                      value={filters.type || ''}
                      onChange={(e) =>
                        setFilters({
                          ...filters,
                          type: (e.target.value as ManipulationType) || undefined,
                        })
                      }
                    >
                      <option value="">All Types</option>
                      <option value="flash_loan_attack">Flash Loan</option>
                      <option value="sandwich_attack">Sandwich</option>
                      <option value="liquidity_manipulation">Liquidity</option>
                      <option value="statistical_anomaly">Statistical</option>
                    </select>
                    {(filters.search || filters.severity || filters.type) && (
                      <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detection List */}
            <Card>
              <CardHeader>
                <CardTitle>All Detections</CardTitle>
                <CardDescription>
                  Showing {filteredDetections.length} of {detections.length} total detections
                </CardDescription>
              </CardHeader>
              <CardContent>
                {filteredDetections.length === 0 &&
                !loading &&
                (filters.search || filters.severity || filters.type) ? (
                  <EmptySearchState searchTerm={filters.search} onClear={() => setFilters({})} />
                ) : (
                  <DetectionList
                    detections={filteredDetections}
                    isLoading={loading}
                    onSelect={setSelectedDetection}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <DetectionTypeChart metrics={metrics} />
              <SeverityDistribution metrics={metrics} />
            </div>

            {/* Additional Analytics */}
            <Card>
              <CardHeader>
                <CardTitle>Detection Trends</CardTitle>
                <CardDescription>Historical detection patterns and insights</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-muted-foreground py-12 text-center">
                  <TrendingUp className="mx-auto mb-4 h-12 w-12" />
                  <p>Historical trend analysis coming soon</p>
                  <p className="text-sm">Track detection patterns over time</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </AnimatedContainer>

      {/* Detail Modal */}
      {selectedDetection && (
        <DetectionDetail detection={selectedDetection} onClose={() => setSelectedDetection(null)} />
      )}
    </div>
  );
}
