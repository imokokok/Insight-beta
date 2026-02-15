'use client';

import { useEffect, useState, useCallback } from 'react';
import { AlertTriangle, RefreshCw, Clock, Shield, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/common';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { logger } from '@/shared/logger';
import { cn, fetchApiData, formatTime } from '@/shared/utils';

interface ManipulationAlert { id: string; timestamp: string; type: string; severity: 'low' | 'medium' | 'high' | 'critical'; status: 'active' | 'resolved' | 'investigating'; description: string; affectedAssets: string[]; }

export default function ManipulationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [alert, setAlert] = useState<ManipulationAlert | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertId, setAlertId] = useState('');

  useEffect(() => {
    params.then((resolved) => setAlertId(resolved.id));
  }, [params]);

  const fetchAlert = useCallback(async () => {
    if (!alertId) return;
    try { setLoading(true); const response = await fetchApiData<{ data: ManipulationAlert }>(`/api/security/manipulation/${alertId}`); setAlert(response.data); }
    catch (err) { logger.error('Failed to load manipulation alert', { error: err }); }
    finally { setLoading(false); }
  }, [alertId]);

  useEffect(() => { fetchAlert(); }, [fetchAlert]);

  const chartData = [{ time: '10:00', value: 20 }, { time: '11:00', value: 45 }, { time: '12:00', value: 30 }, { time: '13:00', value: 65 }, { time: '14:00', value: 40 }];

  return (
    <ErrorBoundary>
      <div className="container mx-auto space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h1 className="flex items-center gap-3 text-xl font-bold sm:text-2xl lg:text-3xl"><AlertTriangle className="h-6 w-6 text-red-600" />Manipulation Alert</h1><p className="mt-1 text-sm text-muted-foreground">Alert ID: {alertId}</p></div>
          <Button variant="outline" size="sm" onClick={fetchAlert} disabled={loading}><RefreshCw className={cn('mr-2 h-4 w-4', loading && 'animate-spin')} />Refresh</Button>
        </div>

        {loading && !alert ? <div className="grid grid-cols-2 gap-4 md:grid-cols-4"><div className="h-24 animate-pulse rounded-lg bg-gray-100" /><div className="h-24 animate-pulse rounded-lg bg-gray-100" /><div className="h-24 animate-pulse rounded-lg bg-gray-100" /></div> : alert && (
          <>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <StatCard title="Severity" value={alert.severity} icon={<AlertTriangle className="h-5 w-5" />} color={alert.severity === 'critical' ? 'red' : alert.severity === 'high' ? 'amber' : 'green'} />
              <StatCard title="Status" value={alert.status} icon={<Activity className="h-5 w-5" />} color="blue" />
              <StatCard title="Type" value={alert.type} icon={<Shield className="h-5 w-5" />} color="purple" />
              <StatCard title="Detected" value={formatTime(alert.timestamp)} icon={<Clock className="h-5 w-5" />} color="purple" />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card><CardHeader><CardTitle>Alert Details</CardTitle></CardHeader><CardContent className="space-y-4"><div><p className="text-sm text-muted-foreground">Description</p><p className="mt-1">{alert.description}</p></div><div><p className="text-sm text-muted-foreground">Affected Assets</p><div className="mt-2 flex flex-wrap gap-2">{alert.affectedAssets.map(asset => <Badge key={asset} variant="secondary">{asset}</Badge>)}</div></div></CardContent></Card>
              <Card><CardHeader><CardTitle>Activity Timeline</CardTitle><CardDescription>Alert activity over time</CardDescription></CardHeader><CardContent><div className="h-48"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Area type="monotone" dataKey="value" stroke="#ef4444" fill="#ef4444" fillOpacity={0.3} /></AreaChart></ResponsiveContainer></div></CardContent></Card>
            </div>
          </>
        )}
      </div>
    </ErrorBoundary>
  );
}
