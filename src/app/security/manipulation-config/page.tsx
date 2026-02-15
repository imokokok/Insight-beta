'use client';

import { useEffect, useState, useCallback } from 'react';
import { Shield, AlertTriangle, RefreshCw, Download, Search, Plus, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/common';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { logger } from '@/shared/logger';
import { cn, fetchApiData } from '@/shared/utils';

interface ConfigRule { id: string; name: string; type: string; threshold: number; enabled: boolean; severity: 'low' | 'medium' | 'high' | 'critical'; }
interface ConfigSummary { totalRules: number; activeRules: number; alertCount: number; lastUpdated: string; }

export default function ManipulationConfigPage() {
  const [config, setConfig] = useState<{ rules: ConfigRule[]; summary: ConfigSummary } | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('rules');

  const fetchConfig = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchApiData<{ data: { rules: ConfigRule[]; summary: ConfigSummary } }>('/api/security/manipulation/config');
      setConfig(response.data);
    } catch (err) { 
      logger.error('Failed to load manipulation config', { error: err }); 
    }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const filteredRules = config?.rules.filter(r => !searchQuery || r.name.toLowerCase().includes(searchQuery.toLowerCase())) || [];
  const severityColors: Record<string, string> = { low: 'bg-green-500', medium: 'bg-yellow-500', high: 'bg-orange-500', critical: 'bg-red-500' };
  const handleExport = () => { if (!config) return; const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `manipulation-config-${new Date().toISOString()}.json`; a.click(); };

  return (
    <ErrorBoundary>
      <div className="container mx-auto space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl"><span className="text-red-600">Manipulation Detection Config</span></h1><p className="mt-1 text-sm text-muted-foreground">Configure detection rules and thresholds</p></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchConfig} disabled={loading}><RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />Refresh</Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={!config}><Download className="mr-2 h-4 w-4" />Export</Button>
            <Button size="sm"><Plus className="mr-2 h-4 w-4" />Add Rule</Button>
          </div>
        </div>

        {loading && !config ? <div className="grid grid-cols-2 gap-4 md:grid-cols-4"><div className="h-24 animate-pulse rounded-lg bg-gray-100" /><div className="h-24 animate-pulse rounded-lg bg-gray-100" /><div className="h-24 animate-pulse rounded-lg bg-gray-100" /><div className="h-24 animate-pulse rounded-lg bg-gray-100" /></div> : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard title="Total Rules" value={config?.summary.totalRules || 0} icon={<Settings className="h-5 w-5" />} color="blue" />
            <StatCard title="Active Rules" value={config?.summary.activeRules || 0} icon={<Shield className="h-5 w-5" />} color="green" />
            <StatCard title="Alerts Today" value={config?.summary.alertCount || 0} icon={<AlertTriangle className="h-5 w-5" />} color="red" />
            <StatCard title="Last Updated" value={config?.summary.lastUpdated ? new Date(config.summary.lastUpdated).toLocaleTimeString() : 'N/A'} icon={<RefreshCw className="h-5 w-5" />} color="purple" />
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList><TabsTrigger value="rules">Rules ({filteredRules.length})</TabsTrigger><TabsTrigger value="thresholds">Thresholds</TabsTrigger><TabsTrigger value="history">History</TabsTrigger></TabsList>
          <TabsContent value="rules" className="space-y-4">
            <Card><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search rules..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div></CardContent></Card>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredRules.map(rule => (
                <Card key={rule.id} className={cn(!rule.enabled && 'opacity-60')}>
                  <CardHeader className="pb-2"><div className="flex items-center justify-between"><CardTitle className="text-base">{rule.name}</CardTitle><Badge className={severityColors[rule.severity]}>{rule.severity}</Badge></div><CardDescription className="text-xs">{rule.type}</CardDescription></CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Threshold</span><span className="font-semibold">{rule.threshold}</span></div>
                    <div className="mt-2 flex items-center justify-between text-sm"><span className="text-muted-foreground">Status</span><Badge variant={rule.enabled ? 'default' : 'secondary'}>{rule.enabled ? 'Active' : 'Disabled'}</Badge></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
          <TabsContent value="thresholds"><Card><CardContent className="p-6 text-center text-muted-foreground">Thresholds configuration coming soon</CardContent></Card></TabsContent>
          <TabsContent value="history"><Card><CardContent className="p-6 text-center text-muted-foreground">History coming soon</CardContent></Card></TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}
