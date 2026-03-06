/**
 * API3 DAPI History
 * 
 * 提供 dAPI 历史数据用于趋势分析
 */

import type { NextRequest } from 'next/server';

import { error, ok } from '@/lib/api/apiResponse';

interface DapiHistoryPoint {
  timestamp: string;
  value: number;
  updateCount: number;
  avgDelay: number;
}

interface DapiHistoryResponse {
  dapiName: string;
  history: DapiHistoryPoint[];
  metadata: {
    timeRange: string;
    dataPoints: number;
    fetchedAt: string;
  };
}

// Mock 数据生成器
function generateDapiHistory(dapiName: string, hours: number): DapiHistoryPoint[] {
  const history: DapiHistoryPoint[] = [];
  const now = new Date();
  
  // 基础价格和波动
  let basePrice = 1000;
  if (dapiName.includes('ETH')) basePrice = 3500;
  else if (dapiName.includes('BTC')) basePrice = 65000;
  else if (dapiName.includes('LINK')) basePrice = 18;
  else if (dapiName.includes('AAVE')) basePrice = 95;
  else if (dapiName.includes('UNI')) basePrice = 12;

  const volatility = 0.02; // 2% 波动率
  let currentPrice = basePrice;

  // 生成数据点
  const dataPoints = hours < 6 ? hours * 6 : hours; // 每小时 6 个点或每小时 1 个点
  const intervalMs = (hours * 60 * 60 * 1000) / dataPoints;

  for (let i = 0; i < dataPoints; i++) {
    const timestamp = new Date(now.getTime() - (dataPoints - i) * intervalMs);
    
    // 随机游走价格
    const change = (Math.random() - 0.5) * volatility * currentPrice;
    currentPrice += change;
    currentPrice = Math.max(currentPrice, basePrice * 0.5); // 最低不低于 50%

    // 更新次数和延迟
    const updateCount = Math.floor(3 + Math.random() * 10); // 3-12 次更新
    const avgDelay = Math.floor(50 + Math.random() * 100); // 50-150ms

    history.push({
      timestamp: timestamp.toISOString(),
      value: currentPrice,
      updateCount,
      avgDelay,
    });
  }

  return history;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dapiName = searchParams.get('dapi');
    const timeRange = searchParams.get('timeRange') || '24h';

    if (!dapiName) {
      return error(
        { code: 'MISSING_DAPI', message: 'DAPI name is required' },
        400,
      );
    }

    let hours = 24;
    if (timeRange === '1h') hours = 1;
    else if (timeRange === '24h') hours = 24;
    else if (timeRange === '7d') hours = 24 * 7;
    else if (timeRange === '30d') hours = 24 * 30;

    const history = generateDapiHistory(dapiName, hours);

    return ok({
      dapiName,
      history,
      metadata: {
        timeRange,
        dataPoints: history.length,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
