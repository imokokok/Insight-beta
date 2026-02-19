'use client';

import { useState, useEffect, useMemo } from 'react';

import { BarChart3, DollarSign, Layers, TrendingUp } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { SkeletonList } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';
import { cn } from '@/shared/utils';

import type { OevOverviewData, OevEvent } from '../types/api3';

interface OevOverviewProps {
  overview?: OevOverviewData;
  events?: OevEvent[];
  dapiName?: string;
  chain?: string;
  loading?: boolean;
  className?: string;
}

const mockOevData: OevOverviewData = {
  totalOev: 1250000.5,
  totalEvents: 1547,
  avgOevPerEvent: 808.4,
  affectedDapis: 12,
  eventsCount: 1547,
  topDapis: [
    { dapiName: 'ETH/USD', oevValue: 450000, percentage: 36 },
    { dapiName: 'BTC/USD', oevValue: 320000, percentage: 25.6 },
    { dapiName: 'LINK/USD', oevValue: 180000, percentage: 14.4 },
    { dapiName: 'USDC/USD', oevValue: 150000, percentage: 12 },
    { dapiName: 'Others', oevValue: 150000.5, percentage: 12 },
  ],
  chainDistribution: [
    { chain: 'Ethereum', oevValue: 550000, percentage: 44 },
    { chain: 'Polygon', oevValue: 350000, percentage: 28 },
    { chain: 'Arbitrum', oevValue: 200000, percentage: 16 },
    { chain: 'Others', oevValue: 150000.5, percentage: 12 },
  ],
  trend: Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    }),
    oevValue: Math.floor(Math.random() * 50000) + 30000,
  })),
};

const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#22c55e'];

export function OevOverview({
  overview: externalOverview,
  dapiName,
  chain,
  loading: externalLoading,
  className,
}: OevOverviewProps) {
  const { t } = useI18n();
  const [internalData, setInternalData] = useState<OevOverviewData | null>(null);
  const [internalLoading, setInternalLoading] = useState(true);

  const useExternalData = externalOverview !== undefined;

  useEffect(() => {
    if (useExternalData) return;
    const fetchData = async () => {
      setInternalLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 600));
        let filtered = { ...mockOevData };
        if (dapiName) {
          filtered.topDapis = filtered.topDapis.filter((d) =>
            d.dapiName.toLowerCase().includes(dapiName.toLowerCase()),
          );
        }
        if (chain) {
          filtered.chainDistribution = filtered.chainDistribution.filter((c) =>
            c.chain.toLowerCase().includes(chain.toLowerCase()),
          );
        }
        setInternalData(filtered);
      } finally {
        setInternalLoading(false);
      }
    };

    fetchData();
  }, [useExternalData, dapiName, chain]);

  const data = useExternalData ? externalOverview : internalData;
  const isLoading = useExternalData ? (externalLoading ?? false) : internalLoading;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(1)}K`;
    return `$${value.toFixed(2)}`;
  };

  const stats = useMemo(() => {
    if (!data) return [];
    return [
      {
        title: t('api3.oev.totalOev'),
        value: formatCurrency(data.totalOev),
        icon: <DollarSign className="h-5 w-5" />,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
      },
      {
        title: t('api3.oev.eventsCount'),
        value: data.eventsCount.toLocaleString(),
        icon: <BarChart3 className="h-5 w-5" />,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
      },
      {
        title: t('api3.oev.topDapi'),
        value: data.topDapis[0]?.dapiName || 'N/A',
        icon: <TrendingUp className="h-5 w-5" />,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
      },
      {
        title: t('api3.oev.topChain'),
        value: data.chainDistribution[0]?.chain || 'N/A',
        icon: <Layers className="h-5 w-5" />,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
      },
    ];
  }, [data, t]);

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-16 animate-pulse rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
        <SkeletonList count={2} />
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="transition-all hover:shadow-md">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className={cn('text-2xl font-bold', stat.color)}>{stat.value}</p>
                </div>
                <div className={cn('rounded-lg p-2.5', stat.bgColor)}>
                  <div className={stat.color}>{stat.icon}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('api3.oev.distributionByDapi')}</CardTitle>
            <CardDescription>{t('api3.oev.distributionDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.topDapis}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="oevValue"
                    nameKey="dapiName"
                  >
                    {data.topDapis.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value) || 0)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {data.topDapis.slice(0, 5).map((item, index) => (
                <div key={item.dapiName} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="font-medium">{item.dapiName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-muted-foreground">
                      {formatCurrency(item.oevValue)}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      {item.percentage}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('api3.oev.distributionByChain')}</CardTitle>
            <CardDescription>{t('api3.oev.chainDistributionDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.chainDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="chain" type="category" tick={{ fontSize: 12 }} width={80} />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value) || 0)}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="oevValue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('api3.oev.trend')}</CardTitle>
          <CardDescription>{t('api3.oev.trendDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.trend}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v / 1000}K`} />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value) || 0)}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="oevValue"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
