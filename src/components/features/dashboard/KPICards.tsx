'use client';

import type { ReactNode } from 'react';

import { TrendingUp, TrendingDown, Minus, Activity, DollarSign, Users, Shield, Zap } from 'lucide-react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export interface KPIData {
  id: string;
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  changeLabel?: string;
  icon?: ReactNode;
  color?: 'blue' | 'green' | 'amber' | 'purple' | 'rose';
  trend?: 'up' | 'down' | 'neutral';
}

interface KPICardProps {
  data: KPIData;
  loading?: boolean;
  className?: string;
}

export function KPICard({ data, loading, className }: KPICardProps) {
  const iconBgClasses = {
    blue: 'bg-blue-100 text-blue-600',
    green: 'bg-emerald-100 text-emerald-600',
    amber: 'bg-amber-100 text-amber-600',
    purple: 'bg-purple-100 text-purple-600',
    rose: 'bg-rose-100 text-rose-600',
  };

  const TrendIcon = data.trend === 'up' ? TrendingUp : data.trend === 'down' ? TrendingDown : Minus;
  const trendColor = data.trend === 'up' ? 'text-emerald-600' : data.trend === 'down' ? 'text-rose-600' : 'text-muted-foreground';

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden transition-all hover:shadow-md', className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <p className="text-muted-foreground text-sm">{data.title}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold tracking-tight">{data.value}</span>
              {data.unit && <span className="text-muted-foreground text-sm">{data.unit}</span>}
            </div>
            {data.change !== undefined && (
              <div className={cn('flex items-center gap-1 text-sm', trendColor)}>
                <TrendIcon className="h-4 w-4" />
                <span>{data.change > 0 ? '+' : ''}{data.change}%</span>
                {data.changeLabel && <span className="text-muted-foreground">{data.changeLabel}</span>}
              </div>
            )}
          </div>
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', iconBgClasses[data.color || 'blue'])}>
            {data.icon || <Activity className="h-6 w-6" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface KPICardsRowProps {
  kpis: KPIData[];
  loading?: boolean;
  className?: string;
}

export function KPICardsRow({ kpis, loading, className }: KPICardsRowProps) {
  return (
    <div className={cn('grid gap-4 grid-cols-2 lg:grid-cols-4', className)}>
      {kpis.map((kpi) => (
        <KPICard key={kpi.id} data={kpi} loading={loading} />
      ))}
    </div>
  );
}

// Pre-defined KPI configurations for common use cases
export const defaultKPIs = {
  tvl: (value: number, change?: number): KPIData => ({
    id: 'tvl',
    title: 'Total Value Locked',
    value: `$${(value / 1e9).toFixed(2)}B`,
    change,
    icon: <DollarSign className="h-6 w-6" />,
    color: 'green',
    trend: change && change > 0 ? 'up' : change && change < 0 ? 'down' : 'neutral',
  }),
  activeProtocols: (value: number, change?: number): KPIData => ({
    id: 'activeProtocols',
    title: 'Active Protocols',
    value: value.toString(),
    change,
    icon: <Shield className="h-6 w-6" />,
    color: 'blue',
    trend: change && change > 0 ? 'up' : change && change < 0 ? 'down' : 'neutral',
  }),
  dailyUpdates: (value: number, change?: number): KPIData => ({
    id: 'dailyUpdates',
    title: 'Daily Updates',
    value: value.toLocaleString(),
    unit: 'txns',
    change,
    icon: <Zap className="h-6 w-6" />,
    color: 'purple',
    trend: change && change > 0 ? 'up' : change && change < 0 ? 'down' : 'neutral',
  }),
  activeUsers: (value: number, change?: number): KPIData => ({
    id: 'activeUsers',
    title: 'Active Users',
    value: value.toLocaleString(),
    change,
    icon: <Users className="h-6 w-6" />,
    color: 'amber',
    trend: change && change > 0 ? 'up' : change && change < 0 ? 'down' : 'neutral',
  }),
};
