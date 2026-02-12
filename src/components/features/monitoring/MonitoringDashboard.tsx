/**
 * Monitoring Dashboard Component
 *
 * 监控 Dashboard 组件，展示系统状态和告警配置
 */

'use client';

import React, { useState, useEffect } from 'react';

import {
  Bell,
  Mail,
  Webhook,
  MessageSquare,
  Send,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Settings,
  Activity,
} from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { usePageOptimizations } from '@/hooks/usePageOptimizations';
import { logger } from '@/lib/logger';

interface MonitoringStats {
  alerts: {
    total: number;
    cooldownActive: number;
    channels: {
      email: boolean;
      webhook: boolean;
      slack: boolean;
      telegram: boolean;
    };
  };
  notifications: {
    channels: string[];
    configured: {
      email: boolean;
      webhook: boolean;
      slack: boolean;
      telegram: boolean;
    };
  };
  system: {
    nodeEnv: string;
    timestamp: string;
  };
}

interface AlertConfig {
  channels: {
    email: boolean;
    webhook: boolean;
    slack: boolean;
    telegram: boolean;
  };
  cooldownMs: number;
}

export function MonitoringDashboard() {
  const [stats, setStats] = useState<MonitoringStats | null>(null);
  const [config, setConfig] = useState<AlertConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [testingChannel, setTestingChannel] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // 获取监控数据
  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statsRes, configRes] = await Promise.all([
        fetch('/api/monitoring/dashboard'),
        fetch('/api/monitoring/config'),
      ]);

      if (!statsRes.ok || !configRes.ok) {
        throw new Error('Failed to fetch monitoring data');
      }

      const statsData = await statsRes.json();
      const configData = await configRes.json();

      setStats(statsData);
      setConfig(configData);
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

  // 页面优化：键盘快捷键
  usePageOptimizations({
    pageName: '监控面板',
    onRefresh: async () => {
      await fetchData();
    },
    enableSearch: false,
    showRefreshToast: true,
  });

  // 测试通知渠道
  const testChannel = async (channel: string) => {
    try {
      setTestingChannel(channel);
      setTestResult(null);

      const response = await fetch('/api/monitoring/test-notification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel }),
      });

      const data = await response.json();

      if (response.ok) {
        setTestResult({ success: true, message: `Test notification sent via ${channel}` });
      } else {
        setTestResult({ success: false, message: data.message || `Failed to send via ${channel}` });
      }
    } catch (error: unknown) {
      setTestResult({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send test notification',
      });
    } finally {
      setTestingChannel(null);
    }
  };

  // 更新配置
  const updateConfig = async (newConfig: Partial<AlertConfig>) => {
    try {
      setSaving(true);

      const response = await fetch('/api/monitoring/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });

      if (!response.ok) {
        throw new Error('Failed to update config');
      }

      // 刷新数据
      await fetchData();
    } catch (error: unknown) {
      logger.error('Failed to update config', { error });
      setError(error instanceof Error ? error.message : 'Failed to update config');
    } finally {
      setSaving(false);
    }
  };

  // 切换渠道启用状态
  const toggleChannel = (channel: keyof AlertConfig['channels']) => {
    if (!config) return;

    const newChannels = {
      ...config.channels,
      [channel]: !config.channels[channel],
    };

    setConfig({ ...config, channels: newChannels });
    updateConfig({ channels: newChannels });
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (!stats || !config) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>No Data</AlertTitle>
        <AlertDescription>No monitoring data available</AlertDescription>
      </Alert>
    );
  }

  const channelIcons: Record<string, React.ReactNode> = {
    email: <Mail className="h-5 w-5" />,
    webhook: <Webhook className="h-5 w-5" />,
    slack: <MessageSquare className="h-5 w-5" />,
    telegram: <Send className="h-5 w-5" />,
  };

  return (
    <div className="space-y-6">
      {/* 测试通知结果 */}
      {testResult && (
        <Alert variant={testResult.success ? 'default' : 'destructive'}>
          {testResult.success ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          <AlertTitle>{testResult.success ? 'Success' : 'Error'}</AlertTitle>
          <AlertDescription>{testResult.message}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">
            <Activity className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="channels">
            <Bell className="mr-2 h-4 w-4" />
            Channels
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        {/* 概览 Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
                <Bell className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.alerts.total}</div>
                <p className="text-muted-foreground text-xs">All time alerts sent</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Cooldowns</CardTitle>
                <AlertTriangle className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.alerts.cooldownActive}</div>
                <p className="text-muted-foreground text-xs">Alerts in cooldown period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Configured Channels</CardTitle>
                <CheckCircle className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.notifications.channels.length}</div>
                <p className="text-muted-foreground text-xs">
                  {stats.notifications.channels.join(', ') || 'None'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Environment</CardTitle>
                <Settings className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold capitalize">{stats.system.nodeEnv}</div>
                <p className="text-muted-foreground text-xs">Current deployment</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>System Status</CardTitle>
              <CardDescription>Current monitoring system status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Last Updated</span>
                <span className="text-muted-foreground text-sm">
                  {new Date(stats.system.timestamp).toLocaleString()}
                </span>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Active Channels</span>
                <div className="flex gap-2">
                  {Object.entries(config.channels)
                    .filter(([, enabled]) => enabled)
                    .map(([channel]) => (
                      <Badge key={channel} variant="default">
                        {channel}
                      </Badge>
                    ))}
                  {!Object.values(config.channels).some(Boolean) && (
                    <span className="text-muted-foreground text-sm">None</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 渠道 Tab */}
        <TabsContent value="channels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>Configure and test notification channels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {(['email', 'webhook', 'slack', 'telegram'] as const).map((channel) => {
                const isConfigured = stats.notifications.configured[channel];
                const isEnabled = config.channels[channel];

                return (
                  <div
                    key={channel}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="bg-muted rounded-md p-2">{channelIcons[channel]}</div>
                      <div>
                        <h4 className="font-medium capitalize">{channel}</h4>
                        <div className="mt-1 flex items-center gap-2">
                          {isConfigured ? (
                            <Badge variant="default" className="text-xs">
                              Configured
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs">
                              Not Configured
                            </Badge>
                          )}
                          {isEnabled && (
                            <Badge variant="outline" className="text-xs">
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center space-x-2">
                        <Switch
                          id={`${channel}-toggle`}
                          checked={isEnabled}
                          onCheckedChange={() => toggleChannel(channel)}
                          disabled={!isConfigured || saving}
                        />
                        <Label htmlFor={`${channel}-toggle`} className="sr-only">
                          Enable {channel}
                        </Label>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testChannel(channel)}
                        disabled={testingChannel === channel || !isConfigured}
                      >
                        {testingChannel === channel ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Test
                      </Button>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* 配置说明 */}
          <Card>
            <CardHeader>
              <CardTitle>Configuration Guide</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-4 text-sm">
              <p>
                <strong>Email:</strong> Configure SMTP settings (INSIGHT_SMTP_HOST,
                INSIGHT_SMTP_USER, etc.)
              </p>
              <p>
                <strong>Webhook:</strong> Set INSIGHT_WEBHOOK_URL to receive HTTP POST notifications
              </p>
              <p>
                <strong>Slack:</strong> Create a Slack app and set INSIGHT_SLACK_WEBHOOK_URL
              </p>
              <p>
                <strong>Telegram:</strong> Create a bot with @BotFather and set
                INSIGHT_TELEGRAM_BOT_TOKEN
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 设置 Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Alert Settings</CardTitle>
              <CardDescription>Configure alert behavior</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Cooldown Period</h4>
                  <p className="text-muted-foreground text-sm">
                    Time between duplicate alerts (default: 5 minutes)
                  </p>
                </div>
                <Badge variant="outline">{Math.round(config.cooldownMs / 1000 / 60)} minutes</Badge>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Reset Alert History</h4>
                  <p className="text-muted-foreground text-sm">
                    Clear all alert history and cooldown timers
                  </p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (confirm('Are you sure you want to reset alert history?')) {
                      await fetch('/api/monitoring/config', { method: 'DELETE' });
                      await fetchData();
                    }
                  }}
                >
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={fetchData} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Data
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
