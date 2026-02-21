'use client';

import { useState, useEffect, useMemo } from 'react';

import { Activity, BarChart3, Clock, Layers, RefreshCw, TrendingUp, Zap } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';

import { Badge, StatusBadge } from '@/components/ui';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui';
import { SkeletonList } from '@/components/ui';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui';
import { useI18n } from '@/i18n';
import { cn, formatTime } from '@/shared/utils';

import type { PriceUpdateEvent, UpdateFrequencyStats } from '../types/api3';

interface PriceUpdateMonitorProps {
  events?: PriceUpdateEvent[];
  stats?: UpdateFrequencyStats;
  dapiName?: string;
  chain?: string;
  loading?: boolean;
  className?: string;
}

const mockUpdateEvents: PriceUpdateEvent[] = [
  {
    id: 'evt-001',
    dapiName: 'ETH/USD',
    chain: 'ethereum',
    price: 3456.78,
    timestamp: new Date(Date.now() - 5000).toISOString(),
    updateDelayMs: 1200,
    status: 'normal',
  },
  {
    id: 'evt-002',
    dapiName: 'BTC/USD',
    chain: 'ethereum',
    price: 67234.56,
    timestamp: new Date(Date.now() - 8000).toISOString(),
    updateDelayMs: 980,
    status: 'normal',
  },
  {
    id: 'evt-003',
    dapiName: 'LINK/USD',
    chain: 'polygon',
    price: 14.56,
    timestamp: new Date(Date.now() - 15000).toISOString(),
    updateDelayMs: 2500,
    status: 'warning',
  },
  {
    id: 'evt-004',
    dapiName: 'USDC/USD',
    chain: 'arbitrum',
    price: 1.0,
    timestamp: new Date(Date.now() - 20000).toISOString(),
    updateDelayMs: 800,
    status: 'normal',
  },
  {
    id: 'evt-005',
    dapiName: 'ETH/USD',
    chain: 'polygon',
    price: 3456.72,
    timestamp: new Date(Date.now() - 25000).toISOString(),
    updateDelayMs: 1100,
    status: 'normal',
  },
  {
    id: 'evt-006',
    dapiName: 'BTC/USD',
    chain: 'arbitrum',
    price: 67230.12,
    timestamp: new Date(Date.now() - 30000).toISOString(),
    updateDelayMs: 3500,
    status: 'critical',
  },
  {
    id: 'evt-007',
    dapiName: 'MATIC/USD',
    chain: 'polygon',
    price: 0.89,
    timestamp: new Date(Date.now() - 35000).toISOString(),
    updateDelayMs: 1500,
    status: 'normal',
  },
  {
    id: 'evt-008',
    dapiName: 'AVAX/USD',
    chain: 'avalanche',
    price: 38.45,
    timestamp: new Date(Date.now() - 40000).toISOString(),
    updateDelayMs: 900,
    status: 'normal',
  },
];

const mockFrequencyData = [
  { dapiName: 'ETH/USD', updatesPerMinute: 12, avgDelayMs: 1100 },
  { dapiName: 'BTC/USD', updatesPerMinute: 10, avgDelayMs: 980 },
  { dapiName: 'LINK/USD', updatesPerMinute: 8, avgDelayMs: 1500 },
  { dapiName: 'USDC/USD', updatesPerMinute: 15, avgDelayMs: 850 },
  { dapiName: 'MATIC/USD', updatesPerMinute: 6, avgDelayMs: 1200 },
];

const mockDelayTrend = Array.from({ length: 24 }, (_, i) => ({
  hour: `${i}:00`,
  avgDelayMs: Math.floor(Math.random() * 1000) + 800,
  updateCount: Math.floor(Math.random() * 50) + 20,
}));

export function PriceUpdateMonitor({
  events: externalEvents,
  stats: _externalStats,
  dapiName,
  chain,
  loading: externalLoading,
  className,
}: PriceUpdateMonitorProps) {
  const { t } = useI18n();
  const [internalEvents, setInternalEvents] = useState<PriceUpdateEvent[]>([]);
  const [internalLoading, setInternalLoading] = useState(true);

  const useExternalData = externalEvents !== undefined;

  useEffect(() => {
    if (useExternalData) return;
    const fetchData = async () => {
      setInternalLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 600));
        let filtered = [...mockUpdateEvents];
        if (dapiName) {
          filtered = filtered.filter((e) =>
            e.dapiName.toLowerCase().includes(dapiName.toLowerCase()),
          );
        }
        if (chain) {
          filtered = filtered.filter((e) => e.chain.toLowerCase().includes(chain.toLowerCase()));
        }
        setInternalEvents(filtered);
      } finally {
        setInternalLoading(false);
      }
    };

    fetchData();
  }, [useExternalData, dapiName, chain]);

  const events = useExternalData ? externalEvents : internalEvents;
  const isLoading = useExternalData ? (externalLoading ?? false) : internalLoading;

  const stats = useMemo(() => {
    if (!events || events.length === 0) return null;
    const totalUpdates = events.length;
    const avgDelay = events.reduce((sum, e) => sum + e.updateDelayMs, 0) / events.length;
    const warningCount = events.filter((e) => e.status === 'warning').length;
    const criticalCount = events.filter((e) => e.status === 'critical').length;
    const uniqueDapis = new Set(events.map((e) => e.dapiName)).size;
    const uniqueChains = new Set(events.map((e) => e.chain)).size;

    return {
      totalUpdates,
      avgDelayMs: Math.round(avgDelay),
      warningCount,
      criticalCount,
      uniqueDapis,
      uniqueChains,
    };
  }, [events]);

  const statCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        title: t('api3.priceUpdate.totalUpdates'),
        value: stats.totalUpdates.toString(),
        icon: <Activity className="h-5 w-5" />,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
      },
      {
        title: t('api3.priceUpdate.avgDelay'),
        value: `${stats.avgDelayMs}ms`,
        icon: <Clock className="h-5 w-5" />,
        color: stats.avgDelayMs < 1500 ? 'text-green-500' : 'text-amber-500',
        bgColor: stats.avgDelayMs < 1500 ? 'bg-green-500/10' : 'bg-amber-500/10',
      },
      {
        title: t('api3.priceUpdate.uniqueDapis'),
        value: stats.uniqueDapis.toString(),
        icon: <BarChart3 className="h-5 w-5" />,
        color: 'text-purple-500',
        bgColor: 'bg-purple-500/10',
      },
      {
        title: t('api3.priceUpdate.uniqueChains'),
        value: stats.uniqueChains.toString(),
        icon: <Layers className="h-5 w-5" />,
        color: 'text-orange-500',
        bgColor: 'bg-orange-500/10',
      },
    ];
  }, [stats, t]);

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

  if (!events || events.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="py-12 text-center text-muted-foreground">
          <RefreshCw className="mx-auto h-12 w-12 opacity-50" />
          <p className="mt-2">{t('common.noData')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
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
            <CardTitle className="flex items-center gap-2 text-base">
              <Zap className="h-4 w-4 text-amber-500" />
              {t('api3.priceUpdate.frequencyByDapi')}
            </CardTitle>
            <CardDescription>{t('api3.priceUpdate.frequencyDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mockFrequencyData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="dapiName" type="category" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="updatesPerMinute" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-green-500" />
              {t('api3.priceUpdate.delayTrend')}
            </CardTitle>
            <CardDescription>{t('api3.priceUpdate.delayTrendDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mockDelayTrend}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgDelayMs"
                    stroke="#22c55e"
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('api3.priceUpdate.eventList')}</CardTitle>
          <CardDescription>{t('api3.priceUpdate.eventListDesc')}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('api3.priceUpdate.dapiName')}</TableHead>
                  <TableHead>{t('api3.priceUpdate.chain')}</TableHead>
                  <TableHead>{t('api3.priceUpdate.price')}</TableHead>
                  <TableHead>{t('api3.priceUpdate.delay')}</TableHead>
                  <TableHead>{t('api3.priceUpdate.status')}</TableHead>
                  <TableHead>{t('api3.priceUpdate.timestamp')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id} className="group cursor-pointer hover:bg-muted/50">
                    <TableCell className="font-medium">{event.dapiName}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {event.chain}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">
                      {event.price.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          'font-mono text-sm',
                          event.updateDelayMs < 1500 && 'text-green-600',
                          event.updateDelayMs >= 1500 &&
                            event.updateDelayMs < 3000 &&
                            'text-amber-600',
                          event.updateDelayMs >= 3000 && 'text-red-600',
                        )}
                      >
                        {event.updateDelayMs}ms
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={
                          event.status === 'normal'
                            ? 'active'
                            : event.status === 'warning'
                              ? 'warning'
                              : 'critical'
                        }
                        text={t(`api3.priceUpdate.status_${event.status}`)}
                        size="sm"
                      />
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatTime(event.timestamp)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
