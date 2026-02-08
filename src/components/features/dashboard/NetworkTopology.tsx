'use client';

import { useMemo } from 'react';
import { Network, Server, Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

export interface NetworkNode {
  id: string;
  name: string;
  type: 'oracle' | 'aggregator' | 'data-source';
  status: 'online' | 'offline' | 'degraded';
  latency: number;
  region: string;
  connectedTo: string[];
}

interface NetworkTopologyProps {
  nodes: NetworkNode[];
  loading?: boolean;
  className?: string;
}

export function NetworkTopology({ nodes, loading, className }: NetworkTopologyProps) {
  const { t } = useI18n();

  const stats = useMemo(() => {
    const total = nodes.length;
    const online = nodes.filter(n => n.status === 'online').length;
    const offline = nodes.filter(n => n.status === 'offline').length;
    const degraded = nodes.filter(n => n.status === 'degraded').length;
    const avgLatency = nodes.length > 0
      ? nodes.reduce((sum, n) => sum + n.latency, 0) / nodes.length
      : 0;
    return { total, online, offline, degraded, avgLatency };
  }, [nodes]);

  const getStatusColor = (status: NetworkNode['status']) => {
    switch (status) {
      case 'online': return 'bg-emerald-500';
      case 'degraded': return 'bg-amber-500';
      case 'offline': return 'bg-rose-500';
    }
  };

  const getStatusIcon = (status: NetworkNode['status']) => {
    switch (status) {
      case 'online': return Wifi;
      case 'degraded': return AlertCircle;
      case 'offline': return WifiOff;
    }
  };

  // Group nodes by type
  const groupedNodes = useMemo(() => {
    const groups: Record<string, NetworkNode[]> = {
      'data-source': [],
      'aggregator': [],
      'oracle': [],
    };
    nodes.forEach(node => {
      if (groups[node.type]) {
        groups[node.type].push(node);
      }
    });
    return groups;
  }, [nodes]);

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Network className="h-5 w-5" />
            {t('dashboard:topology.title')}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700">
              {stats.online} {t('dashboard:topology.online')}
            </Badge>
            <Badge variant="outline" className="bg-amber-50 text-amber-700">
              {stats.degraded} {t('dashboard:topology.degraded')}
            </Badge>
            <Badge variant="outline" className="bg-rose-50 text-rose-700">
              {stats.offline} {t('dashboard:topology.offline')}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <TooltipProvider>
          <div className="relative h-[300px] overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-900 p-4">
            {/* Layer Labels */}
            <div className="absolute left-4 top-4 text-xs font-medium text-muted-foreground">
              {t('dashboard:topology.dataSources')}
            </div>
            <div className="absolute left-1/2 top-4 -translate-x-1/2 text-xs font-medium text-muted-foreground">
              {t('dashboard:topology.aggregators')}
            </div>
            <div className="absolute right-4 top-4 text-xs font-medium text-muted-foreground">
              {t('dashboard:topology.oracles')}
            </div>

            {/* Nodes Grid */}
            <div className="mt-8 grid grid-cols-3 gap-8 h-[200px]">
              {/* Data Sources Column */}
              <div className="flex flex-col items-center justify-center gap-3">
                {groupedNodes['data-source'].map((node, index) => {
                  const StatusIcon = getStatusIcon(node.status);
                  return (
                    <Tooltip key={node.id}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'relative flex items-center gap-2 rounded-lg border bg-white p-3 shadow-sm cursor-pointer transition-all hover:shadow-md',
                            node.status === 'offline' && 'opacity-50'
                          )}
                          style={{ marginTop: index > 0 ? '-8px' : 0 }}
                        >
                          <div className={cn('h-2 w-2 rounded-full', getStatusColor(node.status))} />
                          <Server className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{node.name}</span>
                          <StatusIcon className={cn('h-3 w-3', getStatusColor(node.status).replace('bg-', 'text-'))} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <p className="font-medium">{node.name}</p>
                          <p className="text-xs text-muted-foreground">{node.region}</p>
                          <p className="text-xs">{t('dashboard:topology.latency')}: {node.latency}ms</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>

              {/* Aggregators Column */}
              <div className="flex flex-col items-center justify-center gap-3">
                {groupedNodes['aggregator'].map((node, index) => {
                  const StatusIcon = getStatusIcon(node.status);
                  return (
                    <Tooltip key={node.id}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'relative flex items-center gap-2 rounded-lg border bg-white p-3 shadow-sm cursor-pointer transition-all hover:shadow-md',
                            node.status === 'offline' && 'opacity-50'
                          )}
                          style={{ marginTop: index > 0 ? '-8px' : 0 }}
                        >
                          <div className={cn('h-2 w-2 rounded-full', getStatusColor(node.status))} />
                          <Network className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{node.name}</span>
                          <StatusIcon className={cn('h-3 w-3', getStatusColor(node.status).replace('bg-', 'text-'))} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <p className="font-medium">{node.name}</p>
                          <p className="text-xs text-muted-foreground">{node.region}</p>
                          <p className="text-xs">{t('dashboard:topology.latency')}: {node.latency}ms</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>

              {/* Oracles Column */}
              <div className="flex flex-col items-center justify-center gap-3">
                {groupedNodes['oracle'].map((node, index) => {
                  const StatusIcon = getStatusIcon(node.status);
                  return (
                    <Tooltip key={node.id}>
                      <TooltipTrigger asChild>
                        <div
                          className={cn(
                            'relative flex items-center gap-2 rounded-lg border bg-white p-3 shadow-sm cursor-pointer transition-all hover:shadow-md',
                            node.status === 'offline' && 'opacity-50'
                          )}
                          style={{ marginTop: index > 0 ? '-8px' : 0 }}
                        >
                          <div className={cn('h-2 w-2 rounded-full', getStatusColor(node.status))} />
                          <Wifi className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{node.name}</span>
                          <StatusIcon className={cn('h-3 w-3', getStatusColor(node.status).replace('bg-', 'text-'))} />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <div className="space-y-1">
                          <p className="font-medium">{node.name}</p>
                          <p className="text-xs text-muted-foreground">{node.region}</p>
                          <p className="text-xs">{t('dashboard:topology.latency')}: {node.latency}ms</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </div>

            {/* Connection Lines SVG */}
            <svg className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
              {nodes.map(node => 
                node.connectedTo.map(targetId => {
                  const target = nodes.find(n => n.id === targetId);
                  if (!target) return null;
                  return (
                    <line
                      key={`${node.id}-${targetId}`}
                      x1="33%"
                      y1="50%"
                      x2="66%"
                      y2="50%"
                      stroke="#cbd5e1"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                    />
                  );
                })
              )}
            </svg>
          </div>
        </TooltipProvider>
      </CardContent>
    </Card>
  );
}
