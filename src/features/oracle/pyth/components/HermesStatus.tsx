'use client';

import { useState, useEffect, useMemo } from 'react';

import {
  Activity,
  AlertCircle,
  CheckCircle2,
  Clock,
  ExternalLink,
  Globe,
  RefreshCw,
  Server,
  Zap,
} from 'lucide-react';

import { EmptyDeviationState } from '@/components/common/EmptyState';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SkeletonList } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';
import { cn, fetchApiData } from '@/shared/utils';

import type { HermesService, PythHermesResponse } from '../types/pyth';

interface HermesStatusProps {
  className?: string;
}

const mockHermesServices: HermesService[] = [
  {
    name: 'Hermes Mainnet',
    url: 'https://hermes.pyth.network',
    status: 'healthy',
    responseTime: 45,
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'bsc'],
    uptime: 99.98,
  },
  {
    name: 'Hermes Backup 1',
    url: 'https://hermes-backup1.pyth.network',
    status: 'healthy',
    responseTime: 62,
    supportedChains: ['ethereum', 'polygon', 'arbitrum', 'optimism'],
    uptime: 99.95,
  },
  {
    name: 'Hermes Backup 2',
    url: 'https://hermes-backup2.pyth.network',
    status: 'degraded',
    responseTime: 180,
    supportedChains: ['ethereum', 'polygon'],
    uptime: 98.5,
  },
  {
    name: 'Hermes Testnet',
    url: 'https://hermes-testnet.pyth.network',
    status: 'healthy',
    responseTime: 85,
    supportedChains: ['ethereum-goerli', 'polygon-mumbai', 'arbitrum-goerli'],
    uptime: 99.2,
  },
];

export function HermesStatus({ className }: HermesStatusProps) {
  const { t } = useI18n();
  const [services, setServices] = useState<HermesService[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHermesStatus = async () => {
      setIsLoading(true);
      try {
        const response = await fetchApiData<PythHermesResponse>('/api/oracle/pyth/hermes');
        setServices(response.services);
      } catch {
        setServices(mockHermesServices);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHermesStatus();
  }, []);

  const stats = useMemo(() => {
    const healthyCount = services.filter((s) => s.status === 'healthy').length;
    const degradedCount = services.filter((s) => s.status === 'degraded').length;
    const downCount = services.filter((s) => s.status === 'down').length;
    const avgResponseTime =
      services.length > 0
        ? services.reduce((sum, s) => sum + s.responseTime, 0) / services.length
        : 0;
    const totalChains = new Set(services.flatMap((s) => s.supportedChains)).size;
    return { healthyCount, degradedCount, downCount, avgResponseTime, totalChains };
  }, [services]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const response = await fetchApiData<PythHermesResponse>('/api/oracle/pyth/hermes');
      setServices(response.services);
    } catch {
      setServices(mockHermesServices);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: HermesService['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case 'degraded':
        return <AlertCircle className="h-4 w-4 text-amber-500" />;
      case 'down':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusBadge = (status: HermesService['status']) => {
    const configs = {
      healthy: { status: 'online' as const, label: t('pyth.hermes.healthy') },
      degraded: { status: 'warning' as const, label: t('pyth.hermes.degraded') },
      down: { status: 'offline' as const, label: t('pyth.hermes.down') },
    };
    return configs[status];
  };

  const getResponseTimeColor = (ms: number) => {
    if (ms < 100) return 'text-emerald-500';
    if (ms < 200) return 'text-amber-500';
    return 'text-red-500';
  };

  const getUptimeColor = (percentage: number) => {
    if (percentage >= 99.9) return 'text-emerald-500';
    if (percentage >= 99) return 'text-amber-500';
    return 'text-red-500';
  };

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-amber-500" />
            {t('pyth.hermes.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <SkeletonList count={4} />
        </CardContent>
      </Card>
    );
  }

  if (services.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <EmptyDeviationState onRefresh={handleRefresh} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5 text-amber-500" />
            {t('pyth.hermes.title')}
            <Badge variant="secondary" className="ml-2">
              {services.length}
            </Badge>
          </CardTitle>
          <Button variant="outline" size="icon" onClick={handleRefresh}>
            <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-lg bg-emerald-500/10 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3" />
              {t('pyth.hermes.healthy')}
            </div>
            <p className="mt-1 text-lg font-bold text-emerald-500">{stats.healthyCount}</p>
          </div>

          <div className="rounded-lg bg-amber-500/10 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              {t('pyth.hermes.degraded')}
            </div>
            <p className="mt-1 text-lg font-bold text-amber-500">{stats.degradedCount}</p>
          </div>

          <div className="rounded-lg bg-red-500/10 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3 w-3" />
              {t('pyth.hermes.down')}
            </div>
            <p className="mt-1 text-lg font-bold text-red-500">{stats.downCount}</p>
          </div>

          <div className="rounded-lg bg-amber-500/10 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" />
              {t('pyth.hermes.avgResponse')}
            </div>
            <p
              className={cn('mt-1 text-lg font-bold', getResponseTimeColor(stats.avgResponseTime))}
            >
              {stats.avgResponseTime.toFixed(0)}ms
            </p>
          </div>

          <div className="rounded-lg bg-amber-500/10 p-3">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Globe className="h-3 w-3" />
              {t('pyth.hermes.totalChains')}
            </div>
            <p className="mt-1 text-lg font-bold text-amber-500">{stats.totalChains}</p>
          </div>
        </div>

        <div className="grid gap-3">
          {services.map((service) => (
            <div
              key={service.name}
              className={cn(
                'rounded-lg border p-4 transition-all hover:border-amber-500/30',
                service.status === 'down' && 'border-red-500/30 bg-red-500/5',
                service.status === 'degraded' && 'border-amber-500/30 bg-amber-500/5',
              )}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(service.status)}
                  <div>
                    <h4 className="font-semibold">{service.name}</h4>
                    <a
                      href={service.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-amber-500"
                    >
                      {service.url}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
                <StatusBadge
                  status={getStatusBadge(service.status).status}
                  text={getStatusBadge(service.status).label}
                  size="sm"
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('pyth.hermes.responseTime')}</p>
                    <p
                      className={cn(
                        'text-sm font-medium',
                        getResponseTimeColor(service.responseTime),
                      )}
                    >
                      {service.responseTime}ms
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">{t('pyth.hermes.uptime')}</p>
                    <p className={cn('text-sm font-medium', getUptimeColor(service.uptime))}>
                      {formatUptime(service.uptime)}
                    </p>
                  </div>
                </div>

                <div className="col-span-2 flex items-start gap-2">
                  <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">
                      {t('pyth.hermes.supportedChains')}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {service.supportedChains.slice(0, 4).map((chain) => (
                        <Badge key={chain} variant="secondary" className="text-[10px]">
                          {chain}
                        </Badge>
                      ))}
                      {service.supportedChains.length > 4 && (
                        <Badge variant="outline" className="text-[10px]">
                          +{service.supportedChains.length - 4}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
