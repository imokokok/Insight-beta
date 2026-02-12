/**
 * SLA Monitoring Dashboard
 *
 * SLA 监控面板 - 服务质量监控仪表板
 */

'use client';

import { useState, useEffect } from 'react';

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

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useI18n } from '@/i18n';
import { logger } from '@/lib/logger';
import {
  StaggerContainer,
  StaggerItem,
  FadeIn,
} from '@/components/common/AnimatedContainer';
import {
  Container,
  DashboardGrid,
  Stack,
  Row,
} from '@/components/common/Layout';
import {
  ResponsiveGrid,
  ResponsivePadding,
  MobileOnly,
  DesktopOnly,
} from '@/components/common/Responsive';

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
  const { t } = useI18n();
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
      logger.error('Failed to fetch SLA data', { error });
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
        <div className="border-primary h-12 w-12 animate-spin rounded-full border-b-2"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('sla:title')}</h1>
          <p className="text-muted-foreground mt-1">{t('sla:subtitle')}</p>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={refreshing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          {t('sla:refresh')}
        </Button>
      </div>

      {/* Global Stats */}
      {stats && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title={t('sla:stats.overallCompliance')}
            value={`${stats.overallCompliance.toFixed(1)}%`}
            subtitle="SLA Compliance"
            icon={<Shield className="h-5 w-5" />}
            status={
              stats.overallCompliance >= 95
                ? 'healthy'
                : stats.overallCompliance >= 80
                  ? 'warning'
                  : 'critical'
            }
          />
          <StatCard
            title={t('sla:stats.compliantProtocols')}
            value={stats.compliantProtocols}
            subtitle={t('sla:stats.totalProtocols', { count: stats.totalProtocols })}
            icon={<CheckCircle className="h-5 w-5" />}
            status="healthy"
          />
          <StatCard
            title={t('sla:stats.atRiskProtocols')}
            value={stats.atRiskProtocols}
            subtitle={t('sla:stats.needsAttention')}
            icon={<AlertTriangle className="h-5 w-5" />}
            status={stats.atRiskProtocols > 0 ? 'warning' : 'healthy'}
          />
          <StatCard
            title={t('sla:stats.breachedProtocols')}
            value={stats.breachedProtocols}
            subtitle={t('sla:stats.slaBreached')}
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
            {t('sla:reports.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.length > 0 ? (
              reports.map((report, index) => <SLAReportCard key={index} report={report} />)
            ) : (
              <div className="py-8 text-center">
                <Server className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
                <p className="text-muted-foreground">{t('sla:reports.noData')}</p>
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
          <div className={`rounded-lg p-2 ${statusColors[status]}`}>{icon}</div>
        </div>
        <div className="mt-4">
          <p className="text-muted-foreground text-sm">{title}</p>
          <p className="text-3xl font-bold">{value}</p>
          <p className="text-muted-foreground text-sm">{subtitle}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function SLAReportCard({ report }: { report: SLAReport }) {
  const { t } = useI18n();
  const statusConfig = {
    compliant: { label: t('sla:status.compliant'), color: 'bg-green-500', badge: 'default' },
    at_risk: { label: t('sla:status.at_risk'), color: 'bg-yellow-500', badge: 'secondary' },
    breached: { label: t('sla:status.breached'), color: 'bg-red-500', badge: 'destructive' },
  };

  const config = statusConfig[report.status];

  return (
    <div className="rounded-lg border p-4">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${config.color}`} />
          <div>
            <p className="font-medium">
              {report.protocol.toUpperCase()} - {report.chain}
            </p>
            <p className="text-muted-foreground text-sm">{t('common:labels.period')}: {report.period}</p>
          </div>
        </div>
        <Badge variant={config.badge as 'default' | 'secondary' | 'destructive' | 'outline'}>
          {config.label}
        </Badge>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricItem
          label={t('sla:metrics.uptime')}
          value={`${report.uptime.toFixed(2)}%`}
          target={t('sla:targets.uptime')}
          icon={<Activity className="h-4 w-4" />}
        />
        <MetricItem
          label={t('sla:metrics.avgLatency')}
          value={`${report.avgLatency.toFixed(0)}ms`}
          target={t('sla:targets.latency')}
          icon={<Clock className="h-4 w-4" />}
        />
        <MetricItem
          label={t('sla:metrics.accuracy')}
          value={`${report.accuracy.toFixed(2)}%`}
          target={t('sla:targets.accuracy')}
          icon={<TrendingUp className="h-4 w-4" />}
        />
        <MetricItem
          label={t('sla:metrics.availability')}
          value={`${report.availability.toFixed(2)}%`}
          target={t('sla:targets.availability')}
          icon={<Server className="h-4 w-4" />}
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span>{t('sla:labels.slaCompliance')}</span>
          <span className="font-medium">{report.slaCompliance.toFixed(1)}%</span>
        </div>
        {/* Custom Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${report.slaCompliance}%` }}
          />
        </div>
      </div>

      <div className="text-muted-foreground mt-4 flex items-center gap-4 text-sm">
        <span>{t('common:labels.totalRequests')}: {report.totalRequests.toLocaleString()}</span>
        <span>{t('common:labels.failedRequests')}: {report.failedRequests.toLocaleString()}</span>
        <span>
          {t('common:labels.successRate')}:{' '}
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
  const { t } = useI18n();
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground flex items-center gap-2">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <p className="text-lg font-medium">{value}</p>
      <p className="text-muted-foreground text-xs">{t('common:labels.target')}: {target}</p>
    </div>
  );
}
