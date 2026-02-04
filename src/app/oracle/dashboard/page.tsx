/**
 * Unified Oracle Dashboard
 *
 * 通用预言机监控平台主仪表板
 */

'use client';

import { useEffect, useState } from 'react';
import { logger } from '@/lib/logger';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Activity, AlertTriangle, Globe, Zap, BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ============================================================================
// 主组件
// ============================================================================

export default function UnifiedDashboardPage() {
  const [wsConnected, setWsConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // WebSocket 连接
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;
    let isUnmounting = false;

    const connect = () => {
      if (isUnmounting) return;

      try {
        const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (isUnmounting) {
            ws?.close();
            return;
          }
          setWsConnected(true);
          reconnectAttempts = 0;
        };

        ws.onclose = () => {
          if (isUnmounting) return;
          setWsConnected(false);
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            reconnectAttempts++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            reconnectTimeout = setTimeout(connect, delay);
          }
        };

        ws.onerror = (error) => {
          logger.error('WebSocket error', { error });
        };
      } catch (error) {
        logger.error('WebSocket connection error', { error });
      }
    };

    connect();
    setLoading(false);

    return () => {
      isUnmounting = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

  return (
    <div className="container mx-auto p-6">
      {/* 页面头部 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Oracle Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Monitor prices across multiple oracle protocols
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={wsConnected ? 'default' : 'destructive'}>
            {wsConnected ? 'Connected' : 'Disconnected'}
          </Badge>
          <Button variant="outline" size="icon" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 统计卡片 */}
      <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Protocols</CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">9</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Price Feeds</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">150+</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">500ms</div>
          </CardContent>
        </Card>
      </div>

      {/* 主内容区 */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="overview">
            <Zap className="mr-2 h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="protocols">
            <Globe className="mr-2 h-4 w-4" />
            Protocols
          </TabsTrigger>
          <TabsTrigger value="alerts">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Platform Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Welcome to the Universal Oracle Monitoring Platform. This dashboard provides
                real-time monitoring, price comparison, and analytics across 9+ oracle protocols.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="protocols" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Supported Protocols</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                <li>Chainlink</li>
                <li>Pyth Network</li>
                <li>UMA</li>
                <li>Band Protocol</li>
                <li>API3</li>
                <li>RedStone</li>
                <li>Switchboard</li>
                <li>Flux</li>
                <li>DIA</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle>Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No active alerts at this time.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
