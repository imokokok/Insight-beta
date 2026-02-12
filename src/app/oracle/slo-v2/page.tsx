/**
 * SLO Dashboard Page
 *
 * SLO 仪表板页面 - 展示所有 SLO 的概览和状态
 */

'use client';

import { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';

import {
  Plus,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Activity,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';





import { PageSkeleton } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { logger } from '@/shared/logger';



interface SloReport {
  sloId: string;
  name: string;
  protocol: string;
  chain: string;
  metricType: string;
  targetValue: number;
  currentCompliance: number;
  status: 'compliant' | 'at_risk' | 'breached';
  errorBudget: {
    total: number;
    used: number;
    remaining: number;
    burnRate: number;
    daysUntilExhaustion?: number;
    status: string;
  };
  trend: 'improving' | 'stable' | 'degrading';
}

interface SummaryStats {
  total: number;
  compliant: number;
  atRisk: number;
  breached: number;
}

export default function SloDashboardPage() {
  const router = useRouter();
  const [reports, setReports] = useState<SloReport[]>([]);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'compliant' | 'at_risk' | 'breached'>('all');

  const fetchReports = async () => {
    try {
      const response = await fetch('/api/slo/reports');
      if (response.ok) {
        const data = await response.json();
        setReports(data.data.reports);
        setSummary(data.data.summary);
      }
    } catch (error) {
      logger.error('Failed to fetch SLO reports', { error });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();

    // Auto refresh every 60 seconds
    const interval = setInterval(fetchReports, 60000);
    return () => clearInterval(interval);
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  };

  const filteredReports = reports.filter((report) => {
    if (filter === 'all') return true;
    return report.status === filter;
  });

  const navigateToDetail = (sloId: string) => {
    router.push(`/oracle/slo-v2/${sloId}`);
  };

  const navigateToCreate = () => {
    router.push('/oracle/slo-v2/new');
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">SLO / Error Budget</h1>
          <p className="text-muted-foreground text-sm">监控和管理服务等级目标</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button onClick={navigateToCreate}>
            <Plus className="mr-2 h-4 w-4" />
            创建 SLO
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <StatCard title="总 SLO" value={summary.total} icon={<Target className="h-5 w-5" />} />
          <StatCard
            title="合规"
            value={summary.compliant}
            icon={<CheckCircle className="h-5 w-5 text-green-500" />}
            variant="success"
          />
          <StatCard
            title="风险"
            value={summary.atRisk}
            icon={<AlertTriangle className="h-5 w-5 text-yellow-500" />}
            variant="warning"
          />
          <StatCard
            title="违约"
            value={summary.breached}
            icon={<XCircle className="h-5 w-5 text-red-500" />}
            variant="danger"
          />
        </div>
      )}

      {/* Filters */}
      <Tabs
        value={filter}
        onValueChange={(v) => setFilter(v as 'all' | 'compliant' | 'at_risk' | 'breached')}
      >
        <TabsList>
          <TabsTrigger value="all">全部</TabsTrigger>
          <TabsTrigger value="compliant">合规</TabsTrigger>
          <TabsTrigger value="at_risk">风险</TabsTrigger>
          <TabsTrigger value="breached">违约</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* SLO List */}
      <div className="space-y-4">
        {filteredReports.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="text-muted-foreground mx-auto h-12 w-12" />
              <h3 className="mt-4 text-lg font-medium">暂无 SLO</h3>
              <p className="text-muted-foreground mt-2">创建第一个 SLO 开始监控服务质量</p>
              <Button className="mt-4" onClick={navigateToCreate}>
                <Plus className="mr-2 h-4 w-4" />
                创建 SLO
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredReports.map((report) => (
            <SloCard
              key={report.sloId}
              report={report}
              onClick={() => navigateToDetail(report.sloId)}
            />
          ))
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  variant = 'default',
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
}) {
  const variantStyles = {
    default: 'bg-muted',
    success: 'bg-green-50 dark:bg-green-900/20',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20',
    danger: 'bg-red-50 dark:bg-red-900/20',
  };

  return (
    <Card className={variantStyles[variant]}>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="bg-background rounded-lg p-2">{icon}</div>
        <div>
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SloCard({ report, onClick }: { report: SloReport; onClick: () => void }) {
  const statusConfig = {
    compliant: {
      badge: <Badge className="bg-green-500">合规</Badge>,
      border: 'border-l-green-500',
    },
    at_risk: {
      badge: <Badge variant="secondary">风险</Badge>,
      border: 'border-l-yellow-500',
    },
    breached: {
      badge: <Badge variant="destructive">违约</Badge>,
      border: 'border-l-red-500',
    },
  };

  const trendIcon = {
    improving: <TrendingUp className="h-4 w-4 text-green-500" />,
    stable: <Activity className="h-4 w-4 text-blue-500" />,
    degrading: <TrendingDown className="h-4 w-4 text-red-500" />,
  };

  const { badge, border } = statusConfig[report.status];

  return (
    <Card
      className={`hover:bg-muted cursor-pointer border-l-4 transition-colors ${border}`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{report.name}</h3>
              {badge}
            </div>
            <p className="text-muted-foreground mt-1 text-sm">
              {report.protocol.toUpperCase()} · {report.chain} ·{' '}
              {getMetricTypeLabel(report.metricType)}
            </p>

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
              {/* Compliance Rate */}
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">合规率</span>
                  <span className="font-medium">{report.currentCompliance.toFixed(2)}%</span>
                </div>
                <Progress value={report.currentCompliance} className="mt-1" />
                <p className="text-muted-foreground mt-1 text-xs">目标: {report.targetValue}%</p>
              </div>

              {/* Error Budget */}
              <div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Error Budget</span>
                  <span className="font-medium">
                    {((report.errorBudget.remaining / report.errorBudget.total) * 100).toFixed(1)}%
                  </span>
                </div>
                <Progress
                  value={(report.errorBudget.remaining / report.errorBudget.total) * 100}
                  className="mt-1"
                />
                {report.errorBudget.daysUntilExhaustion && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    预计 {report.errorBudget.daysUntilExhaustion} 天后耗尽
                  </p>
                )}
              </div>

              {/* Burn Rate */}
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-muted-foreground text-sm">消耗速率</p>
                  <p className="font-medium">{report.errorBudget.burnRate.toFixed(1)} 分钟/天</p>
                </div>
                <div className="flex items-center gap-1">
                  {trendIcon[report.trend]}
                  <span className="text-muted-foreground text-xs">
                    {getTrendLabel(report.trend)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <ChevronRight className="text-muted-foreground h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function getMetricTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    latency: '延迟',
    availability: '可用性',
    accuracy: '准确性',
    custom: '自定义',
  };
  return labels[type] || type;
}

function getTrendLabel(trend: string): string {
  const labels: Record<string, string> = {
    improving: '改善',
    stable: '稳定',
    degrading: '恶化',
  };
  return labels[trend] || trend;
}
