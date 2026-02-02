'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  LineChart,
  Line,
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
import {
  TrendingUp,
  Calendar,
  Download,
  Filter,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

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
}

interface DetectionTrendsChartProps {
  className?: string;
}

const severityColors = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
};

const typeColors = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#6b7280',
];

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
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [trendData, setTrendData] = useState<TrendData[]>([]);
  const [typeDistribution, setTypeDistribution] = useState<TypeDistribution[]>([]);
  const [severityDistribution, setSeverityDistribution] = useState<TypeDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrendData();
  }, [timeRange]);

  const fetchTrendData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/security/trends?range=${timeRange}`);
      const data = await response.json();
      setTrendData(data.trends || []);
      setTypeDistribution(data.typeDistribution || []);
      setSeverityDistribution(data.severityDistribution || []);
    } catch (error) {
      console.error('Failed to fetch trend data:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportData = () => {
    const csvContent = [
      ['Date', 'Total', 'Critical', 'High', 'Medium', 'Low'].join(','),
      ...trendData.map((row) =>
        [row.date, row.total, row.critical, row.high, row.medium, row.low].join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `detection-trends-${timeRange}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            检测趋势分析
          </CardTitle>
          <div className="flex items-center gap-2">
            <div className="flex bg-muted rounded-lg p-1">
              {(['7d', '30d', '90d'] as const).map((range) => (
                <Button
                  key={range}
                  variant={timeRange === range ? 'secondary' : 'ghost'}
                  size="sm"
                  className="text-xs"
                  onClick={() => setTimeRange(range)}
                >
                  {range === '7d' ? '7天' : range === '30d' ? '30天' : '90天'}
                </Button>
              ))}
            </div>
            <Button variant="outline" size="icon" onClick={exportData}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue="trend" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="trend">趋势图</TabsTrigger>
            <TabsTrigger value="severity">严重程度分布</TabsTrigger>
            <TabsTrigger value="type">类型分布</TabsTrigger>
          </TabsList>

          <TabsContent value="trend" className="mt-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={severityColors.critical} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={severityColors.critical} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={severityColors.high} stopOpacity={0.8} />
                      <stop offset="95%" stopColor={severityColors.high} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) =>
                      new Date(value).toLocaleDateString('zh-CN', {
                        month: 'short',
                        day: 'numeric',
                      })
                    }
                  />
                  <YAxis />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px' }}
                    labelFormatter={(value) =>
                      new Date(value).toLocaleDateString('zh-CN', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })
                    }
                  />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="critical"
                    name="严重"
                    stroke={severityColors.critical}
                    fillOpacity={1}
                    fill="url(#colorCritical)"
                  />
                  <Area
                    type="monotone"
                    dataKey="high"
                    name="高危"
                    stroke={severityColors.high}
                    fillOpacity={1}
                    fill="url(#colorHigh)"
                  />
                  <Area
                    type="monotone"
                    dataKey="medium"
                    name="中危"
                    stroke={severityColors.medium}
                    fill={severityColors.medium}
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="low"
                    name="低危"
                    stroke={severityColors.low}
                    fill={severityColors.low}
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="severity" className="mt-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={severityDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {severityDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          severityColors[entry.name as keyof typeof severityColors] ||
                          typeColors[index % typeColors.length]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>

          <TabsContent value="type" className="mt-4">
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={typeDistribution}
                  layout="vertical"
                  margin={{ left: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tickFormatter={(value) => typeLabels[value] || value}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      value,
                      typeLabels[name] || name,
                    ]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {typeDistribution.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={typeColors[index % typeColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
