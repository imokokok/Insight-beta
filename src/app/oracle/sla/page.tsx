/**
 * SLA Monitoring Dashboard
 *
 * SLA 监控面板 - 服务质量监控仪表板
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  BarChart3,
  Shield,
  Server,
} from 'lucide-react';

interface SLAStats {
  overallCompliance: number;
  totalProtocols: number;
  compliantProtocols: number;
  atRiskProtocols: number;
  breachedProtocols: number;
}

interface SLAReport {
  protocol: string;
  chain: string;
  period: string;
  uptime: number;
  avgLatency: number;
  maxLatency: number;
  accuracy: number;
  availability: number;
  totalRequests: number;
  failedRequests: number;
  slaCompliance: number;
  status: 'compliant' | 'at_risk' | 'breached';
}

export default function SLADashboardPage() {
  const [stats, setStats] = useState<SLAStats | null>(null);
  const [reports, setReports] = useState<SLAReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [statsRes, reportsRes] = await Promise.all([
        fetch('/api/oracle/sla/stats'),
        fetch('/api/oracle/sla/reports'),
      ]);

      if (statsRes.ok) {
        setStats(await statsRes.json());
      }
      if (reportsRes.ok) {
        setReports(await reportsRes.json());
      }
    } catch (error) {
      console.error('Failed to fetch SLA data:', error);
    }
  };

  useEffect(() => {
    fetchData().then(() => setLoading(false));

    // Auto refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">SLA 监控面板</h1>
          <p className="text-muted-foreground mt-1">
            Service Level Agreement Monitoring
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          刷新
        </Button>
      </div>

      {/* Global Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="整体合规率"
            value={`${stats.overallCompliance.toFixed(1)}%`}
            subtitle="SLA Compliance"
            icon={<Shield className="h-5 w-5" />}
            status={stats.overallCompliance >= 95 ? 'healthy' : stats.overallCompliance >= 80 ? 'warning' : 'critical'}
          />
          <StatCard
            title="合规协议"
            value={stats.compliantProtocols}
            subtitle={`共 ${stats.totalProtocols} 个协议`}
            icon={<CheckCircle className="h-5 w-5" />}
            status="healthy"
          />
          <StatCard
            title="风险协议"
            value={stats.atRiskProtocols}
            subtitle="需要关注"
            icon={<AlertTriangle className="h-5 w-5" />}
            status={stats.atRiskProtocols > 0 ? 'warning' : 'healthy'}
          />
          <StatCard
            title="违约协议"
            value={stats.breachedProtocols}
            subtitle="SLA 已违约"
            icon={<XCircle className="h-5 w-5" />}
            status={stats.breachedProtocols > 0 ? 'critical' : 'healthy'}
          />
        </div>
      )}

      {/* Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            协议 SLA 报告
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.length > 0 ? (
              reports.map((report, index) => (
                <SLAReportCard key={index} report={report} />
              ))
            ) : (
              <div className="py-8 text-center">
                <Server className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">暂无 SLA 数据</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
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
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  status: 'healthy' | 'warning' | 'critical';
}) {
  const statusColors = {
    healthy: 'bg-green-100 text-green-600',
    warning: 'bg-yellow-100 text-yellow-600',
    critical: 'bg-red-100 text-red-600',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={`rounded-lg p-2 ${statusColors[status]}`}>
            {icon}
          </div>
        </div>
        <div className="mt-4">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SLAReportCard({ report }: { report: SLAReport }) {
  const statusConfig = {
    compliant: { label: '合规', color: 'bg-green-500', badge: 'default' },
    at_risk: { label: '风险', color: 'bg-yellow-500', badge: 'secondary' },
    breached: { label: '违约', color: 'bg-red-500', badge: 'destructive' },
  };

  const config = statusConfig[report.status];

  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${config.color}`} />
          <div>
            <p className="font-medium">
              {report.protocol.toUpperCase()} - {report.chain}
            </p>
            <p className="text-sm text-muted-foreground">周期: {report.period}</p>
          </div>
        </div>
        <Badge variant={config.badge as any}>{config.label}</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <MetricItem
          label="正常运行时间"
          value={`${report.uptime.toFixed(2)}%`}
          target="99.9%"
          icon={<Activity className="h-4 w-4" />}
        />
        <MetricItem
          label="平均延迟"
          value={`${report.avgLatency.toFixed(0)}ms`}
          target="<500ms"
          icon={<Clock className="h-4 w-4" />}
        />
        <MetricItem
          label="准确性"
          value={`${report.accuracy.toFixed(2)}%`}
          target="99.5%"
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricItem
          label="可用性"
          value={`${report.availability.toFixed(2)}%`}
          target="99.9%"
          icon={<Server className="h-4 w-4" />}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>SLA 合规性</span>
          <span className="font-medium">{report.slaCompliance.toFixed(1)}%</span>
        </div>
        <Progress value={report.slaCompliance} className="h-2" />
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
        <span>总请求: {report.totalRequests.toLocaleString()}</span>
        <span>失败: {report.failedRequests.toLocaleString()}</span>
        <span>
          成功率:{' '}
          {report.totalRequests > 0
            ? ((1 - report.failedRequests / report.totalRequests) * 100).toFixed(2)
            : 100}
          %
        </span>
      </div>
    </div>
  );
}

function MetricItem({
  label,
  value,
  target,
  icon,
}: {
  label: string;
  value: string;
  target: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-lg font-medium">{value}</p>
      <p className="text-xs text-muted-foreground">目标: {target}</p>
    </div>
  );
}
