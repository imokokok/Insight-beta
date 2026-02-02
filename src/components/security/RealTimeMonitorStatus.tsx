'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Activity,
  Play,
  Square,
  AlertCircle,
  CheckCircle,
  Loader2,
  Settings,
  TrendingUp,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MonitorStatus {
  isRunning: boolean;
  activeMonitors: string[];
  totalMonitoredFeeds: number;
  lastCheckTime?: string;
  recentDetections: number;
  systemHealth: 'healthy' | 'degraded' | 'unhealthy';
}

interface RealTimeMonitorStatusProps {
  className?: string;
}

export function RealTimeMonitorStatus({ className }: RealTimeMonitorStatusProps) {
  const [status, setStatus] = useState<MonitorStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoStart, setAutoStart] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch('/api/security/monitor-status');
      const data = await response.json();
      setStatus(data.status);
    } catch (error) {
      console.error('Failed to fetch monitor status:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleStartMonitoring = async () => {
    setActionLoading(true);
    try {
      await fetch('/api/security/monitor/start', { method: 'POST' });
      await fetchStatus();
    } catch (error) {
      console.error('Failed to start monitoring:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStopMonitoring = async () => {
    setActionLoading(true);
    try {
      await fetch('/api/security/monitor/stop', { method: 'POST' });
      await fetchStatus();
    } catch (error) {
      console.error('Failed to stop monitoring:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const getHealthIcon = () => {
    if (!status) return <Loader2 className="h-5 w-5 animate-spin" />;
    switch (status.systemHealth) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'unhealthy':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5" />;
    }
  };

  const getHealthLabel = () => {
    if (!status) return '加载中...';
    switch (status.systemHealth) {
      case 'healthy':
        return '系统正常';
      case 'degraded':
        return '性能降级';
      case 'unhealthy':
        return '系统异常';
      default:
        return '未知状态';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">实时监控状态</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {getHealthIcon()}
            <span className="text-sm">{getHealthLabel()}</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {status?.isRunning ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                <span className="text-sm font-medium text-green-600">运行中</span>
              </>
            ) : (
              <>
                <span className="inline-flex rounded-full h-3 w-3 bg-gray-400"></span>
                <span className="text-sm font-medium text-gray-500">已停止</span>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            {status?.isRunning ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStopMonitoring}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Square className="h-4 w-4 mr-1" />
                )}
                停止监控
              </Button>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={handleStartMonitoring}
                disabled={actionLoading}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                开始监控
              </Button>
            )}
          </div>
        </div>

        {status?.isRunning && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs">监控中数据源</span>
              </div>
              <div className="text-2xl font-bold">{status.activeMonitors.length}</div>
            </div>
            <div className="bg-muted rounded-lg p-3">
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Shield className="h-4 w-4" />
                <span className="text-xs">近期检测</span>
              </div>
              <div className={cn(
                "text-2xl font-bold",
                status.recentDetections > 0 ? "text-red-500" : "text-green-500"
              )}>
                {status.recentDetections}
              </div>
            </div>
          </div>
        )}

        {status?.activeMonitors && status.activeMonitors.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">活跃监控</div>
            <div className="flex flex-wrap gap-1">
              {status.activeMonitors.slice(0, 5).map((monitor) => (
                <Badge key={monitor} variant="secondary" className="text-xs">
                  {monitor}
                </Badge>
              ))}
              {status.activeMonitors.length > 5 && (
                <Badge variant="outline" className="text-xs">
                  +{status.activeMonitors.length - 5}
                </Badge>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center space-x-2">
            <Switch
              id="auto-start"
              checked={autoStart}
              onCheckedChange={setAutoStart}
            />
            <Label htmlFor="auto-start" className="text-sm cursor-pointer">
              自动启动
            </Label>
          </div>
          <Button variant="ghost" size="sm">
            <Settings className="h-4 w-4 mr-1" />
            配置
          </Button>
        </div>

        {status?.lastCheckTime && (
          <div className="text-xs text-muted-foreground text-center">
            上次检查: {new Date(status.lastCheckTime).toLocaleTimeString()}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
