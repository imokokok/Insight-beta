'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Activity, Database, Server, RefreshCw, Download, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area } from 'recharts';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { DashboardSkeleton } from '@/components/ui';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatCard } from '@/components/common';
import { logger } from '@/shared/logger';
import { cn, fetchApiData } from '@/shared/utils';

interface PerformanceMetrics { timestamp: number; responseTime: { avg: number; p50: number; p95: number; p99: number; max: number; min: number; count: number }; throughput: { requestsPerSecond: number; requestsPerMinute: number; bytesPerSecond: number; activeConnections: number }; errors: { total: number; rate: number; byType: Record<string, number>; byEndpoint: Record<string, number> }; resources: { cpu: { usage: number; loadAverage: number[] }; memory: { used: number; total: number; percentage: number }; disk: { used: number; total: number; percentage: number } }; database: { connections: { active: number; idle: number; max: number }; queryTime: { avg: number; p95: number; p99: number }; slowQueries: number; transactionsPerSecond: number }; cache: { hitRate: number; misses: number; size: number }; }

interface NodeStatus { id: string; name: string; status: 'online' | 'offline' | 'degraded'; uptime: number; latency: number; lastHeartbeat: string; region: string; version: string; }

const statusColors: Record<string, string> = { online: 'bg-green-500', offline: 'bg-red-500', degraded: 'bg-yellow-500' };

function NodeCard({ node, onClick }: { node: NodeStatus; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="w-full cursor-pointer rounded-lg border p-4 text-left transition-all hover:border-blue-500 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{node.name}</span>
            <Badge className={statusColors[node.status]}>{node.status}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">{node.region} • v{node.version}</p>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Uptime: {node.uptime}%</span>
            <span>Latency: {node.latency}ms</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold">{node.latency}ms</p>
          <p className="text-xs text-muted-foreground">Latency</p>
        </div>
      </div>
    </button>
  );
}

export default function MonitoringPage() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [nodes, setNodes] = useState<NodeStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [metricsRes, nodesRes] = await Promise.all([
        fetchApiData<{ data: PerformanceMetrics }>('/api/oracle/monitoring/metrics'),
        fetchApiData<{ data: NodeStatus[] }>('/api/oracle/monitoring/nodes'),
      ]);
      setMetrics(metricsRes.data);
      setNodes(nodesRes.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch monitoring data');
      logger.error('Failed to fetch monitoring data', { error: err });
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredNodes = useMemo(() => nodes.filter(n => !searchQuery || n.name.toLowerCase().includes(searchQuery.toLowerCase())), [nodes, searchQuery]);
  const stats = useMemo(() => ({ total: nodes.length, online: nodes.filter(n => n.status === 'online').length, offline: nodes.filter(n => n.status === 'offline').length, degraded: nodes.filter(n => n.status === 'degraded').length }), [nodes]);
  const chartData = useMemo(() => metrics ? [{ time: new Date(metrics.timestamp).toLocaleTimeString(), latency: metrics.responseTime.avg, errors: metrics.errors.rate * 100 }] : [], [metrics]);

  const handleExport = () => { if (!metrics) return; const blob = new Blob([JSON.stringify({ metrics, nodes }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `monitoring-${new Date().toISOString()}.json`; a.click(); URL.revokeObjectURL(url); };

  if (error && !loading && !metrics) { return (<div className="container mx-auto p-6"><Card><CardContent className="p-6"><p className="text-red-500">{error}</p><Button onClick={fetchData} className="mt-4">Retry</Button></CardContent></Card></div>); }

  return (
    <ErrorBoundary>
      <div className="container mx-auto space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl"><span className="text-blue-600">System Monitoring</span></h1>
            <p className="mt-1 text-sm text-muted-foreground">Real-time system performance and node health monitoring</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}><RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />Refresh</Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!metrics}><Download className="mr-2 h-4 w-4" />Export</Button>
          </div>
        </div>

        {loading && !metrics ? <DashboardSkeleton /> : (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard title="Total Nodes" value={stats.total} icon={<Server className="h-5 w-5" />} color="blue" />
              <StatCard title="Online" value={stats.online} icon={<CheckCircle className="h-5 w-5" />} color="green" />
              <StatCard title="Degraded" value={stats.degraded} icon={<AlertTriangle className="h-5 w-5" />} color="amber" />
              <StatCard title="Offline" value={stats.offline} icon={<XCircle className="h-5 w-5" />} color="red" />
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 lg:w-auto">
                <TabsTrigger value="overview"><Activity className="mr-2 h-4 w-4" />Overview</TabsTrigger>
                <TabsTrigger value="nodes"><Server className="mr-2 h-4 w-4" />Nodes ({filteredNodes.length})</TabsTrigger>
                <TabsTrigger value="resources"><Database className="mr-2 h-4 w-4" />Resources</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card><CardHeader><CardTitle>Response Time</CardTitle><CardDescription>Average response time over time</CardDescription></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Area type="monotone" dataKey="latency" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} /></AreaChart></ResponsiveContainer></div></CardContent></Card>
                  <Card><CardHeader><CardTitle>Error Rate</CardTitle><CardDescription>Errors per request</CardDescription></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Area type="monotone" dataKey="errors" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} /></AreaChart></ResponsiveContainer></div></CardContent></Card>
                </div>
                <Card><CardHeader><CardTitle>Quick Stats</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-4 md:grid-cols-4"><div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-muted-foreground">Avg Response</p><p className="text-lg font-bold">{metrics?.responseTime.avg.toFixed(2)}ms</p></div><div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-muted-foreground">P99 Latency</p><p className="text-lg font-bold">{metrics?.responseTime.p99.toFixed(2)}ms</p></div><div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-muted-foreground">Requests/min</p><p className="text-lg font-bold">{metrics?.throughput.requestsPerMinute}</p></div><div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-muted-foreground">Error Rate</p><p className="text-lg font-bold">{((metrics?.errors.rate || 0) * 100).toFixed(2)}%</p></div></div></CardContent></Card>
              </TabsContent>

              <TabsContent value="nodes" className="space-y-6">
                <Card><CardContent className="p-4"><Input placeholder="Search nodes... (⌘F)" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></CardContent></Card>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{filteredNodes.map(node => <NodeCard key={node.id} node={node} onClick={() => {}} />)}</div>
              </TabsContent>

              <TabsContent value="resources" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-3">
                  <Card><CardHeader><CardTitle>CPU Usage</CardTitle></CardHeader><CardContent><Progress value={metrics?.resources.cpu.usage || 0} className="h-2" /><p className="mt-2 text-sm text-muted-foreground">{metrics?.resources.cpu.usage.toFixed(1)}% used</p><div className="mt-2 text-xs text-gray-500">Load: {metrics?.resources.cpu.loadAverage.join(', ')}</div></CardContent></Card>
                  <Card><CardHeader><CardTitle>Memory</CardTitle></CardHeader><CardContent><Progress value={metrics?.resources.memory.percentage || 0} className="h-2" /><p className="mt-2 text-sm text-muted-foreground">{((metrics?.resources.memory.used || 0) / 1e9).toFixed(1)}GB / {((metrics?.resources.memory.total || 0) / 1e9).toFixed(1)}GB</p></CardContent></Card>
                  <Card><CardHeader><CardTitle>Disk</CardTitle></CardHeader><CardContent><Progress value={metrics?.resources.disk.percentage || 0} className="h-2" /><p className="mt-2 text-sm text-muted-foreground">{((metrics?.resources.disk.used || 0) / 1e9).toFixed(1)}GB / {((metrics?.resources.disk.total || 0) / 1e9).toFixed(1)}GB</p></CardContent></Card>
                </div>
                <Card><CardHeader><CardTitle>Database</CardTitle></CardHeader><CardContent><div className="grid grid-cols-2 gap-4 md:grid-cols-4"><div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-muted-foreground">Active Connections</p><p className="text-lg font-bold">{metrics?.database.connections.active}</p></div><div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-muted-foreground">Avg Query Time</p><p className="text-lg font-bold">{metrics?.database.queryTime.avg.toFixed(2)}ms</p></div><div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-muted-foreground">Slow Queries</p><p className="text-lg font-bold">{metrics?.database.slowQueries}</p></div><div className="rounded-lg bg-gray-50 p-3"><p className="text-xs text-muted-foreground">Hit Rate</p><p className="text-lg font-bold">{((metrics?.cache.hitRate || 0) * 100).toFixed(1)}%</p></div></div></CardContent></Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
