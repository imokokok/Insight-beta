'use client';

import { useMemo } from 'react';

import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui';
import { formatTime } from '@/shared/utils/format/date';
import { cn } from '@/shared/utils/ui';

interface Dispute {
  id: string;
  assertionId: string;
  status: string;
  disputedAt: string;
  settledAt?: string;
  resolutionResult?: boolean;
  votingPeriod?: number;
}

interface HistoricalDisputeStatsProps {
  disputes: Dispute[];
}

export function HistoricalDisputeStats({ disputes }: HistoricalDisputeStatsProps) {
  const monthlyStats = useMemo(() => {
    const stats: Record<
      string,
      { total: number; resolved: number; success: number; failed: number; avgVotingPeriod: number }
    > = {};

    disputes.forEach((dispute) => {
      const month = new Date(dispute.disputedAt).toISOString().slice(0, 7);
      if (!stats[month]) {
        stats[month] = { total: 0, resolved: 0, success: 0, failed: 0, avgVotingPeriod: 0 };
      }

      stats[month].total++;

      if (dispute.status === 'resolved' || dispute.status === 'settled') {
        stats[month].resolved++;
        if (dispute.resolutionResult === true) {
          stats[month].success++;
        } else if (dispute.resolutionResult === false) {
          stats[month].failed++;
        }
        if (dispute.votingPeriod) {
          stats[month].avgVotingPeriod += dispute.votingPeriod;
        }
      }
    });

    return Object.entries(stats)
      .map(([month, data]) => ({
        month,
        total: data.total,
        resolved: data.resolved,
        success: data.success,
        failed: data.failed,
        unresolved: data.total - data.resolved,
        avgVotingPeriod: data.resolved > 0 ? Math.round(data.avgVotingPeriod / data.resolved) : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6);
  }, [disputes]);

  const resolutionRateStats = useMemo(() => {
    const total = disputes.length;
    const resolved = disputes.filter(
      (d) => d.status === 'resolved' || d.status === 'settled',
    ).length;
    const rate = total > 0 ? (resolved / total) * 100 : 0;

    const avgResolutionTime =
      disputes
        .filter((d) => d.settledAt && (d.status === 'resolved' || d.status === 'settled'))
        .reduce((sum, d) => {
          const disputed = new Date(d.disputedAt).getTime();
          const settled = new Date(d.settledAt!).getTime();
          return sum + (settled - disputed);
        }, 0) / (resolved || 1);

    return {
      total,
      resolved,
      rate,
      avgResolutionTime: Math.round(avgResolutionTime / (1000 * 60 * 60)),
    };
  }, [disputes]);

  const votingPeriodStats = useMemo(() => {
    const disputesWithPeriod = disputes.filter((d) => d.votingPeriod);
    if (disputesWithPeriod.length === 0) return null;

    const periods = disputesWithPeriod.map((d) => d.votingPeriod!);
    const avg = periods.reduce((sum, p) => sum + p, 0) / periods.length;
    const max = Math.max(...periods);
    const min = Math.min(...periods);

    return { avg: Math.round(avg), max, min };
  }, [disputes]);

  const CustomTooltip = ({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: Array<{ value: number; name: string; color?: string }>;
    label?: string;
  }) => {
    if (active && payload && payload.length > 0) {
      return (
        <div className="rounded-lg border bg-white p-3 text-sm shadow-lg">
          <p className="mb-2 font-semibold text-gray-700">{label}</p>
          {payload.map((item, index) => (
            <div key={index} className="flex items-center gap-2 text-xs">
              <div
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: item.color || '#3b82f6' }}
              />
              <span className="text-gray-600">{item.name}:</span>
              <span className="font-semibold">{item.value}</span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  if (disputes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>历史争议统计</CardTitle>
          <CardDescription>争议解决趋势和成功率分析</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-sm text-gray-400">
            暂无争议数据
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>历史争议统计</CardTitle>
        <CardDescription>争议解决趋势和成功率分析</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">总争议数</div>
            <div className="text-xl font-bold">{resolutionRateStats.total}</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">已解决</div>
            <div className="text-xl font-bold">{resolutionRateStats.resolved}</div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">解决率</div>
            <div
              className={cn(
                'text-xl font-bold',
                resolutionRateStats.rate >= 80
                  ? 'text-green-600'
                  : resolutionRateStats.rate >= 50
                    ? 'text-yellow-600'
                    : 'text-red-600',
              )}
            >
              {resolutionRateStats.rate.toFixed(1)}%
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-3">
            <div className="text-xs text-gray-500">平均解决时间</div>
            <div className="text-xl font-bold">{resolutionRateStats.avgResolutionTime}h</div>
          </div>
        </div>

        {votingPeriodStats && (
          <div className="mb-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-blue-50 p-3">
              <div className="text-xs text-blue-600">平均投票周期</div>
              <div className="text-lg font-bold text-blue-700">{votingPeriodStats.avg}h</div>
            </div>
            <div className="rounded-lg bg-green-50 p-3">
              <div className="text-xs text-green-600">最短投票周期</div>
              <div className="text-lg font-bold text-green-700">{votingPeriodStats.min}h</div>
            </div>
            <div className="rounded-lg bg-red-50 p-3">
              <div className="text-xs text-red-600">最长投票周期</div>
              <div className="text-lg font-bold text-red-700">{votingPeriodStats.max}h</div>
            </div>
          </div>
        )}

        <div className="mb-6">
          <h4 className="mb-3 text-sm font-semibold">月度争议趋势</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar dataKey="total" name="总争议" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name="已解决" fill="#22c55e" radius={[4, 4, 0, 0]} />
                <Bar dataKey="unresolved" name="未解决" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div>
          <h4 className="mb-3 text-sm font-semibold">解决成功率趋势</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyStats}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} unit="%" />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Line
                  type="monotone"
                  dataKey="success"
                  name="成功"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="failed"
                  name="失败"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="avgVotingPeriod"
                  name="平均投票周期 (h)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="mb-3 text-sm font-semibold">最近争议记录</h4>
          <div className="max-h-64 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>争议 ID</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>结果</TableHead>
                  <TableHead>投票数</TableHead>
                  <TableHead>争议时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.slice(0, 10).map((dispute) => (
                  <TableRow key={dispute.id}>
                    <TableCell className="font-mono text-sm">
                      {dispute.id.slice(0, 8)}...{dispute.id.slice(-6)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          dispute.status === 'active'
                            ? 'secondary'
                            : dispute.status === 'resolved'
                              ? 'default'
                              : 'outline'
                        }
                      >
                        {dispute.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {dispute.resolutionResult !== undefined ? (
                        <Badge variant={dispute.resolutionResult ? 'success' : 'destructive'}>
                          {dispute.resolutionResult ? '成功' : '失败'}
                        </Badge>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {formatTime(dispute.disputedAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
