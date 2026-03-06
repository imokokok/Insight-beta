/**
 * API3 Airnode History
 * 
 * 提供 Airnode 历史表现数据
 */

import type { NextRequest } from 'next/server';

import { error, ok } from '@/lib/api/apiResponse';

interface HistoryPoint {
  timestamp: string;
  responseTime: number;
  uptime: number;
  totalUpdates: number;
}

interface AirnodeHistoryResponse {
  address: string;
  history: HistoryPoint[];
  statistics: {
    avgResponseTime: number;
    minResponseTime: number;
    maxResponseTime: number;
    avgUptime: number;
    totalUpdates: number;
    trend: 'improving' | 'stable' | 'degrading';
  };
  metadata: {
    timeRange: string;
    dataPoints: number;
    fetchedAt: string;
  };
}

// Mock 历史数据
function generateMockHistory(address: string, days: number = 7): HistoryPoint[] {
  const history: HistoryPoint[] = [];
  const now = new Date();
  const baseResponseTime = 80 + Math.random() * 40; // 80-120ms
  const baseUptime = 98 + Math.random() * 2; // 98-100%
  
  for (let i = days; i >= 0; i--) {
    const timestamp = new Date(now);
    timestamp.setDate(timestamp.getDate() - i);
    
    // 添加一些随机波动
    const responseTimeVariation = (Math.random() - 0.5) * 30;
    const uptimeVariation = (Math.random() - 0.5) * 1;
    
    history.push({
      timestamp: timestamp.toISOString(),
      responseTime: Math.round(baseResponseTime + responseTimeVariation),
      uptime: Math.min(100, Math.max(0, baseUptime + uptimeVariation)),
      totalUpdates: Math.floor(Math.random() * 1000) + 500,
    });
  }
  
  return history;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const timeRange = searchParams.get('timeRange') || '7d';

    if (!address) {
      return error(
        { code: 'MISSING_ADDRESS', message: 'Airnode address is required' },
        400,
      );
    }

    // 解析时间范围
    let days = 7;
    if (timeRange === '24h') days = 1;
    else if (timeRange === '7d') days = 7;
    else if (timeRange === '30d') days = 30;
    else if (timeRange === '90d') days = 90;

    const history = generateMockHistory(address, days);

    // 计算统计数据
    const avgResponseTime = Math.round(
      history.reduce((sum, h) => sum + h.responseTime, 0) / history.length,
    );
    const minResponseTime = Math.min(...history.map((h) => h.responseTime));
    const maxResponseTime = Math.max(...history.map((h) => h.responseTime));
    const avgUptime = parseFloat(
      (history.reduce((sum, h) => sum + h.uptime, 0) / history.length).toFixed(2),
    );
    const totalUpdates = history.reduce((sum, h) => sum + h.totalUpdates, 0);

    // 计算趋势
    const recentAvg = history.slice(0, 3).reduce((sum, h) => sum + h.responseTime, 0) / 3;
    const olderAvg = history.slice(-3).reduce((sum, h) => sum + h.responseTime, 0) / 3;
    let trend: 'improving' | 'stable' | 'degrading' = 'stable';
    if (recentAvg < olderAvg * 0.95) trend = 'improving';
    else if (recentAvg > olderAvg * 1.05) trend = 'degrading';

    const response: AirnodeHistoryResponse = {
      address,
      history,
      statistics: {
        avgResponseTime,
        minResponseTime,
        maxResponseTime,
        avgUptime,
        totalUpdates,
        trend,
      },
      metadata: {
        timeRange,
        dataPoints: history.length,
        fetchedAt: new Date().toISOString(),
      },
    };

    return ok(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
