'use client';

import { useState, useMemo } from 'react';

import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Activity,
  Shield,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Info,
} from 'lucide-react';

import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Badge } from '@/components/ui/Badge';
import { Separator } from '@/components/ui/Separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,

import { cn } from '@/shared/utils';


import { cn, TrendIcon } from '@/shared/utils';

import type { OracleProtocol } from '@/types/oracle/protocol';

interface ProtocolComparison {
  protocol: OracleProtocol;
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  avgResponseTime: number;
  avgResolutionTime: number;
  alertRate: number;
  uptime: number;
  reliability: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

interface AlertTypeDistribution {
  type: string;
  chainlink: number;
  pyth: number;
  api3: number;
  band: number;
  uma: number;
}

interface CrossProtocolAlertComparisonProps {
  protocols?: OracleProtocol[];
  timeRange?: '24h' | '7d' | '30d';
  compact?: boolean;
}

const protocolIcons: Record<OracleProtocol, typeof Activity> = {
  chainlink: Activity,
  pyth: TrendingUp,
  api3: Shield,
  band: BarChart3,
  uma: AlertTriangle,
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

export function CrossProtocolAlertComparison({
  protocols = ['chainlink', 'pyth', 'api3', 'band', 'uma'],
  compact = false,
}: CrossProtocolAlertComparisonProps) {
  const [selectedMetric, setSelectedMetric] = useState<
    'totalAlerts' | 'avgResponseTime' | 'reliability'
  >('totalAlerts');

  const mockData: ProtocolComparison[] = useMemo(
    () => [
      {
        protocol: 'chainlink',
        totalAlerts: 45,
        activeAlerts: 3,
        resolvedAlerts: 42,
        avgResponseTime: 180,
        avgResolutionTime: 600,
        alertRate: 0.95,
        uptime: 99.8,
        reliability: 98.5,
        trend: 'stable',
        trendValue: 0,
      },
      {
        protocol: 'pyth',
        totalAlerts: 32,
        activeAlerts: 1,
        resolvedAlerts: 31,
        avgResponseTime: 240,
        avgResolutionTime: 720,
        alertRate: 0.92,
        uptime: 99.5,
        reliability: 97.8,
        trend: 'up',
        trendValue: 5.2,
      },
      {
        protocol: 'api3',
        totalAlerts: 28,
        activeAlerts: 2,
        resolvedAlerts: 26,
        avgResponseTime: 150,
        avgResolutionTime: 540,
        alertRate: 0.97,
        uptime: 99.9,
        reliability: 99.1,
        trend: 'down',
        trendValue: -3.1,
      },
      {
        protocol: 'band',
        totalAlerts: 15,
        activeAlerts: 0,
        resolvedAlerts: 15,
        avgResponseTime: 200,
        avgResolutionTime: 650,
        alertRate: 0.94,
        uptime: 99.6,
        reliability: 98.2,
        trend: 'stable',
        trendValue: 0,
      },
      {
        protocol: 'uma',
        totalAlerts: 8,
        activeAlerts: 1,
        resolvedAlerts: 7,
        avgResponseTime: 300,
        avgResolutionTime: 900,
        alertRate: 0.89,
        uptime: 99.2,
        reliability: 96.5,
        trend: 'up',
        trendValue: 8.5,
      },
    ],
    [],
  );

      { type: '价格', chainlink: 15, pyth: 12, api3: 10, band: 5, uma: 3 },
      { type: '心跳', chainlink: 10, pyth: 8, api3: 6, band: 4, uma: 2 },
      { type: '偏差', chainlink: 12, pyth: 7, api3: 8, band: 3, uma: 2 },
      { type: '延迟', chainlink: 5, pyth: 3, api3: 3, band: 2, uma: 1 },
      { type: '可用性', chainlink: 3, pyth: 2, api3: 1, band: 1, uma: 0 },
      { type: '延迟', chainlink: 5, pyth: 3, api3: 3, band: 2, uma: 1 },
    [],
    ],
    [],
  );

  const bestPerformer = useMemo(() => {
    return mockData.reduce((best, current) => {
      return current.reliability > best.reliability ? current : best;
    }, mockData[0]);
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <ArrowUpRight className="h-4 w-4 text-red-500" />;
      case 'down':
        return <ArrowDownRight className="h-4 w-4 text-green-500" />;
      case 'stable':
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  }, [mockData]);

  const getMetricValue = (data: ProtocolComparison, metric: string) => {
    switch (metric) {
      case 'totalAlerts':
        return data.totalAlerts;
      case 'avgResponseTime':
        return `${Math.round(data.avgResponseTime / 60)}min`;
      case 'reliability':
        return `${data.reliability.toFixed(1)}%`;
      default:
        return data.totalAlerts;
    }
  };

  const getMaxValue = (metric: string) => {
    switch (metric) {
      case 'totalAlerts':
        return Math.max(...mockData.map((d) => d.totalAlerts));
      case 'avgResponseTime':
        return Math.max(...mockData.map((d) => d.avgResponseTime));
      case 'reliability':
        return 100;
      default:
        return 100;
    }
  };

  if (compact) {
    return (
      <Card>
            <h3 className="text-sm font-semibold">跨协议告警对比</h3>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">跨协议告警对比</h3>
            <Select
              value={timeRange}
              onValueChange={(v) => {}}
            >
              <SelectTrigger className="h-8 w-24">
                <SelectValue />
                <SelectItem value="24h">24 小时</SelectItem>
                <SelectItem value="7d">7 天</SelectItem>
                <SelectItem value="30d">30 天</SelectItem>
                <SelectItem value="7d">7 天</SelectItem>
                <SelectItem value="30d">30 天</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-2">
            {mockData.map((data) => {
              const Icon = protocolIcons[data.protocol];
              return (
                <TooltipProvider key={data.protocol}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          'flex flex-col items-center gap-1 rounded-lg border p-2 transition-colors hover:bg-muted/50',
                          data.protocol === bestPerformer.protocol && 'border-green-500 bg-green-50',
                        )}
                      >
                        <Icon className={cn('h-4 w-4', protocolColors[data.protocol])} />
                        <span className="text-xs font-medium">
                          {data.protocol.toUpperCase()}
                        </span>
                        <span className="text-xs text-muted-foreground">{data.totalAlerts}</span>
                        {data.protocol === bestPerformer.protocol && (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>总告警：{data.totalAlerts}</p>
                        <p>活跃：{data.activeAlerts}</p>
                        <p>可靠性：{data.reliability.toFixed(1)}%</p>
                        <p>响应时间：{Math.round(data.avgResponseTime / 60)}分钟</p>
                        <p>可靠性：{data.reliability.toFixed(1)}%</p>
                        <p>响应时间：{Math.round(data.avgResponseTime / 60)}分钟</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
              <h3 className="text-lg font-semibold">跨协议告警对比分析</h3>
            <div>
                对比不同协议之间的告警情况和响应时间
              <p className="text-xs text-muted-foreground">
                对比不同协议之间的告警情况和响应时间
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={() => {}}>
                <SelectTrigger className="h-9 w-32">
                  <SelectValue />
                  <SelectItem value="24h">最近 24 小时</SelectItem>
                  <SelectItem value="7d">最近 7 天</SelectItem>
                  <SelectItem value="30d">最近 30 天</SelectItem>
                  <SelectItem value="7d">最近 7 天</SelectItem>
                  <SelectItem value="30d">最近 30 天</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={selectedMetric}
                onValueChange={(v) => setSelectedMetric(v as typeof selectedMetric)}
              >
                <SelectTrigger className="h-9 w-40">
                  <SelectValue />
                  <SelectItem value="totalAlerts">总告警数</SelectItem>
                  <SelectItem value="avgResponseTime">平均响应时间</SelectItem>
                  <SelectItem value="reliability">可靠性</SelectItem>
                  <SelectItem value="avgResponseTime">平均响应时间</SelectItem>
                  <SelectItem value="reliability">可靠性</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-5 gap-3">
              {mockData.map((data) => {
                const Icon = protocolIcons[data.protocol];
                const maxValue = getMaxValue(selectedMetric);
                const currentValue =
                  selectedMetric === 'avgResponseTime'
                    ? data.avgResponseTime
                    : selectedMetric === 'reliability'
                      ? data.reliability
                      : data.totalAlerts;
                const percentage = (currentValue / maxValue) * 100;

                return (
                  <motion.div
                    key={data.protocol}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Card
                      className={cn(
                        'relative overflow-hidden transition-all hover:shadow-md',
                        data.protocol === bestPerformer.protocol &&
                          'border-2 border-green-500 bg-green-50/50',
                      )}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className={cn('rounded p-2', protocolColors[data.protocol])}>
                            <Icon className="h-5 w-5 text-white" />
                          </div>
                          {data.protocol === bestPerformer.protocol && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="h-4 w-4 text-green-500" />
                                  <p>最佳表现</p>
                                <TooltipContent>
                                  <p>最佳表现</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        <div className="mt-3 space-y-2">
                          <h4 className="text-sm font-semibold">{data.protocol.toUpperCase()}</h4>
                          <div className="text-2xl font-bold">
                            {getMetricValue(data, selectedMetric)}
                            {getTrendIcon(data.trend)}
                          <div className="flex items-center gap-1 text-xs">
                            <TrendIcon trend={data.trend} />
                            <span
                              className={cn(
                                data.trend === 'up' && 'text-red-500',
                                data.trend === 'down' && 'text-green-500',
                                data.trend === 'stable' && 'text-gray-500',
                              )}
                            >
                              {data.trendValue !== 0 && `${data.trendValue > 0 ? '+' : ''}${data.trendValue}%`}
                            </span>
                          </div>
                          <div className="h-2 w-full rounded-full bg-muted">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${percentage}%` }}
                              transition={{ duration: 0.5, delay: 0.2 }}
                              className={cn(
                                'h-full rounded-full',
                                protocolColors[data.protocol],
                              )}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                  <h4 className="text-sm font-semibold">告警类型分布</h4>
                <CardHeader>
                  <h4 className="text-sm font-semibold">告警类型分布</h4>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {alertTypeDistribution.map((item) => (
                      <div key={item.type} className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            总计：{item.chainlink + item.pyth + item.api3 + item.band + item.uma}
                          <span className="text-muted-foreground">
                            总计：{item.chainlink + item.pyth + item.api3 + item.band + item.uma}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1">
                          {protocols.map((protocol) => {
                            const value = item[protocol as keyof Omit<AlertTypeDistribution, 'type'>] as number;
                            const maxValue = Math.max(
                              ...alertTypeDistribution.map(
                                (t) => t[protocol as keyof Omit<AlertTypeDistribution, 'type'>] as number,
                              ),
                            );
                            const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;

                            return (
                              <TooltipProvider key={protocol}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="relative h-8">
                                      <div
                                        className={cn(
                                          'absolute bottom-0 w-full rounded-t',
                                          protocolColors[protocol],
                                        )}
                                        style={{ height: `${percentage}%` }}
                                      />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {protocol.toUpperCase()}: {value}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

                  <h4 className="text-sm font-semibold">关键指标对比</h4>
                <CardHeader>
                  <h4 className="text-sm font-semibold">关键指标对比</h4>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                        <span className="font-medium">平均响应时间</span>
                        <span className="text-muted-foreground">越低越好</span>
                        <span className="font-medium">平均响应时间</span>
                        <span className="text-muted-foreground">越低越好</span>
                      </div>
                      <div className="space-y-1">
                        {mockData
                          .sort((a, b) => a.avgResponseTime - b.avgResponseTime)
                          .map((data, index) => (
                            <div key={data.protocol} className="flex items-center gap-2 text-xs">
                              <div className={cn('w-16 font-medium', protocolColors[data.protocol])}>
                                {data.protocol.toUpperCase()} #{index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="h-2 w-full rounded-full bg-muted">
                                  <div
                                    className={cn(
                                      'h-2 rounded-full',
                                      protocolColors[data.protocol],
                                    )}
                                    style={{
                                      width: `${(data.avgResponseTime / 300) * 100}%`,
                                    }}
                                  />
                                </div>
                              </div>
                              <span className="w-16 text-right font-medium">
                                {Math.round(data.avgResponseTime / 60)}min
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>

                    <Separator />

                        <span className="font-medium">可靠性评分</span>
                        <span className="text-muted-foreground">越高越好</span>
                        <span className="font-medium">可靠性评分</span>
                        <span className="text-muted-foreground">越高越好</span>
                      </div>
                      <div className="space-y-1">
                        {mockData
                          .sort((a, b) => b.reliability - a.reliability)
                          .map((data, index) => (
                            <div key={data.protocol} className="flex items-center gap-2 text-xs">
                              <div className={cn('w-16 font-medium', protocolColors[data.protocol])}>
                                {data.protocol.toUpperCase()} #{index + 1}
                              </div>
                              <div className="flex-1">
                                <div className="h-2 w-full rounded-full bg-muted">
                                  <div
                                    className={cn(
                                      'h-2 rounded-full',
                                      protocolColors[data.protocol],
                                    )}
                                    style={{ width: `${data.reliability}%` }}
                                  />
                                </div>
                              </div>
                              <span className="w-16 text-right font-medium">
                                {data.reliability.toFixed(1)}%
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
