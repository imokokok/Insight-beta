'use client';

import { useMemo, useState } from 'react';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui';
import { formatTime } from '@/shared/utils/format/date';
import { cn } from '@/shared/utils/ui';

interface Vote {
  voter: string;
  support: boolean;
  votingPower: string;
  timestamp: string;
  txHash: string;
}

interface DisputeWithVotes {
  id: string;
  assertionId: string;
  votes: Vote[];
  votingEndsAt: string | null;
  status: string;
}

interface VotingAnalysisPanelProps {
  disputes: DisputeWithVotes[];
}

const COLORS = {
  support: '#22c55e',
  oppose: '#ef4444',
};

export function VotingAnalysisPanel({ disputes }: VotingAnalysisPanelProps) {
  const [selectedDisputeId, setSelectedDisputeId] = useState<string | null>(
    disputes[0]?.id || null,
  );

  const selectedDispute = useMemo(() => {
    return disputes.find((d) => d.id === selectedDisputeId) || null;
  }, [disputes, selectedDisputeId]);

  const votingStats = useMemo(() => {
    if (!selectedDispute) return null;

    const votes = selectedDispute.votes;
    const supportVotes = votes.filter((v) => v.support);
    const opposeVotes = votes.filter((v) => !v.support);

    const totalVotingPower = votes.reduce((sum, v) => sum + Number(v.votingPower), 0);
    const supportVotingPower = supportVotes.reduce((sum, v) => sum + Number(v.votingPower), 0);
    const opposeVotingPower = opposeVotes.reduce((sum, v) => sum + Number(v.votingPower), 0);

    return {
      totalVotes: votes.length,
      supportCount: supportVotes.length,
      opposeCount: opposeVotes.length,
      totalVotingPower,
      supportVotingPower,
      opposeVotingPower,
      supportPercentage: totalVotingPower > 0 ? (supportVotingPower / totalVotingPower) * 100 : 0,
      opposePercentage: totalVotingPower > 0 ? (opposeVotingPower / totalVotingPower) * 100 : 0,
    };
  }, [selectedDispute]);

  const pieChartData = useMemo(() => {
    if (!votingStats) return [];

    return [
      { name: 'Support', value: votingStats.supportCount, color: COLORS.support },
      { name: 'Oppose', value: votingStats.opposeCount, color: COLORS.oppose },
    ].filter((item) => item.value > 0);
  }, [votingStats]);

  const votingPowerChartData = useMemo(() => {
    if (!votingStats) return [];

    return [
      { name: 'Support', value: votingStats.supportVotingPower, color: COLORS.support },
      { name: 'Oppose', value: votingStats.opposeVotingPower, color: COLORS.oppose },
    ];
  }, [votingStats]);

  const voterDistribution = useMemo(() => {
    if (!selectedDispute) return [];

    const distribution: Record<number, number> = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    selectedDispute.votes.forEach((vote) => {
      const power = Number(vote.votingPower);
      if (power <= 100) distribution[1] = (distribution[1] || 0) + 1;
      else if (power <= 500) distribution[2] = (distribution[2] || 0) + 1;
      else if (power <= 1000) distribution[3] = (distribution[3] || 0) + 1;
      else if (power <= 5000) distribution[4] = (distribution[4] || 0) + 1;
      else distribution[5] = (distribution[5] || 0) + 1;
    });

    return [
      { range: '≤100', count: distribution[1] },
      { range: '100-500', count: distribution[2] },
      { range: '500-1K', count: distribution[3] },
      { range: '1K-5K', count: distribution[4] },
      { range: '≥5K', count: distribution[5] },
    ];
  }, [selectedDispute]);

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ name: string; value: number; payload: { color: string } }>;
  }) => {
    if (active && payload && payload.length > 0) {
      const item = payload[0];
      if (!item) return null;
      return (
        <div className="rounded-lg border bg-white p-3 text-sm shadow-lg">
          <p className="mb-1 font-semibold" style={{ color: item.payload.color }}>
            {item.name}
          </p>
          <p className="text-gray-600">数量：{item.value}</p>
        </div>
      );
    }
    return null;
  };

  if (disputes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>投票分析</CardTitle>
          <CardDescription>争议投票详情统计</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex h-64 items-center justify-center text-sm text-gray-400">
            暂无投票数据
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>投票分析</CardTitle>
        <CardDescription>争议投票详情统计</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 flex flex-wrap gap-2">
          {disputes.map((dispute) => (
            <Badge
              key={dispute.id}
              variant={selectedDisputeId === dispute.id ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedDisputeId(dispute.id)}
            >
              争议 #{dispute.id.slice(0, 8)}
            </Badge>
          ))}
        </div>

        {selectedDispute && votingStats && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-lg bg-gray-50 p-4 text-center">
                <div className="text-2xl font-bold">{votingStats.totalVotes}</div>
                <div className="text-xs text-gray-500">总投票数</div>
              </div>
              <div className="rounded-lg bg-green-50 p-4 text-center">
                <div className="text-2xl font-bold text-green-600">
                  {votingStats.supportPercentage.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">支持比例</div>
              </div>
              <div className="rounded-lg bg-red-50 p-4 text-center">
                <div className="text-2xl font-bold text-red-600">
                  {votingStats.opposePercentage.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500">反对比例</div>
              </div>
              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <div className="text-2xl font-bold">
                  {votingStats.totalVotingPower.toLocaleString()}
                </div>
                <div className="text-xs text-gray-500">总投票权重</div>
              </div>
            </div>

            <Tabs defaultValue="pie" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="pie">投票数分布</TabsTrigger>
                <TabsTrigger value="power">投票权重分布</TabsTrigger>
              </TabsList>
              <TabsContent value="pie" className="mt-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        labelLine={false}
                      >
                        {pieChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        layout="horizontal"
                        align="center"
                        verticalAlign="bottom"
                        wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
              <TabsContent value="power" className="mt-4">
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={votingPowerChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="value" fill="#8884d8">
                        {votingPowerChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </TabsContent>
            </Tabs>

            <div>
              <h4 className="mb-3 text-sm font-semibold">投票者权重分布</h4>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={voterDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div>
              <h4 className="mb-3 text-sm font-semibold">投票历史</h4>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {selectedDispute.votes.map((vote, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'h-2 w-2 rounded-full',
                          vote.support ? 'bg-green-500' : 'bg-red-500',
                        )}
                      />
                      <div>
                        <div className="font-mono text-sm">
                          {vote.voter.slice(0, 6)}...{vote.voter.slice(-4)}
                        </div>
                        <div className="text-xs text-gray-500">{formatTime(vote.timestamp)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{vote.support ? '支持' : '反对'}</div>
                      <div className="text-xs text-gray-500">
                        权重：{Number(vote.votingPower).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
