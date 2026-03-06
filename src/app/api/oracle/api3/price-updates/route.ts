/**
 * API3 Price Updates History
 * 
 * 提供价格更新历史数据用于热力图分析
 */

import type { NextRequest } from 'next/server';

import { error, ok } from '@/lib/api/apiResponse';

interface PriceUpdateEvent {
  id: string;
  timestamp: string;
  dapiName: string;
  chain: string;
  value: number;
  delay: number;
  blockNumber: number;
  severity: 'normal' | 'warning' | 'critical';
}

interface PriceUpdatesResponse {
  updates: PriceUpdateEvent[];
  metadata: {
    total: number;
    timeRange: string;
    fetchedAt: string;
  };
}

// Mock 数据生成器
function generateMockUpdates(hours: number = 24): PriceUpdateEvent[] {
  const updates: PriceUpdateEvent[] = [];
  const now = new Date();
  const dapiNames = ['ETH/USD', 'BTC/USD', 'LINK/USD', 'AAVE/USD', 'UNI/USD'];
  const chains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'avalanche'];

  // 生成 24 小时内的更新数据
  const updatesPerHour = 5; // 每小时约 5 次更新
  const totalUpdates = hours * updatesPerHour;

  for (let i = 0; i < totalUpdates; i++) {
    const randomHour = Math.floor(Math.random() * hours);
    const randomMinute = Math.floor(Math.random() * 60);
    const randomSecond = Math.floor(Math.random() * 60);

    const timestamp = new Date(now);
    timestamp.setHours(timestamp.getHours() - randomHour);
    timestamp.setMinutes(randomMinute);
    timestamp.setSeconds(randomSecond);

    const dapiName = dapiNames[Math.floor(Math.random() * dapiNames.length)];
    const chain = chains[Math.floor(Math.random() * chains.length)];
    
    // 生成延迟数据（大部分正常，少数警告/严重）
    const delayRoll = Math.random();
    let delay: number;
    let severity: PriceUpdateEvent['severity'];

    if (delayRoll < 0.7) {
      // 70% 正常（<100ms）
      delay = Math.floor(30 + Math.random() * 70);
      severity = 'normal';
    } else if (delayRoll < 0.9) {
      // 20% 警告（100-300ms）
      delay = Math.floor(100 + Math.random() * 200);
      severity = 'warning';
    } else {
      // 10% 严重（>300ms）
      delay = Math.floor(300 + Math.random() * 500);
      severity = 'critical';
    }

    updates.push({
      id: `update-${i}`,
      timestamp: timestamp.toISOString(),
      dapiName,
      chain,
      value: Math.random() * 10000,
      delay,
      blockNumber: Math.floor(18000000 + Math.random() * 100000),
      severity,
    });
  }

  // 按时间排序
  updates.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return updates;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('timeRange') || '24h';
    const dapiName = searchParams.get('dapi');

    let hours = 24;
    if (timeRange === '1h') hours = 1;
    else if (timeRange === '6h') hours = 6;
    else if (timeRange === '24h') hours = 24;
    else if (timeRange === '7d') hours = 24 * 7;

    let updates = generateMockUpdates(hours);

    // 如果指定了 dapi，过滤数据
    if (dapiName) {
      updates = updates.filter((u) => u.dapiName === dapiName);
    }

    return ok({
      updates,
      metadata: {
        total: updates.length,
        timeRange,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
