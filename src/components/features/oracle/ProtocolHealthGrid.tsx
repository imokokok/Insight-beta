'use client';

import { useEffect, useState } from 'react';
import { cn, fetchApiData } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  Shield,
  Zap,
} from 'lucide-react';

import { PROTOCOL_DISPLAY_NAMES, ORACLE_PROTOCOLS } from '@/lib/types/oracle/protocol';
import type { ProtocolPerformanceRanking } from '@/lib/types/oracle/price';

interface ProtocolHealthGridProps {
  className?: string;
}

type HealthStatus = 'excellent' | 'good' | 'degraded' | 'critical';

interface ProtocolHealth extends ProtocolPerformanceRanking {
  status: HealthStatus;
  lastUpdated: string;
}

export function ProtocolHealthGrid({ className }: ProtocolHealthGridProps) {
  const [healthData, setHealthData] = useState<ProtocolHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHealth = async () => {
      try {
        setLoading(true);
        const data = await fetchApiData<ProtocolPerformanceRanking[]>('/api/oracle/health/ranking');
        const healthWithStatus = data.map((item) => ({
          ...item,
          status: calculateHealthStatus(item.score),
          lastUpdated: new Date().toISOString(),
        }));
        setHealthData(healthWithStatus);
      } catch {
        // 使用模拟数据
        setHealthData(generateMockHealthData());
      } finally {
        setLoading(false);
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <ProtocolHealthGridSkeleton className={className} />;
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Protocol Health</CardTitle>
          <div className="flex gap-2">
            <StatusLegend
              status="excellent"
              count={healthData.filter((h) => h.status === 'excellent').length}
            />
            <StatusLegend
              status="good"
              count={healthData.filter((h) => h.status === 'good').length}
            />
            <StatusLegend
              status="degraded"
              count={healthData.filter((h) => h.status === 'degraded').length}
            />
            <StatusLegend
              status="critical"
              count={healthData.filter((h) => h.status === 'critical').length}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3">
          {healthData.map((protocol) => (
            <ProtocolHealthCard key={protocol.protocol} data={protocol} />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ProtocolHealthCard({ data }: { data: ProtocolHealth }) {
  const statusConfig = {
    excellent: {
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: CheckCircle2,
      label: 'Excellent',
    },
    good: {
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      icon: CheckCircle2,
      label: 'Good',
    },
    degraded: {
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      icon: AlertTriangle,
      label: 'Degraded',
    },
    critical: {
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: XCircle,
      label: 'Critical',
    },
  };

  const config = statusConfig[data.status];
  const Icon = config.icon;

  const TrendIcon = data.trend === 'up' ? TrendingUp : data.trend === 'down' ? TrendingDown : Minus;
  const trendColor =
    data.trend === 'up'
      ? 'text-green-600'
      : data.trend === 'down'
        ? 'text-red-600'
        : 'text-gray-500';

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 p-4 transition-all duration-200',
        'hover:shadow-md',
        config.bgColor,
        config.borderColor,
      )}
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('rounded-lg p-2', config.bgColor.replace('50', '100'))}>
            <Icon className={cn('h-5 w-5', config.color)} />
          </div>
          <div>
            <h4 className="font-semibold">{PROTOCOL_DISPLAY_NAMES[data.protocol]}</h4>
            <Badge variant="secondary" className="text-xs">
              {config.label}
            </Badge>
          </div>
        </div>
        <div className={cn('flex items-center gap-1 text-xs', trendColor)}>
          <TrendIcon className="h-3 w-3" />
          {Math.abs(data.trendPercent).toFixed(1)}%
        </div>
      </div>

      <div className="mb-3">
        <div className="mb-1 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Health Score</span>
          <span className={cn('font-bold', config.color)}>{data.score}/100</span>
        </div>
        <Progress value={data.score} className="h-2" />
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <MetricItem
          icon={<Activity className="h-3 w-3" />}
          label="Accuracy"
          value={`${data.accuracy.toFixed(1)}%`}
        />
        <MetricItem
          icon={<Shield className="h-3 w-3" />}
          label="Uptime"
          value={`${data.uptime.toFixed(1)}%`}
        />
        <MetricItem
          icon={<Zap className="h-3 w-3" />}
          label="Latency"
          value={`${data.latency.toFixed(0)}ms`}
        />
        <MetricItem
          icon={<Clock className="h-3 w-3" />}
          label="Feeds"
          value={data.totalFeeds.toString()}
        />
      </div>
    </div>
  );
}

function MetricItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-white/50 p-2">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <div className="text-muted-foreground text-[10px] uppercase">{label}</div>
        <div className="font-medium">{value}</div>
      </div>
    </div>
  );
}

function StatusLegend({ status, count }: { status: HealthStatus; count: number }) {
  const colors = {
    excellent: 'bg-green-100 text-green-700',
    good: 'bg-blue-100 text-blue-700',
    degraded: 'bg-yellow-100 text-yellow-700',
    critical: 'bg-red-100 text-red-700',
  };

  return (
    <Badge variant="secondary" className={cn('text-xs', colors[status])}>
      {status.charAt(0).toUpperCase() + status.slice(1)}: {count}
    </Badge>
  );
}

function calculateHealthStatus(score: number): HealthStatus {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'degraded';
  return 'critical';
}

function ProtocolHealthGridSkeleton({ className }: { className?: string }) {
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-2">
        <Skeleton className="h-6 w-32" />
      </CardHeader>
      <CardContent className="p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border-2 border-gray-100 p-4">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div>
                    <Skeleton className="mb-1 h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
              <Skeleton className="mb-3 h-2 w-full" />
              <div className="grid grid-cols-2 gap-2">
                {[...Array(4)].map((_, j) => (
                  <Skeleton key={j} className="h-10 rounded-lg" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// 模拟数据生成器
function generateMockHealthData(): ProtocolHealth[] {
  return ORACLE_PROTOCOLS.map((protocol) => {
    const score = Math.floor(Math.random() * 40) + 60;
    const trend = Math.random() > 0.6 ? 'up' : Math.random() > 0.3 ? 'stable' : 'down';

    return {
      protocol,
      rank: 0,
      score,
      accuracy: 95 + Math.random() * 5,
      uptime: 99 + Math.random(),
      latency: Math.random() * 1000 + 100,
      coverage: Math.random() * 100,
      costEfficiency: Math.random() * 100,
      totalFeeds: Math.floor(Math.random() * 200) + 50,
      supportedChains: Math.floor(Math.random() * 10) + 1,
      avgUpdateFrequency: Math.random() * 300 + 60,
      trend: trend as 'up' | 'stable' | 'down',
      trendPercent: Math.random() * 10,
      status: calculateHealthStatus(score),
      lastUpdated: new Date().toISOString(),
    };
  }).sort((a, b) => b.score - a.score);
}
