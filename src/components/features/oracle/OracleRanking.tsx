/**
 * OracleRanking Component
 *
 * 预言机排名组件
 * 展示各预言机协议的性能排名和统计信息
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

import { RefreshCw, Trophy, TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { logger } from '@/lib/logger';

// ============================================================================
// Types
// ============================================================================

interface OracleMetric {
  protocol: string;
  chain: string;
  uptime: number;
  avgResponseTime: number;
  priceDeviation: number;
  updateFrequency: number;
  reliabilityScore: number;
  totalUpdates: number;
  lastUpdate: string;
}

interface RankingData {
  metrics: OracleMetric[];
  timestamp: string;
  topPerformer: string;
}

// ============================================================================
// Component
// ============================================================================

export function OracleRanking() {
  const [ranking, setRanking] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<keyof OracleMetric>('reliabilityScore');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/oracle/unified?action=ranking');
      if (!response.ok) {
        throw new Error(`Failed to fetch ranking: ${response.statusText}`);
      }
      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }
      setRanking(data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch ranking';
      setError(errorMessage);
      logger.error('Failed to fetch ranking', { error });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRanking();
    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchRanking, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchRanking]);

  const handleSort = (key: keyof OracleMetric) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  };

  const sortedMetrics = ranking?.metrics
    ? [...ranking.metrics].sort((a, b) => {
        const aVal = a[sortBy];
        const bVal = b[sortBy];
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return 0;
      })
    : [];

  const getRankIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-5 w-5 text-yellow-500" />;
    if (index === 1) return <Trophy className="h-5 w-5 text-gray-400" />;
    if (index === 2) return <Trophy className="h-5 w-5 text-amber-600" />;
    return <span className="text-muted-foreground w-5 text-center">{index + 1}</span>;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-100 text-green-800">优秀</Badge>;
    if (score >= 70) return <Badge className="bg-yellow-100 text-yellow-800">良好</Badge>;
    return <Badge className="bg-red-100 text-red-800">需改进</Badge>;
  };

  const formatNumber = (num: number, decimals = 2): string => {
    return num.toFixed(decimals);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5" />
            预言机性能排名
          </CardTitle>
          <Button variant="outline" size="sm" onClick={fetchRanking} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        {ranking?.topPerformer && (
          <p className="text-muted-foreground text-sm">
            最佳表现:{' '}
            <span className="font-semibold text-green-600">
              {ranking.topPerformer.toUpperCase()}
            </span>
          </p>
        )}
      </CardHeader>
      <CardContent>
        {loading && !ranking ? (
          <div className="flex justify-center py-8">
            <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="py-8 text-center">
            <Activity className="mx-auto mb-2 h-8 w-8 text-red-500" />
            <p className="text-red-600">{error}</p>
          </div>
        ) : sortedMetrics.length > 0 ? (
          <div className="space-y-4">
            {/* 排名表格 */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left font-medium">排名</th>
                    <th className="py-2 text-left font-medium">协议</th>
                    <th
                      className="hover:bg-muted/50 cursor-pointer py-2 text-right font-medium"
                      onClick={() => handleSort('reliabilityScore')}
                    >
                      可靠性分数{' '}
                      {sortBy === 'reliabilityScore' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th
                      className="hover:bg-muted/50 cursor-pointer py-2 text-right font-medium"
                      onClick={() => handleSort('uptime')}
                    >
                      在线率 {sortBy === 'uptime' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th
                      className="hover:bg-muted/50 cursor-pointer py-2 text-right font-medium"
                      onClick={() => handleSort('avgResponseTime')}
                    >
                      响应时间 {sortBy === 'avgResponseTime' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                    <th
                      className="hover:bg-muted/50 cursor-pointer py-2 text-right font-medium"
                      onClick={() => handleSort('priceDeviation')}
                    >
                      价格偏差 {sortBy === 'priceDeviation' && (sortOrder === 'desc' ? '↓' : '↑')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMetrics.map((metric, index) => (
                    <tr
                      key={`${metric.protocol}-${metric.chain}`}
                      className="hover:bg-muted/50 border-b last:border-0"
                    >
                      <td className="py-3">
                        <div className="flex items-center justify-center">{getRankIcon(index)}</div>
                      </td>
                      <td className="py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold">{metric.protocol.toUpperCase()}</span>
                          <span className="text-muted-foreground text-xs capitalize">
                            {metric.chain}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <span
                            className={`font-mono font-bold ${getScoreColor(metric.reliabilityScore)}`}
                          >
                            {formatNumber(metric.reliabilityScore)}
                          </span>
                          {getScoreBadge(metric.reliabilityScore)}
                        </div>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {metric.uptime >= 99 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : metric.uptime >= 95 ? (
                            <Minus className="h-4 w-4 text-yellow-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <span className="font-mono">{formatNumber(metric.uptime, 1)}%</span>
                        </div>
                      </td>
                      <td className="py-3 text-right font-mono">
                        {metric.avgResponseTime < 1000 ? (
                          <span className="text-green-600">
                            {Math.round(metric.avgResponseTime)}ms
                          </span>
                        ) : (
                          <span className="text-yellow-600">
                            {(metric.avgResponseTime / 1000).toFixed(1)}s
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`font-mono ${metric.priceDeviation < 0.5 ? 'text-green-600' : 'text-yellow-600'}`}
                        >
                          {formatNumber(metric.priceDeviation)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 更新时间 */}
            <p className="text-muted-foreground text-right text-xs">
              更新时间: {ranking ? new Date(ranking.timestamp).toLocaleString() : '-'}
            </p>
          </div>
        ) : (
          <div className="py-8 text-center">
            <Trophy className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
            <p className="text-muted-foreground">暂无排名数据</p>
            <p className="text-muted-foreground mt-2 text-sm">等待预言机数据同步完成...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OracleRanking;
