'use client';

import { useMemo } from 'react';
import { Globe, Server, Shield, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n';
import { cn } from '@/lib/utils';

export interface NodeRegion {
  id: string;
  name: string;
  code: string;
  nodeCount: number;
  healthyNodes: number;
  latency: number;
  coordinates: { x: number; y: number };
}

interface NodeDistributionMapProps {
  regions: NodeRegion[];
  loading?: boolean;
  className?: string;
}

export function NodeDistributionMap({ regions, loading, className }: NodeDistributionMapProps) {
  const { t } = useI18n();

  const stats = useMemo(() => {
    const totalNodes = regions.reduce((sum, r) => sum + r.nodeCount, 0);
    const totalHealthy = regions.reduce((sum, r) => sum + r.healthyNodes, 0);
    const avgLatency = regions.length > 0
      ? regions.reduce((sum, r) => sum + r.latency, 0) / regions.length
      : 0;
    const globalHealth = totalNodes > 0 ? (totalHealthy / totalNodes) * 100 : 0;

    return { totalNodes, totalHealthy, avgLatency, globalHealth };
  }, [regions]);

  const getHealthColor = (healthPercent: number) => {
    if (healthPercent >= 95) return 'bg-emerald-500';
    if (healthPercent >= 80) return 'bg-blue-500';
    if (healthPercent >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getLatencyColor = (latency: number) => {
    if (latency < 100) return 'text-emerald-600';
    if (latency < 300) return 'text-blue-600';
    return 'text-amber-600';
  };

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
            <Globe className="h-5 w-5" />
            {t('protocol:nodeDistribution.title')}
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Server className="h-3 w-3" />
              {stats.totalNodes} {t('protocol:nodeDistribution.totalNodes')}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Shield className="h-3 w-3" />
              {stats.totalHealthy} {t('protocol:nodeDistribution.healthy')}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Activity className="h-3 w-3" />
              {stats.avgLatency.toFixed(0)}ms {t('protocol:nodeDistribution.avgLatency')}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* World Map Visualization */}
        <div className="relative h-[300px] w-full overflow-hidden rounded-lg bg-slate-50 dark:bg-slate-900">
          {/* Simplified World Map SVG */}
          <svg
            viewBox="0 0 1000 500"
            className="h-full w-full"
            style={{ background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)' }}
          >
            {/* Grid lines */}
            {[...Array(10)].map((_, i) => (
              <g key={i}>
                <line
                  x1={0}
                  y1={i * 50}
                  x2={1000}
                  y2={i * 50}
                  stroke="#cbd5e1"
                  strokeWidth="0.5"
                  strokeDasharray="4 4"
                />
                <line
                  x1={i * 100}
                  y1={0}
                  x2={i * 100}
                  y2={500}
                  stroke="#cbd5e1"
                  strokeWidth="0.5"
                  strokeDasharray="4 4"
                />
              </g>
            ))}

            {/* Continents (simplified shapes) */}
            <g fill="#94a3b8" opacity="0.3">
              {/* North America */}
              <path d="M 150 80 Q 200 60 280 80 L 300 150 L 250 200 L 180 180 Z" />
              {/* South America */}
              <path d="M 260 220 L 320 220 L 340 350 L 280 400 L 250 300 Z" />
              {/* Europe */}
              <path d="M 450 70 L 550 70 L 560 140 L 480 150 L 440 120 Z" />
              {/* Africa */}
              <path d="M 460 170 L 560 170 L 580 300 L 500 380 L 450 280 Z" />
              {/* Asia */}
              <path d="M 570 60 L 850 60 L 900 200 L 800 250 L 650 220 L 580 150 Z" />
              {/* Australia */}
              <path d="M 750 320 L 880 320 L 860 420 L 740 400 Z" />
            </g>

            {/* Connection lines between nodes */}
            {regions.map((region, i) =>
              regions.slice(i + 1).map((otherRegion) => (
                <line
                  key={`${region.id}-${otherRegion.id}`}
                  x1={region.coordinates.x}
                  y1={region.coordinates.y}
                  x2={otherRegion.coordinates.x}
                  y2={otherRegion.coordinates.y}
                  stroke="#6366f1"
                  strokeWidth="0.5"
                  opacity="0.3"
                />
              ))
            )}

            {/* Node regions */}
            {regions.map((region) => {
              const healthPercent = (region.healthyNodes / region.nodeCount) * 100;
              const radius = Math.max(8, Math.min(20, region.nodeCount / 5));

              return (
                <g key={region.id}>
                  {/* Pulse effect */}
                  <circle
                    cx={region.coordinates.x}
                    cy={region.coordinates.y}
                    r={radius + 5}
                    fill={getHealthColor(healthPercent)}
                    opacity="0.2"
                  >
                    <animate
                      attributeName="r"
                      values={`${radius + 5};${radius + 15};${radius + 5}`}
                      dur="2s"
                      repeatCount="indefinite"
                    />
                    <animate
                      attributeName="opacity"
                      values="0.2;0;0.2"
                      dur="2s"
                      repeatCount="indefinite"
                    />
                  </circle>

                  {/* Main node circle */}
                  <circle
                    cx={region.coordinates.x}
                    cy={region.coordinates.y}
                    r={radius}
                    fill={getHealthColor(healthPercent)}
                    stroke="white"
                    strokeWidth="2"
                    className="cursor-pointer transition-all hover:scale-110"
                  />

                  {/* Node count label */}
                  <text
                    x={region.coordinates.x}
                    y={region.coordinates.y + radius + 15}
                    textAnchor="middle"
                    className="fill-slate-700 text-xs font-medium"
                  >
                    {region.name}
                  </text>
                  <text
                    x={region.coordinates.x}
                    y={region.coordinates.y + radius + 28}
                    textAnchor="middle"
                    className="fill-slate-500 text-xs"
                  >
                    {region.nodeCount} nodes
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Region List */}
        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {regions.map((region) => {
            const healthPercent = (region.healthyNodes / region.nodeCount) * 100;

            return (
              <div
                key={region.id}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div className="flex items-center gap-3">
                  <div className={cn('h-3 w-3 rounded-full', getHealthColor(healthPercent))} />
                  <div>
                    <div className="font-medium text-sm">{region.name}</div>
                    <div className="text-muted-foreground text-xs">
                      {region.healthyNodes}/{region.nodeCount} {t('protocol:nodeDistribution.healthyNodes')}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={cn('text-sm font-medium', getLatencyColor(region.latency))}>
                    {region.latency}ms
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {healthPercent.toFixed(0)}% {t('protocol:nodeDistribution.health')}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
