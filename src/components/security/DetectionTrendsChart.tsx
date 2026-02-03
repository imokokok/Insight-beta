'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { TrendingUp, Download } from 'lucide-react';

interface TrendData {
  date: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
}

interface TypeDistribution {
  name: string;
  value: number;
  color: string;
  [key: string]: string | number;
}

interface DetectionTrendsChartProps {
  className?: string;
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#ec4899'];

const typeColors: Record<string, string> = {
  flash_loan_attack: '#ef4444',
  price_manipulation: '#f97316',
  oracle_manipulation: '#eab308',
  sandwich_attack: '#3b82f6',
  front_running: '#8b5cf6',
  back_running: '#ec4899',
  liquidity_manipulation: '#06b6d4',
  statistical_anomaly: '#84cc16',
};

const typeLabels: Record<string, string> = {
  flash_loan_attack: '闪电贷攻击',
  price_manipulation: '价格操纵',
  oracle_manipulation: '预言机操纵',
  sandwich_attack: '三明治攻击',
  front_running: '抢先交易',
  back_running: '尾随交易',
  liquidity_manipulation: '流动性操纵',
  statistical_anomaly: '统计异常',
};

export function DetectionTrendsChart({ className }: DetectionTrendsChartProps) {
  const [trends, setTrends] = useState<TrendData[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<TypeDistribution[]>([]);
  const [severityDistribution, setSeverityDistribution] = useState<
    Array<{ name: string; value: number }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  useEffect(() => {
    fetchTrends();
  }, [timeRange]);

  const fetchTrends = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/security/trends?range=${timeRange}`);
      if (!response.ok) {
        throw new Error('Failed to fetch trends');
      }
      const data = await response.json();
      setTrends(data.trends || []);

      // Transform type distribution with colors
      const typedDist = (data.typeDistribution || []).map(
        (item: { name: string; value: number }, index: number) => ({
          ...item,
          color: typeColors[item.name] || COLORS[index % COLORS.length],
        }),
      );
      setTypeDistribution(typedDist);

      setSeverityDistribution(data.severityDistribution || []);
    } catch (error) {
      console.error('Error fetching trends:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const data = {
      trends,
      typeDistribution,
      severityDistribution,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detection-trends-${timeRange}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-64 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="text-muted-foreground h-5 w-5" />
          <CardTitle>检测趋势分析</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-muted flex items-center gap-1 rounded-lg p-1">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 text-xs"
                onClick={() => setTimeRange(range)}
              >
                {range === '7d' ? '7天' : range === '30d' ? '30天' : '90天'}
              </Button>
            ))}
          </div>
          <Button variant="outline" size="sm" className="h-7" onClick={exportData}>
            <Download className="mr-1 h-3 w-3" />
            导出
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trends">趋势图</TabsTrigger>
            <TabsTrigger value="types">类型分布</TabsTrigger>
            <TabsTrigger value="severity">严重程度</TabsTrigger>
          </TabsList>

          <TabsContent value="trends" className="space-y-4">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value: string) => {
                      const date = new Date(value);
                      return `${date.getMonth() + 1}/${date.getDate()}`;
                    }}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-background rounded-lg border p-3 shadow-lg">
                            <p className="mb-2 font-medium">{label}</p>
                            {payload.map((p, i) => (
                              <p key={i} className="text-sm" style={{ color: p.color }}>
                                {p.name}: {p.value}
                              </p>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="critical"
                    stackId="1"
                    stroke="#ef4444"
                    fill="#ef4444"
                    name="严重"
                  />
                  <Area
                    type="monotone"
                    dataKey="high"
                    stackId="1"
                    stroke="#f97316"
                    fill="#f97316"
                    name="高危"
                  />
                  <Area
                    type="monotone"
                    dataKey="medium"
                    stackId="1"
                    stroke="#eab308"
                    fill="#eab308"
                    name="中危"
                  />
                  <Area
                    type="monotone"
                    dataKey="low"
                    stackId="1"
                    stroke="#3b82f6"
                    fill="#3b82f6"
                    name="低危"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="types">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={typeDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: { name?: string; percent?: number }) =>
                      `${typeLabels[props.name || ''] || props.name || ''} ${((props.percent || 0) * 100).toFixed(0)}%`
                    }
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {typeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      value as number,
                      typeLabels[name as string] || (name as string),
                    ]}
                  />
                  <Legend formatter={(value: string) => typeLabels[value] || value} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="severity">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={severityDistribution}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip
                    formatter={(value, name) => {
                      const labels: Record<string, string> = {
                        critical: '严重',
                        high: '高危',
                        medium: '中危',
                        low: '低危',
                      };
                      return [value as number, labels[name as string] || (name as string)];
                    }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
