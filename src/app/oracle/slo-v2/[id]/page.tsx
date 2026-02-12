/**
 * SLO Detail Page
 *
 * SLO 详情页面 - 展示单个 SLO 的详细信息和历史数据
 */

'use client';

import { useState, useEffect } from 'react';

import { useRouter } from 'next/navigation';
import type { Route } from 'next';

import {
  ArrowLeft,
  RefreshCw,
  Edit,
  Trash2,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  Target,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Calendar,
} from 'lucide-react';







import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { logger } from '@/lib/logger';

interface SloReport {
  sloId: string;
  name: string;
  protocol: string;
  chain: string;
  metricType: string;
  targetValue: number;
  currentCompliance: number;
  status: 'compliant' | 'atRisk' | 'breached';
  evaluationWindow: string;
  errorBudget: {
    total: number;
    used: number;
    remaining: number;
    burnRate: number;
    daysUntilExhaustion?: number;
    status: string;
  };
  recentMetrics: Array<{
    timestamp: string;
    complianceRate: number;
    isCompliant: boolean;
  }>;
  trend: 'improving' | 'stable' | 'degrading';
}

export default function SloDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const [sloId, setSloId] = useState<string>('');
  const [report, setReport] = useState<SloReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    params.then((p) => setSloId(p.id));
  }, [params]);

  const fetchReport = async () => {
    if (!sloId) return;

    try {
      const response = await fetch(`/api/slo/reports/${sloId}`);
      if (response.ok) {
        const data = await response.json();
        setReport(data.data);
      }
    } catch (error) {
      logger.error('Failed to fetch SLO report', { error });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();

    // Auto refresh every 60 seconds
    const interval = setInterval(fetchReport, 60000);
    return () => clearInterval(interval);
  }, [sloId]);

  const refresh = async () => {
    setRefreshing(true);
    await fetchReport();
    setRefreshing(false);
  };

  const deleteSlo = async () => {
    if (!confirm('确定要删除这个 SLO 吗？')) return;

    try {
      const response = await fetch(`/api/slo/definitions/${sloId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push('/oracle/slo-v2');
      }
    } catch (error) {
      logger.error('Failed to delete SLO', { error });
    }
  };

  const goBack = () => {
    router.push('/oracle/slo-v2');
  };

  const goToEdit = () => {
    router.push(`/oracle/slo-v2/${sloId}/edit` as Route);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="border-primary h-12 w-12 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <p className="text-muted-foreground">SLO 不存在或已被删除</p>
          <Button className="mt-4" onClick={goBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回列表
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{report.name}</h1>
            <p className="text-muted-foreground text-sm">
              {report.protocol.toUpperCase()} · {report.chain} ·{' '}
              {getMetricTypeLabel(report.metricType)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button variant="outline" size="sm" onClick={goToEdit}>
            <Edit className="mr-2 h-4 w-4" />
            编辑
          </Button>
          <Button variant="destructive" size="sm" onClick={deleteSlo}>
            <Trash2 className="mr-2 h-4 w-4" />
            删除
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <StatusBanner
        status={report.status}
        compliance={report.currentCompliance}
        target={report.targetValue}
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="当前合规率"
          value={`${report.currentCompliance.toFixed(2)}%`}
          subtitle={`目标: ${report.targetValue}%`}
          icon={<Target className="h-5 w-5" />}
          status={
            report.status === 'compliant'
              ? 'healthy'
              : report.status === 'atRisk'
                ? 'warning'
                : 'critical'
          }
        />
        <StatCard
          title="Error Budget 剩余"
          value={`${((report.errorBudget.remaining / report.errorBudget.total) * 100).toFixed(1)}%`}
          subtitle={
            report.errorBudget.daysUntilExhaustion
              ? `预计 ${report.errorBudget.daysUntilExhaustion} 天后耗尽`
              : '充足'
          }
          icon={<Clock className="h-5 w-5" />}
          status={report.errorBudget.status as 'healthy' | 'warning' | 'critical'}
        />
        <StatCard
          title="消耗速率"
          value={`${report.errorBudget.burnRate.toFixed(1)} 分钟/天`}
          subtitle="Error Budget 消耗速度"
          icon={<Activity className="h-5 w-5" />}
          status={report.errorBudget.burnRate > 60 ? 'warning' : 'healthy'}
        />
        <StatCard
          title="趋势"
          value={getTrendLabel(report.trend)}
          subtitle="最近 7 天变化"
          icon={
            report.trend === 'improving' ? (
              <TrendingUp className="h-5 w-5" />
            ) : report.trend === 'degrading' ? (
              <TrendingDown className="h-5 w-5" />
            ) : (
              <Activity className="h-5 w-5" />
            )
          }
          status={
            report.trend === 'improving'
              ? 'healthy'
              : report.trend === 'degrading'
                ? 'warning'
                : 'healthy'
          }
        />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="metrics">指标详情</TabsTrigger>
          <TabsTrigger value="events">相关事件</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {/* Compliance Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  合规率趋势
                </CardTitle>
                <CardDescription>最近 30 天的合规率变化</CardDescription>
              </CardHeader>
              <CardContent>
                {report.recentMetrics.length > 0 ? (
                  <div className="space-y-2">
                    {report.recentMetrics.slice(0, 10).map((metric, idx) => (
                      <div key={idx} className="flex items-center justify-between">
                        <span className="text-muted-foreground text-sm">
                          {new Date(metric.timestamp).toLocaleDateString('zh-CN')}
                        </span>
                        <div className="mx-4 flex flex-1 items-center gap-2">
                          <Progress value={metric.complianceRate} className="flex-1" />
                          <span className="w-16 text-right text-sm">
                            {metric.complianceRate.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-muted-foreground py-8 text-center">暂无历史数据</div>
                )}
              </CardContent>
            </Card>

            {/* Error Budget */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Error Budget
                </CardTitle>
                <CardDescription>当前周期内的 Error Budget 使用情况</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>剩余</span>
                    <span>
                      {((report.errorBudget.remaining / report.errorBudget.total) * 100).toFixed(1)}
                      %
                    </span>
                  </div>
                  <Progress
                    value={(report.errorBudget.remaining / report.errorBudget.total) * 100}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">总预算</p>
                    <p className="font-medium">{formatDuration(report.errorBudget.total)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">已使用</p>
                    <p className="font-medium">{formatDuration(report.errorBudget.used)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">剩余</p>
                    <p className="font-medium">{formatDuration(report.errorBudget.remaining)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">消耗速率</p>
                    <p className="font-medium">{report.errorBudget.burnRate.toFixed(1)} 分钟/天</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>历史记录</CardTitle>
            </CardHeader>
            <CardContent>
              <table className="w-full">
                <thead className="bg-muted border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">时间</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">合规率</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">状态</th>
                  </tr>
                </thead>
                <tbody>
                  {report.recentMetrics.slice(0, 10).map((metric, idx) => (
                    <tr key={idx} className="hover:bg-muted/50 border-b">
                      <td className="px-4 py-3 text-sm">
                        {new Date(metric.timestamp).toLocaleString('zh-CN')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Progress value={metric.complianceRate} className="w-20" />
                          <span className="text-sm">{metric.complianceRate.toFixed(2)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {metric.isCompliant ? (
                          <Badge variant="default" className="bg-green-500">
                            合规
                          </Badge>
                        ) : (
                          <Badge variant="destructive">不合规</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                相关事件
              </CardTitle>
              <CardDescription>与该 SLO 相关的告警、争议等事件</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground py-8 text-center">事件时间线功能即将推出</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusBanner({
  status,
  compliance,
  target,
}: {
  status: string;
  compliance: number;
  target: number;
}) {
  const config = {
    compliant: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      border: 'border-green-200 dark:border-green-800',
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      title: 'SLO 合规',
      message: `当前合规率为 ${compliance.toFixed(2)}%，达到目标值 ${target}%`,
    },
    atRisk: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      icon: <AlertTriangle className="h-5 w-5 text-yellow-600" />,
      title: 'SLO 风险',
      message: `当前合规率为 ${compliance.toFixed(2)}%，低于目标值 ${target}%`,
    },
    breached: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      icon: <XCircle className="h-5 w-5 text-red-600" />,
      title: 'SLO 违约',
      message: `当前合规率为 ${compliance.toFixed(2)}%，已突破阈值`,
    },
  };

  const { bg, border, icon, title, message } = config[status as keyof typeof config];

  return (
    <div className={`rounded-lg border p-4 ${bg} ${border}`}>
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <h3 className="font-semibold">{title}</h3>
          <p className="text-muted-foreground text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  status,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  status: 'healthy' | 'warning' | 'critical';
}) {
  const statusColors = {
    healthy: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
    warning: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
    critical: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={`rounded-lg p-2 ${statusColors[status]}`}>{icon}</div>
        </div>
        <div className="mt-4">
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-muted-foreground text-xs">{subtitle}</p>
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

function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}分钟`;
  } else if (minutes < 1440) {
    return `${(minutes / 60).toFixed(1)}小时`;
  } else {
    return `${(minutes / 1440).toFixed(1)}天`;
  }
}
