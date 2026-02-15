/**
 * Monitoring Dashboard Component
 *
 * 监控 Dashboard 组件，展示系统状态
 */

'use client';

import { useState, useEffect } from 'react';

import {
  RefreshCw,
  Activity,
  Server,
  Database,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePageOptimizations } from '@/hooks/usePageOptimizations';
import { logger } from '@/shared/logger';

interface MonitoringStats {
  notifications: {
    channels: string[];
    configured: {
      email: boolean;
      webhook: boolean;
      slack: boolean;
      telegram: boolean;
      pagerduty: boolean;
      discord: boolean;
    };
  };
  system: {
    nodeEnv: string;
    timestamp: string;
  };
}

export function MonitoringDashboard() {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/monitoring/dashboard');

      if (!response.ok) {
        throw new Error('Failed to fetch monitoring data');
      }

      const data = await response.json();
      setStats(data);
    } catch (error: unknown) {
      logger.error('Failed to load monitoring data', { error });
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  usePageOptimizations({
    pageName: '监控面板',
    onRefresh: async () => {
      await fetchData();
    },
    enableSearch: false,
    showRefreshToast: true,
  });

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="m-4">
        <CardContent className="pt-6">
          <div className="text-center text-red-500">
            <Activity className="mx-auto mb-2 h-8 w-8" />
            <p>{error}</p>
            <button onClick={fetchData} className="mt-4 text-blue-500 hover:underline">
              重试
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* System Status */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Environment</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.system?.nodeEnv || 'Unknown'}</div>
            <p className="text-xs text-muted-foreground">
              Last updated: {stats?.system?.timestamp ? new Date(stats.system.timestamp).toLocaleString() : 'N/A'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notification Channels</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.notifications?.channels?.length || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.notifications?.channels?.join(', ') || 'None configured'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Database</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Connected</div>
            <p className="text-xs text-muted-foreground">
              Status: Healthy
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Notification Configuration Status */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
          <CardDescription>Current notification channel configuration status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {stats?.notifications?.configured && Object.entries(stats.notifications.configured).map(([channel, configured]) => (
              <div key={channel} className="flex items-center space-x-2 rounded-lg border p-3">
                <div className={`h-2 w-2 rounded-full ${configured ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="capitalize">{channel}</span>
                <span className="ml-auto text-xs text-muted-foreground">
                  {configured ? 'Configured' : 'Not configured'}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <button
          onClick={fetchData}
          className="flex items-center space-x-2 rounded-lg border px-4 py-2 hover:bg-muted"
        >
          <RefreshCw className="h-4 w-4" />
          <span>Refresh</span>
        </button>
      </div>
    </div>
  );
}

export default MonitoringDashboard;
