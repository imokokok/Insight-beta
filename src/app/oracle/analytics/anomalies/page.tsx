/**
 * ML Anomaly Detection Dashboard
 *
 * ML 异常检测仪表板
 * - 异常分数趋势
 * - 异常事件列表
 * - 模型配置
 * - 实时检测
 */

'use client';

import { useEffect, useState, useCallback } from 'react';

import {
  Brain,
  Activity,
  AlertTriangle,
  TrendingUp,
  RefreshCw,
  Play,
  Settings,
  ChevronRight,
  BarChart3,
  Clock,
  Zap,
} from 'lucide-react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';

import {
  StatCard,
  StatCardSkeleton,
  StatCardGroup,
  HoverCard,
  StaggerContainer,
} from '@/components/common';
import { AnimatedContainer } from '@/components/common/AnimatedContainer';
import { AutoRefreshControl } from '@/components/common/AutoRefreshControl';
import { ChartCard } from '@/components/common/ChartCard';
import { ToastContainer, useToast } from '@/components/common/DashboardToast';
import { PageHeader } from '@/components/common/PageHeader';
import { EmptyAnomalyState, EmptySearchState, RefreshIndicator } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SearchInput } from '@/components/ui/EnhancedInput';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { ChartSkeleton, SkeletonList } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAutoRefreshLegacy, useDataCache } from '@/hooks';
import { usePageOptimizations } from '@/hooks/usePageOptimizations';
import { logger } from '@/shared/logger';
import { fetchApiData, cn, formatTime } from '@/shared/utils';

// ============================================================================
// Types
// ============================================================================

interface Anomaly {
  id: string;
  symbol: string;
  timestamp: number;
  currentPrice: number;
  expectedPrice: number;
  deviation: number;
  confidence: number;
  type: 'statistical' | 'seasonal' | 'multiProtocol' | 'trendBreak';
  severity: 'low' | 'medium' | 'high' | 'critical';
  details: Record<string, unknown>;
}

interface AnomalyStats {
  total: number;
  byType: Record<string, number>;
  bySeverity: Record<string, number>;
  averageConfidence: number;
}

interface ModelConfig {
  zScoreThreshold: number;
  minDataPoints: number;
  lookbackWindowMs: number;
  useSeasonalDecomposition: boolean;
  seasonalPeriod: number;
}

// ============================================================================
// Components
// ============================================================================

function AnomalyTypeBadge({ type }: { type: Anomaly['type'] }) {
  const config = {
    statistical: { label: 'Statistical', color: 'bg-blue-500', icon: BarChart3 },
    seasonal: { label: 'Seasonal', color: 'bg-primary/50', icon: TrendingUp },
    multiProtocol: { label: 'Multi-Protocol', color: 'bg-amber-500', icon: Activity },
    trendBreak: { label: 'Trend Break', color: 'bg-red-500', icon: Zap },
  };

  const { label, color, icon: Icon } = config[type] || config.statistical;

  return (
    <Badge className={cn('gap-1', color)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

function SeverityBadge({ severity }: { severity: Anomaly['severity'] }) {
  const config = {
    critical: { color: 'bg-red-500', label: 'Critical' },
    high: { color: 'bg-amber-500', label: 'High' },
    medium: { color: 'bg-yellow-500 text-black', label: 'Medium' },
    low: { color: 'bg-blue-500', label: 'Low' },
  };

  const { color, label } = config[severity];

  return <Badge className={color}>{label}</Badge>;
}

function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  let color = 'bg-green-500';
  if (percentage < 70) color = 'bg-yellow-500';
  if (percentage < 50) color = 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 rounded-full bg-gray-100">
        <div
          className={cn('h-2 rounded-full transition-all', color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-medium">{percentage}%</span>
    </div>
  );
}

function AnomalyTrendChart({ anomalies }: { anomalies: Anomaly[] }) {
  const data = anomalies
    .slice()
    .sort((a, b) => a.timestamp - b.timestamp)
    .map((a) => ({
      time: new Date(a.timestamp).toLocaleTimeString(),
      confidence: Math.round(a.confidence * 100),
      deviation: Math.round(a.deviation * 100),
      severity: a.severity,
    }));

  return (
    <ChartCard
      title="Anomaly Confidence Trend"
      description="Confidence scores over time"
      icon={<TrendingUp className="h-5 w-5" />}
      tooltip="Trend of anomaly detection confidence scores over the last 24 hours"
    >
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Area
              type="monotone"
              dataKey="confidence"
              stroke="#8b5cf6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#confidenceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}

function AnomalyTypeDistribution({ stats }: { stats: AnomalyStats | null }) {
  const typeData = stats?.byType || {};
  const total = Object.values(typeData).reduce((a, b) => a + b, 0);

  const typeConfig: Record<string, { label: string; color: string; description: string }> = {
    statistical: {
      label: 'Statistical',
      color: 'bg-blue-500',
      description: 'Z-score based anomalies',
    },
    seasonal: {
      label: 'Seasonal',
      color: 'bg-primary/50',
      description: 'Seasonal decomposition',
    },
    multiProtocol: {
      label: 'Multi-Protocol',
      color: 'bg-amber-500',
      description: 'Cross-protocol deviations',
    },
    trendBreak: {
      label: 'Trend Break',
      color: 'bg-red-500',
      description: 'Sudden trend changes',
    },
  };

  return (
    <ChartCard
      title="Detection Types"
      description="ML algorithm distribution"
      icon={<BarChart3 className="h-5 w-5" />}
      tooltip="Breakdown of anomalies by detection algorithm type"
    >
      <div className="space-y-4">
        {Object.entries(typeConfig).map(([type, config]) => {
          const count = typeData[type] || 0;
          const percentage = total > 0 ? (count / total) * 100 : 0;

          return (
            <div key={type} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium">{config.label}</span>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </div>
                <span className="text-sm font-medium">
                  {count} ({percentage.toFixed(1)}%)
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
          <div className="py-8 text-center text-muted-foreground">
            <Brain className="mx-auto mb-2 h-12 w-12 text-primary" />
            <p>No anomalies detected yet</p>
            <p className="text-sm">ML models are monitoring price feeds</p>
          </div>
        )}
      </div>
    </ChartCard>
  );
}

function AnomalyList({
  anomalies,
  isLoading,
  onSelect,
}: {
  anomalies: Anomaly[];
  isLoading: boolean;
  onSelect: (anomaly: Anomaly) => void;
}) {
  if (isLoading) {
    return <SkeletonList count={5} />;
  }

  if (anomalies.length === 0) {
    return <EmptyAnomalyState onRefresh={() => window.location.reload()} />;
  }

  return (
    <StaggerContainer className="space-y-3" staggerChildren={0.05}>
      {anomalies.map((anomaly) => (
        <HoverCard key={anomaly.id} hoverScale={false} hoverShadow={true} hoverBorder={true}>
          <button
            type="button"
            onClick={() => onSelect(anomaly)}
            className="group relative w-full cursor-pointer overflow-hidden rounded-lg border bg-white p-4 text-left transition-all"
          >
            {/* 左侧装饰条 */}
            <div
              className={cn(
                'absolute bottom-0 left-0 top-0 w-1 -translate-x-full transition-transform duration-300 group-hover:translate-x-0',
                anomaly.severity === 'critical'
                  ? 'bg-red-500'
                  : anomaly.severity === 'high'
                    ? 'bg-amber-500'
                    : anomaly.severity === 'medium'
                      ? 'bg-yellow-500'
                      : 'bg-blue-500',
              )}
            />

            <div className="relative flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <AnomalyTypeBadge type={anomaly.type} />
                  <SeverityBadge severity={anomaly.severity} />
                </div>
                <p className="font-semibold">{anomaly.symbol}</p>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTime(anomaly.timestamp)}
                  </span>
                  <span>Deviation: {(anomaly.deviation * 100).toFixed(2)}%</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <ConfidenceIndicator confidence={anomaly.confidence} />
                <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
              </div>
            </div>
          </button>
        </HoverCard>
      ))}
    </StaggerContainer>
  );
}

function AnomalyDetail({ anomaly, onClose }: { anomaly: Anomaly | null; onClose: () => void }) {
  if (!anomaly) return null;

  const priceChange =
    ((anomaly.currentPrice - anomaly.expectedPrice) / anomaly.expectedPrice) * 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <Card className="max-h-[90vh] w-full max-w-2xl overflow-auto">
        <CardHeader className="sticky top-0 z-10 border-b bg-white">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Anomaly Details
              </CardTitle>
              <CardDescription>{anomaly.symbol}</CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-6">
          {/* Overview */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg bg-primary/5 p-4">
              <p className="text-xs text-muted-foreground">Current Price</p>
              <p className="text-lg font-bold">${anomaly.currentPrice.toFixed(4)}</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs text-muted-foreground">Expected Price</p>
              <p className="text-lg font-bold">${anomaly.expectedPrice.toFixed(4)}</p>
            </div>
            <div className="rounded-lg bg-red-50 p-4">
              <p className="text-xs text-muted-foreground">Price Change</p>
              <p
                className={cn(
                  'text-lg font-bold',
                  priceChange > 0 ? 'text-green-600' : 'text-red-600',
                )}
              >
                {priceChange > 0 ? '+' : ''}
                {priceChange.toFixed(2)}%
              </p>
            </div>
            <div className="rounded-lg bg-blue-50 p-4">
              <p className="text-xs text-muted-foreground">Confidence Score</p>
              <p className="text-lg font-bold">{(anomaly.confidence * 100).toFixed(1)}%</p>
            </div>
          </div>

          {/* Detection Info */}
          <div>
            <h4 className="mb-3 font-semibold">Detection Information</h4>
            <div className="space-y-2 rounded-lg border p-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Type</span>
                <AnomalyTypeBadge type={anomaly.type} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Severity</span>
                <SeverityBadge severity={anomaly.severity} />
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Detected At</span>
                <span>{formatTime(anomaly.timestamp)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Deviation</span>
                <span>{(anomaly.deviation * 100).toFixed(2)}%</span>
              </div>
            </div>
          </div>

          {/* Details */}
          {Object.keys(anomaly.details).length > 0 && (
            <div>
              <h4 className="mb-3 font-semibold">Technical Details</h4>
              <div className="space-y-2 rounded-lg bg-gray-50 p-4">
                {Object.entries(anomaly.details).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="capitalize text-muted-foreground">
                      {key.replace(/_/g, ' ')}
                    </span>
                    <span className="font-mono text-sm">
                      {typeof value === 'number' ? value.toFixed(4) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ModelConfiguration({ config }: { config: ModelConfig }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Model Configuration
        </CardTitle>
        <CardDescription>Current ML model parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Z-Score Threshold</span>
            <span className="font-medium">{config.zScoreThreshold}</span>
          </div>
          <Progress value={(config.zScoreThreshold / 5) * 100} />
          <p className="text-xs text-muted-foreground">Higher values = less sensitive</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Minimum Data Points</span>
            <span className="font-medium">{config.minDataPoints}</span>
          </div>
          <Progress value={(config.minDataPoints / 100) * 100} />
          <p className="text-xs text-muted-foreground">Required for statistical significance</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Lookback Window</span>
            <span className="font-medium">{config.lookbackWindowMs / (60 * 60 * 1000)}h</span>
          </div>
          <Progress value={(config.lookbackWindowMs / (48 * 60 * 60 * 1000)) * 100} />
          <p className="text-xs text-muted-foreground">Historical data window</p>
        </div>

        <div className="flex items-center justify-between rounded-lg border p-3">
          <div>
            <span className="font-medium">Seasonal Decomposition</span>
            <p className="text-xs text-muted-foreground">Detect periodic patterns</p>
          </div>
          <Badge variant={config.useSeasonalDecomposition ? 'default' : 'secondary'}>
            {config.useSeasonalDecomposition ? 'Enabled' : 'Disabled'}
          </Badge>
        </div>

        {config.useSeasonalDecomposition && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Seasonal Period</span>
              <span className="font-medium">{config.seasonalPeriod} data points</span>
            </div>
            <Progress value={(config.seasonalPeriod / 48) * 100} />
            <p className="text-xs text-muted-foreground">Period for seasonal pattern detection</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function AnomalyDetectionPage() {
  const [loading, setLoading] = useState(true);
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [stats, setStats] = useState<AnomalyStats | null>(null);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [detecting, setDetecting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Toast notifications
  const { toasts, removeToast, success, error: showError } = useToast();

  // Data cache
  const { getCachedData, setCachedData } = useDataCache<{
    anomalies: Anomaly[];
    stats: AnomalyStats;
  }>({ key: 'anomaly_dashboard', ttl: 5 * 60 * 1000 });

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
    interval: 60000,
    enabled: true,
    pauseWhenHidden: true,
  });

  const defaultConfig: ModelConfig = {
    zScoreThreshold: 3,
    minDataPoints: 30,
    lookbackWindowMs: 24 * 60 * 60 * 1000,
    useSeasonalDecomposition: true,
    seasonalPeriod: 24,
  };

  const fetchData = useCallback(
    async (showToast = true) => {
      try {
        setLoading(true);
        setError(null);

        // Try to load from cache first
        const cached = getCachedData();
        if (cached && !lastUpdated) {
          setAnomalies(cached.anomalies);
          setStats(cached.stats);
          setLoading(false);
        }

        const response = await fetchApiData<{ anomalies: Anomaly[]; stats: AnomalyStats }>(
          '/api/oracle/analytics/anomalies?hours=24&limit=100',
        );
        setAnomalies(response.anomalies);
        setStats(response.stats);
        setLastUpdated(new Date());

        // Cache the data
        setCachedData({
          anomalies: response.anomalies,
          stats: response.stats,
        });

        if (showToast) {
          success('Data refreshed', 'Anomaly data has been updated');
        }
      } catch (error: unknown) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch anomaly data';
        setError(errorMessage);
        showError('Failed to refresh', errorMessage);
        logger.error('Failed to fetch anomaly data', { error });
      } finally {
        setLoading(false);
      }
    },
    [getCachedData, setCachedData, lastUpdated, success, showError],
  );

  // 页面优化：键盘快捷键
  usePageOptimizations({
    pageName: '异常检测分析',
    onRefresh: async () => {
      await refresh();
    },
    enableSearch: true,
    searchSelector: 'input[type="text"][placeholder*="搜索"]',
    showRefreshToast: true,
  });

  useEffect(() => {
    fetchData(false);
  }, [fetchData]);

  const handleDetect = async (symbol: string) => {
    try {
      setDetecting(true);
      await fetchApiData('/api/oracle/analytics/anomalies', {
        method: 'POST',
        body: JSON.stringify({ symbol }),
      });
      await fetchData();
    } catch (error) {
      logger.error('Failed to trigger detection', { error });
    } finally {
      setDetecting(false);
    }
  };

  const filteredAnomalies = anomalies.filter((a) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      a.symbol.toLowerCase().includes(query) ||
      a.type.toLowerCase().includes(query) ||
      a.severity.toLowerCase().includes(query)
    );
  });

  const handleExport = () => {
    const data = {
      anomalies: filteredAnomalies,
      stats,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `anomaly-report-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Loading state for stats
  const renderStats = () => {
    if (loading && !stats) {
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
            title="Total Anomalies"
            value={stats?.total || 0}
            icon={<Brain className="h-5 w-5 text-primary" />}
            loading={loading}
            color="purple"
            trend={{ value: 8.3, isPositive: false }}
            sparklineData={[45, 52, 48, 55, 60, 58, 65]}
          />
        </AnimatedContainer>
        <AnimatedContainer delay={100}>
          <StatCard
            title="Critical Alerts"
            value={stats?.bySeverity?.critical || 0}
            icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
            loading={loading}
            color="red"
            trend={{ value: 12.5, isPositive: false }}
            sparklineData={[3, 5, 4, 6, 8, 7, 9]}
          />
        </AnimatedContainer>
        <AnimatedContainer delay={200}>
          <StatCard
            title="Avg Confidence"
            value={`${((stats?.averageConfidence || 0) * 100).toFixed(1)}%`}
            icon={<Activity className="h-5 w-5 text-blue-600" />}
            loading={loading}
            color="blue"
            trend={{ value: 2.1, isPositive: true }}
            sparklineData={[92, 93, 92, 94, 95, 94, 96]}
          />
        </AnimatedContainer>
        <AnimatedContainer delay={300}>
          <StatCard
            title="Detection Types"
            value={Object.keys(stats?.byType || {}).length}
            icon={<BarChart3 className="h-5 w-5 text-green-600" />}
            loading={loading}
            color="green"
            trend={{ value: 0, isPositive: true }}
            sparklineData={[4, 4, 4, 4, 4, 4, 4]}
          />
        </AnimatedContainer>
      </StatCardGroup>
    );
  };

  // Error state
  if (error && !loading && !stats) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle className="mb-4 h-16 w-16 text-red-500" />
          <h2 className="text-xl font-semibold">Failed to Load Anomaly Data</h2>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button onClick={() => fetchData()} className="mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-4 sm:p-6">
      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Header - 使用专业级 PageHeader 组件 */}
      <PageHeader
        breadcrumbs={[
          { label: 'Oracle', href: '/oracle' },
          { label: 'Analytics', href: '/oracle/analytics' },
          { label: 'Anomalies' },
        ]}
        title="ML Anomaly Detection"
        description="AI-powered price anomaly detection using statistical and machine learning models"
        icon={<Brain className="h-6 w-6 text-primary" />}
        onRefresh={() => refresh()}
        onExport={handleExport}
        refreshDisabled={loading}
        exportDisabled={!stats}
        loading={loading}
        extraActions={
          <div className="flex items-center gap-3">
            <RefreshIndicator
              lastUpdated={lastUpdated}
              isRefreshing={loading}
              onRefresh={refresh}
            />
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

      {/* Stats Cards */}
      {renderStats()}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto">
          <TabsTrigger value="overview">
            <Activity className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="anomalies">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Anomalies ({filteredAnomalies.length})
          </TabsTrigger>
          <TabsTrigger value="configuration">
            <Settings className="mr-2 h-4 w-4" />
            Configuration
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {loading && !stats ? (
              <>
                <ChartSkeleton />
                <ChartSkeleton />
              </>
            ) : (
              <>
                <AnomalyTrendChart anomalies={anomalies} />
                <AnomalyTypeDistribution stats={stats} />
              </>
            )}
          </div>

          {/* Recent Anomalies */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Anomalies</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setActiveTab('anomalies')}>
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <AnomalyList
                anomalies={filteredAnomalies.slice(0, 5)}
                isLoading={loading}
                onSelect={setSelectedAnomaly}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Anomalies Tab */}
        <TabsContent value="anomalies" className="space-y-6">
          {/* Search and Detect */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 md:flex-row md:items-center">
                <div className="flex-1">
                  <SearchInput
                    placeholder="Search by symbol, type, or severity... (⌘F)"
                    value={searchQuery}
                    onChange={(value) => setSearchQuery(value)}
                    clearable={true}
                    className="w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter symbol (e.g., ETH/USD)"
                    className="w-48"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleDetect((e.target as HTMLInputElement).value);
                      }
                    }}
                  />
                  <Button disabled={detecting} onClick={() => handleDetect('ETH/USD')}>
                    <Play className="mr-2 h-4 w-4" />
                    Detect
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Anomaly List */}
          <Card>
            <CardHeader>
              <CardTitle>All Anomalies</CardTitle>
              <CardDescription>
                Showing {filteredAnomalies.length} of {anomalies.length} total anomalies
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredAnomalies.length === 0 && !loading && searchQuery ? (
                <EmptySearchState searchTerm={searchQuery} onClear={() => setSearchQuery('')} />
              ) : (
                <AnomalyList
                  anomalies={filteredAnomalies}
                  isLoading={loading}
                  onSelect={setSelectedAnomaly}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ModelConfiguration config={defaultConfig} />

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Detection Algorithms
                </CardTitle>
                <CardDescription>Active ML models and their purposes</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    <span className="font-semibold">Statistical Detection (Z-Score)</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Uses standard deviation to identify prices that deviate significantly from the
                    mean. Best for detecting sudden price spikes or drops.
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Seasonal Decomposition</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Separates time series into trend, seasonal, and residual components. Identifies
                    anomalies in the residual component.
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-amber-500" />
                    <span className="font-semibold">Multi-Protocol Analysis</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Compares prices across multiple oracle protocols. Detects when one protocol
                    diverges from the consensus.
                  </p>
                </div>

                <div className="rounded-lg border p-4">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-red-500" />
                    <span className="font-semibold">Trend Break Detection</span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Uses change point detection to identify when a price trend suddenly changes
                    direction. Useful for detecting market regime changes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Detail Modal */}
      {selectedAnomaly && (
        <AnomalyDetail anomaly={selectedAnomaly} onClose={() => setSelectedAnomaly(null)} />
      )}
    </div>
  );
}
