'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Globe, RefreshCw, Search, TrendingUp, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/common';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { logger } from '@/shared/logger';
import { cn, fetchApiData } from '@/shared/utils';

interface Protocol { id: string; name: string; status: 'active' | 'inactive' | 'maintenance'; priceFeeds: number; avgLatency: number; uptime: number; lastUpdate: string; }

export default function ProtocolsPage({ params }: { params: Promise<{ protocol: string }> }) {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [protocolName, setProtocolName] = useState('');

  useEffect(() => {
    params.then((resolved) => setProtocolName(resolved.protocol));
  }, [params]);

  const fetchProtocols = useCallback(async () => {
    if (!protocolName) return;
    try { 
      setLoading(true); 
      const response = await fetchApiData<{ data: Protocol[] }>(`/api/oracle/protocols/${protocolName}`); 
      setProtocols(response.data); 
    }
    catch (err) { 
      logger.error('Failed to load protocols', { error: err }); 
    }
    finally { setLoading(false); }
  }, [protocolName]);

  useEffect(() => { fetchProtocols(); }, [fetchProtocols]);

  const filteredProtocols = useMemo(() => protocols.filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase())), [protocols, searchQuery]);
  const statusColors: Record<string, string> = { active: 'bg-green-500', inactive: 'bg-gray-500', maintenance: 'bg-yellow-500' };

  return (
    <ErrorBoundary>
      <div className="container mx-auto space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl"><Globe className="h-6 w-6 text-blue-600" /><span className="capitalize">{protocolName}</span> Protocols</h1><p className="mt-1 text-sm text-muted-foreground">Monitor oracle protocols and their performance</p></div>
          <Button variant="outline" size="sm" onClick={fetchProtocols} disabled={loading}><RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />Refresh</Button>
        </div>

        {loading && !protocols.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-4"><div className="h-24 animate-pulse rounded-lg bg-gray-100" /><div className="h-24 animate-pulse rounded-lg bg-gray-100" /><div className="h-24 animate-pulse rounded-lg bg-gray-100" /></div> : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
            <StatCard title="Total Protocols" value={protocols.length} icon={<Globe className="h-5 w-5" />} color="blue" />
            <StatCard title="Active" value={protocols.filter(p => p.status === 'active').length} icon={<Activity className="h-5 w-5" />} color="green" />
            <StatCard title="Total Feeds" value={protocols.reduce((sum, p) => sum + p.priceFeeds, 0)} icon={<TrendingUp className="h-5 w-5" />} color="purple" />
          </div>
        )}

        <Card><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search protocols..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div></CardContent></Card>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProtocols.map(protocol => (
            <Card key={protocol.id}>
              <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base">{protocol.name}</CardTitle><Badge className={statusColors[protocol.status]}>{protocol.status}</Badge></div></CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Price Feeds</span><span className="font-semibold">{protocol.priceFeeds}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Avg Latency</span><span className="font-semibold">{protocol.avgLatency}ms</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Uptime</span><span className="font-semibold">{protocol.uptime}%</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Last Update</span><span className="font-semibold">{new Date(protocol.lastUpdate).toLocaleTimeString()}</span></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </ErrorBoundary>
  );
}
