'use client';

import { useState, useMemo } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell,
  AlertTriangle,
  Activity,
  Shield,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3,
  RefreshCw,
  Download,
  Settings,
  Plus,
  Edit2,
  Trash2,
  Play,
  Pause,
} from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/Select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

import { useI18n } from '@/i18n/LanguageProvider';
import { cn, formatTime } from '@/shared/utils';

import type { OracleProtocol } from '@/types/oracle/protocol';
import type { AlertSeverity, AlertStatus } from '@/types/oracle/alert';

export type AlertType =
  | 'price'
  | 'heartbeat'
  | 'deviation'
  | 'latency'
  | 'availability'
  | 'quality'
  | 'custom';

export interface AlertRule {
  id: string;
  name: string;
  protocol: OracleProtocol | 'all';
  type: AlertType;
  severity: AlertSeverity;
  enabled: boolean;
  condition: string;
  threshold: number;
  channels: string[];
  createdAt: string;
  updatedAt: string;
  triggeredCount: number;
  lastTriggeredAt?: string;
}

export interface AlertHistory {
  id: string;
  ruleId: string;
  ruleName: string;
  protocol: OracleProtocol;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  triggeredAt: string;
  resolvedAt?: string;
  status: AlertStatus;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: 'webhook' | 'email' | 'telegram' | 'slack' | 'discord';
  config: Record<string, string>;
  enabled: boolean;
  lastUsedAt?: string;
}

interface ProtocolAlertStats {
  protocol: OracleProtocol | 'all';
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  avgResponseTime: number;
  last24h: number;
  last7d: number;
}

interface UnifiedAlertPanelProps {
  protocols?: OracleProtocol[];
  compact?: boolean;
  onAlertClick?: (alert: AlertHistory) => void;
}

const protocolIcons: Record<OracleProtocol, typeof Activity> = {
  chainlink: Activity,
  pyth: TrendingUp,
  api3: Shield,
  band: BarChart3,
  uma: AlertCircle,
  redstone: Activity,
};

const protocolColors: Record<OracleProtocol, string> = {
  chainlink: 'bg-blue-500',
  pyth: 'bg-purple-500',
  api3: 'bg-green-500',
  band: 'bg-orange-500',
  uma: 'bg-red-500',
  redstone: 'bg-pink-500',
};

const alertTypeIcons: Record<AlertType, typeof AlertTriangle> = {
  price: TrendingUp,
  heartbeat: Clock,
  deviation: AlertTriangle,
  latency: Activity,
  availability: Shield,
  quality: CheckCircle,
  custom: Settings,
};

const severityConfig: Record<AlertSeverity, { color: string; bgColor: string; label: string }> = {
  critical: {
    color: 'text-red-600',
    bgColor: 'bg-red-500',
    label: '严重',
  },
  high: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-500',
    label: '高',
  },
  medium: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-500',
    label: '中',
  },
  low: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-500',
    label: '低',
  },
};

const statusConfig: Record<AlertStatus, { color: string; label: string }> = {
  active: { color: 'text-red-600', label: '活跃' },
  investigating: { color: 'text-yellow-600', label: '调查中' },
  resolved: { color: 'text-green-600', label: '已解决' },
};

export function UnifiedAlertPanel({
  protocols = ['chainlink', 'pyth', 'api3', 'band', 'uma'],
  compact = false,
  onAlertClick,
}: UnifiedAlertPanelProps) {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState<'overview' | 'rules' | 'history' | 'settings'>(
    'overview',
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProtocol, setFilterProtocol] = useState<OracleProtocol | 'all'>('all');
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<AlertStatus | 'all'>('all');
  const [selectedRule, setSelectedRule] = useState<AlertRule | null>(null);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30);

  const mockRules: AlertRule[] = useMemo(
    () => [
      {
        id: '1',
        name: 'BTC 价格偏差告警',
        protocol: 'chainlink',
        type: 'deviation',
        severity: 'high',
        enabled: true,
        condition: 'deviation > 5%',
        threshold: 5,
        channels: ['email', 'telegram'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        triggeredCount: 12,
        lastTriggeredAt: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: '2',
        name: 'ETH 心跳超时',
        protocol: 'pyth',
        type: 'heartbeat',
        severity: 'critical',
        enabled: true,
        condition: 'heartbeat > 300s',
        threshold: 300,
        channels: ['webhook', 'slack'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        triggeredCount: 3,
        lastTriggeredAt: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: '3',
        name: 'API3 延迟告警',
        protocol: 'api3',
        type: 'latency',
        severity: 'medium',
        enabled: false,
        condition: 'latency > 1000ms',
        threshold: 1000,
        channels: ['email'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        triggeredCount: 25,
        lastTriggeredAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ],
    [],
  );

  const mockHistory: AlertHistory[] = useMemo(
    () => [
      {
        id: 'h1',
        ruleId: '1',
        ruleName: 'BTC 价格偏差告警',
        protocol: 'chainlink',
        type: 'deviation',
        severity: 'high',
        title: 'BTC/USD 价格偏差超过阈值',
        message: 'BTC/USD 价格偏差达到 5.2%，超过设定的 5% 阈值',
        triggeredAt: new Date(Date.now() - 3600000).toISOString(),
        status: 'active',
        metadata: { symbol: 'BTC/USD', deviation: 0.052, threshold: 0.05 },
      },
      {
        id: 'h2',
        ruleId: '2',
        ruleName: 'ETH 心跳超时',
        protocol: 'pyth',
        type: 'heartbeat',
        severity: 'critical',
        title: 'ETH 价格更新超时',
        message: 'ETH 价格超过 300 秒未更新',
        triggeredAt: new Date(Date.now() - 7200000).toISOString(),
        resolvedAt: new Date(Date.now() - 3600000).toISOString(),
        status: 'resolved',
        acknowledgedBy: 'system',
        acknowledgedAt: new Date(Date.now() - 6000000).toISOString(),
        metadata: { symbol: 'ETH/USD', heartbeat: 320 },
      },
    ],
    [],
  );

  const mockStats: ProtocolAlertStats[] = useMemo(
    () => [
      {
        protocol: 'chainlink',
        totalAlerts: 45,
        activeAlerts: 3,
        resolvedAlerts: 42,
        avgResponseTime: 180,
        last24h: 5,
        last7d: 15,
      },
      {
        protocol: 'pyth',
        totalAlerts: 32,
        activeAlerts: 1,
        resolvedAlerts: 31,
        avgResponseTime: 240,
        last24h: 2,
        last7d: 8,
      },
      {
        protocol: 'api3',
        totalAlerts: 28,
        activeAlerts: 2,
        resolvedAlerts: 26,
        avgResponseTime: 150,
        last24h: 3,
        last7d: 10,
      },
      {
        protocol: 'band',
        totalAlerts: 15,
        activeAlerts: 0,
        resolvedAlerts: 15,
        avgResponseTime: 200,
        last24h: 1,
        last7d: 4,
      },
      {
        protocol: 'uma',
        totalAlerts: 8,
        activeAlerts: 1,
        resolvedAlerts: 7,
        avgResponseTime: 300,
        last24h: 2,
        last7d: 3,
      },
    ],
    [],
  );

  const filteredRules = useMemo(() => {
    return mockRules.filter((rule) => {
      if (filterProtocol !== 'all' && rule.protocol !== filterProtocol) return false;
      if (filterSeverity !== 'all' && rule.severity !== filterSeverity) return false;
      if (searchQuery && !rule.name.toLowerCase().includes(searchQuery.toLowerCase()))
        return false;
      return true;
    });
  }, [mockRules, filterProtocol, filterSeverity, searchQuery]);

  const filteredHistory = useMemo(() => {
    return mockHistory.filter((alert) => {
      if (filterProtocol !== 'all' && alert.protocol !== filterProtocol) return false;
      if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
      if (filterStatus !== 'all' && alert.status !== filterStatus) return false;
      if (
        searchQuery &&
        !alert.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !alert.message.toLowerCase().includes(searchQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [mockHistory, filterProtocol, filterSeverity, filterStatus, searchQuery]);

  const handleCreateRule = useCallback(() => {
    setSelectedRule(null);
    setIsEditing(false);
    setIsRuleDialogOpen(true);
  }, []);

  const handleEditRule = useCallback((rule: AlertRule) => {
    setSelectedRule(rule);
    setIsEditing(true);
    setIsRuleDialogOpen(true);
  }, []);

  const handleDeleteRule = useCallback((ruleId: string) => {
    console.log('Delete rule:', ruleId);

  const handleToggleRule = useCallback((_ruleId: string, _enabled: boolean) => {}, []);
  const handleToggleRule = useCallback((ruleId: string, enabled: boolean) => {
    console.log('Toggle rule:', ruleId, enabled);
  const activeAlerts = useMemo(
    () => mockStats.reduce((sum, stat) => sum + stat.activeAlerts, 0),
  const totalAlerts = useMemo(
    () => mockStats.reduce((sum, stat) => sum + stat.totalAlerts, 0),
    [mockStats],
  );
    [mockStats],
  );

  if (compact) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <h3 className="text-base font-semibold">{t('alerts.unifiedPanel.title')}</h3>
            </div>
            <Badge variant="secondary">{activeAlerts} 活跃</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {protocols.map((protocol) => {
              const stats = mockStats.find((s) => s.protocol === protocol);
              const Icon = protocolIcons[protocol];
              return (
                <TooltipProvider key={protocol}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex flex-col items-center gap-1 rounded-lg border p-2 hover:bg-muted/50">
                        <Icon className={cn('h-4 w-4', protocolColors[protocol])} />
                        <span className="text-xs font-medium">{protocol.toUpperCase()}</span>
                        <span className="text-xs text-muted-foreground">
                          {stats?.activeAlerts ?? 0}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {protocol.toUpperCase()}: {stats?.activeAlerts ?? 0} 活跃告警
                      <p>{protocol.toUpperCase()}: {stats?.activeAlerts ?? 0} 活跃告警</p>
                </TooltipProvider>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="w-full space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <div>
                <h3 className="text-lg font-semibold">{t('alerts.unifiedPanel.title')}</h3>
                <p className="text-xs text-muted-foreground">
                  {t('alerts.unifiedPanel.description')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setAutoRefresh(!autoRefresh)}
                    >
                      {autoRefresh ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{autoRefresh ? '暂停自动刷新' : '启用自动刷新'}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm">
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>刷新</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>导出</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {mockStats.map((stat) => {
              const Icon = protocolIcons[stat.protocol as OracleProtocol];
              return (
                <div
                  key={stat.protocol}
                  className="rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className={cn('rounded p-1', protocolColors[stat.protocol as OracleProtocol])}
                    <div className={cn('rounded p-1', protocolColors[stat.protocol as OracleProtocol])}>
                    <span className="text-xs font-semibold">
                      {stat.protocol === 'all' ? '全部' : stat.protocol.toUpperCase()}
                    </span>
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">总告警</span>
                      <span className="font-medium">{stat.totalAlerts}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">活跃</span>
                      <Badge
                        variant={stat.activeAlerts > 0 ? 'destructive' : 'secondary'}
                        size="sm"
                      >
                        {stat.activeAlerts}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">24h</span>
                      <span className="font-medium">{stat.last24h}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">概览</TabsTrigger>
          <TabsTrigger value="rules">规则</TabsTrigger>
          <TabsTrigger value="history">历史</TabsTrigger>
          <TabsTrigger value="settings">设置</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <h4 className="text-sm font-semibold">实时告警监控</h4>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {mockHistory.slice(0, 5).map((alert) => {
                  const Icon = alertTypeIcons[alert.type];
                  const severity = severityConfig[alert.severity];
                  const status = statusConfig[alert.status];
                  return (
                    <div
                      key={alert.id}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50',
                        alert.status === 'active' && 'border-red-200 bg-red-50/50',
                      )}
                      onClick={() => onAlertClick?.(alert)}
                    >
                      <div className={cn('rounded p-2', severity.bgColor)}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <h5 className="text-sm font-medium">{alert.title}</h5>
                          <Badge className={severity.bgColor}>{severity.label}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{alert.message}</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(alert.triggeredAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {alert.protocol.toUpperCase()}
                          </span>
                          <Badge variant="outline" className={status.color}>
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Input
                placeholder="搜索规则..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-64"
              />
              <Select
                value={filterProtocol}
                onValueChange={(v) => setFilterProtocol(v as OracleProtocol | 'all')}
              >
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部协议</SelectItem>
                  {protocols.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p.toUpperCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreateRule}>
              <Plus className="mr-2 h-4 w-4" />
              新建规则
            </Button>
          </div>

          <div className="space-y-2">
            {filteredRules.map((rule) => {
              const Icon = alertTypeIcons[rule.type];
              const severity = severityConfig[rule.severity];
              return (
                <Card key={rule.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={cn('rounded p-2', severity.bgColor)}>
                          <Icon className="h-4 w-4 text-white" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-medium">{rule.name}</h5>
                            <Badge variant="outline">{rule.protocol.toUpperCase()}</Badge>
                            <Badge className={severity.bgColor}>{severity.label}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">{rule.condition}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span>触发：{rule.triggeredCount}次</span>
                            {rule.lastTriggeredAt && (
                              <span>最近：{formatTime(rule.lastTriggeredAt)}</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(checked) => handleToggleRule(rule.id, checked)}
                        />
                        <Button variant="ghost" size="sm" onClick={() => handleEditRule(rule)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteRule(rule.id)}>
                          <Trash2 className="h-4 w-4" />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteRule(rule.id)}
                        >
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              placeholder="搜索历史记录..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-64"
            />
            <Select
              value={filterProtocol}
              onValueChange={(v) => setFilterProtocol(v as OracleProtocol | 'all')}
            >
              <SelectTrigger className="h-9 w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部协议</SelectItem>
                {protocols.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterSeverity}
              onValueChange={(v) => setFilterSeverity(v as AlertSeverity | 'all')}
            >
              <SelectTrigger className="h-9 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部级别</SelectItem>
                <SelectItem value="critical">严重</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filterStatus}
              onValueChange={(v) => setFilterStatus(v as AlertStatus | 'all')}
            >
              <SelectTrigger className="h-9 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">活跃</SelectItem>
                <SelectItem value="investigating">调查中</SelectItem>
                <SelectItem value="resolved">已解决</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {filteredHistory.map((alert) => {
              const Icon = alertTypeIcons[alert.type];
              const severity = severityConfig[alert.severity];
              const status = statusConfig[alert.status];
              return (
                <Card key={alert.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('rounded p-2', severity.bgColor)}>
                        <Icon className="h-4 w-4 text-white" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium">{alert.title}</h5>
                          <div className="flex items-center gap-2">
                            <Badge className={severity.bgColor}>{severity.label}</Badge>
                            <Badge variant="outline" className={status.color}>
                              {status.label}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">{alert.message}</p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            触发：{formatTime(alert.triggeredAt)}
                          </span>
                          {alert.resolvedAt && (
                            <span className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              解决：{formatTime(alert.resolvedAt)}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Activity className="h-3 w-3" />
                            {alert.protocol.toUpperCase()}
                          </span>
                          <span>{alert.ruleName}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <h4 className="text-sm font-semibold">通知渠道配置</h4>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Webhook URL</Label>
                <Input placeholder="https://your-webhook.com/alerts" />
              </div>
              <div className="space-y-2">
                <Label>邮箱地址</Label>
                <Input type="email" placeholder="alerts@example.com" />
              </div>
              <div className="space-y-2">
                <Label>Telegram Chat ID</Label>
                <Input placeholder="@your_channel" />
              </div>
              <Button className="w-full">保存配置</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <h4 className="text-sm font-semibold">刷新设置</h4>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>自动刷新</Label>
                <Switch checked={autoRefresh} onCheckedChange={setAutoRefresh} />
              </div>
              <div className="space-y-2">
                <Label>刷新间隔（秒）</Label>
                <Select
                  value={refreshInterval.toString()}
                  onValueChange={(v) => setRefreshInterval(Number(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10 秒</SelectItem>
                    <SelectItem value="30">30 秒</SelectItem>
                    <SelectItem value="60">60 秒</SelectItem>
                    <SelectItem value="300">5 分钟</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isRuleDialogOpen} onOpenChange={setIsRuleDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{isEditing ? '编辑告警规则' : '新建告警规则'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>规则名称</Label>
              <Input placeholder="例如：BTC 价格偏差告警" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>协议</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="选择协议" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部协议</SelectItem>
                    {protocols.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>告警类型</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="price">价格</SelectItem>
                    <SelectItem value="heartbeat">心跳</SelectItem>
                    <SelectItem value="deviation">偏差</SelectItem>
                    <SelectItem value="latency">延迟</SelectItem>
                    <SelectItem value="availability">可用性</SelectItem>
                    <SelectItem value="quality">质量</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>严重程度</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">严重</SelectItem>
                    <SelectItem value="high">高</SelectItem>
                    <SelectItem value="medium">中</SelectItem>
                    <SelectItem value="low">低</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>阈值</Label>
                <Input type="number" placeholder="例如：5" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>触发条件</Label>
              <Textarea placeholder="例如：deviation > 5%" />
            </div>
            <div className="space-y-2">
              <Label>通知渠道</Label>
              <div className="flex gap-2">
                <Badge variant="outline" className="cursor-pointer">
                  邮箱
                </Badge>
                <Badge variant="outline" className="cursor-pointer">
                  Webhook
                </Badge>
                <Badge variant="outline" className="cursor-pointer">
                  Telegram
                </Badge>
                <Badge variant="outline" className="cursor-pointer">
                  Slack
                </Badge>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsRuleDialogOpen(false)}>
                取消
              </Button>
              <Button>保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
