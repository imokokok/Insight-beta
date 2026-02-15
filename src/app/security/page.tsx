'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';

import { Shield, AlertTriangle, Activity, RefreshCw, Search, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

import { StatCard } from '@/components/common';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useI18n } from '@/i18n/LanguageProvider';
import { logger } from '@/shared/logger';
import { cn, fetchApiData, formatTime } from '@/shared/utils';

interface Alert { id: string; timestamp: string; type: string; severity: 'low' | 'medium' | 'high' | 'critical'; status: 'active' | 'resolved' | 'investigating'; description: string; }

export default function SecurityPage() {
  const { t } = useI18n();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const fetchAlerts = useCallback(async () => {
    try { setLoading(true); const response = await fetchApiData<{ data: Alert[] }>('/api/security/alerts'); setAlerts(response.data); }
    catch (err) { logger.error('Failed to load security alerts', { error: err }); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  const filteredAlerts = alerts.filter(a => !searchQuery || a.description.toLowerCase().includes(searchQuery.toLowerCase()));
  const stats = useMemo(() => ({ total: alerts.length, critical: alerts.filter(a => a.severity === 'critical').length, active: alerts.filter(a => a.status === 'active').length, resolved: alerts.filter(a => a.status === 'resolved').length }), [alerts]);
  const chartData = useMemo(() => alerts.slice(0, 10).map(a => ({ time: formatTime(a.timestamp), severity: { critical: 4, high: 3, medium: 2, low: 1 }[a.severity] })), [alerts]);
  const severityColors: Record<string, string> = { low: 'bg-green-500', medium: 'bg-yellow-500', high: 'bg-orange-500', critical: 'bg-red-500' };
  const statusColors: Record<string, string> = { active: 'bg-red-500', resolved: 'bg-green-500', investigating: 'bg-blue-500' };

  return (
    <ErrorBoundary>
      <div className="container mx-auto space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl"><span className="text-red-600">{t('security.pageTitle')}</span></h1><p className="mt-1 text-sm text-muted-foreground">{t('security.pageDescription')}</p></div>
          <div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={fetchAlerts} disabled={loading}><RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />{t('common.refresh')}</Button></div>
        </div>

        {loading && !alerts.length ? <div className="grid grid-cols-2 gap-4 md:grid-cols-4"><div className="h-24 animate-pulse rounded-lg bg-gray-100" /><div className="h-24 animate-pulse rounded-lg bg-gray-100" /><div className="h-24 animate-pulse rounded-lg bg-gray-100" /><div className="h-24 animate-pulse rounded-lg bg-gray-100" /></div> : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatCard title={t('security.stats.totalAlerts')} value={stats.total} icon={<Shield className="h-5 w-5" />} color="blue" />
            <StatCard title={t('security.stats.critical')} value={stats.critical} icon={<AlertTriangle className="h-5 w-5" />} color="red" />
            <StatCard title={t('security.stats.active')} value={stats.active} icon={<Activity className="h-5 w-5" />} color="red" />
            <StatCard title={t('security.stats.resolved')} value={stats.resolved} icon={<Shield className="h-5 w-5" />} color="green" />
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList><TabsTrigger value="overview"><Activity className="mr-2 h-4 w-4" />{t('security.tabs.overview')}</TabsTrigger><TabsTrigger value="alerts"><AlertTriangle className="mr-2 h-4 w-4" />{t('security.tabs.alerts')} ({filteredAlerts.length})</TabsTrigger><TabsTrigger value="trends"><TrendingUp className="mr-2 h-4 w-4" />{t('security.tabs.trends')}</TabsTrigger></TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card><CardHeader><CardTitle>{t('security.cards.alertTrend')}</CardTitle><CardDescription>{t('security.cards.alertsOverTime')}</CardDescription></CardHeader><CardContent><div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Area type="monotone" dataKey="severity" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} /></AreaChart></ResponsiveContainer></div></CardContent></Card>
              <Card><CardHeader><CardTitle>{t('security.cards.recentAlerts')}</CardTitle><CardDescription>{t('security.cards.latestAlerts')}</CardDescription></CardHeader><CardContent><div className="space-y-3">{alerts.slice(0, 5).map(alert => (<div key={alert.id} className="flex items-center justify-between rounded-lg border p-3"><div className="flex items-center gap-2"><Badge className={severityColors[alert.severity]}>{alert.severity}</Badge><span className="text-sm">{alert.type}</span></div><span className="text-xs text-muted-foreground">{formatTime(alert.timestamp)}</span></div>))}</div></CardContent></Card>
            </div>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4">
            <Card><CardContent className="p-4"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder={t('security.searchPlaceholder')} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" /></div></CardContent></Card>
            <div className="space-y-3">
              {filteredAlerts.map(alert => (<Card key={alert.id}><CardContent className="flex items-center justify-between p-4"><div className="flex items-center gap-3"><Badge className={severityColors[alert.severity]}>{alert.severity}</Badge><Badge className={statusColors[alert.status]}>{alert.status}</Badge><span>{alert.type}</span></div><span className="text-sm text-muted-foreground">{formatTime(alert.timestamp)}</span></CardContent></Card>))}
            </div>
          </TabsContent>

          <TabsContent value="trends"><Card><CardContent className="p-6 text-center text-muted-foreground">{t('security.trendsComingSoon')}</CardContent></Card></TabsContent>
        </Tabs>
      </div>
    </ErrorBoundary>
  );
}
