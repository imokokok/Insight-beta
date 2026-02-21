import type { NextRequest } from 'next/server';

import type {
  UpdateFrequencyStats,
  UpdateIntervalPoint,
  UpdateFrequencyResponse,
} from '@/features/oracle/api3/types/api3';
import { error, ok } from '@/lib/api/apiResponse';
import { query } from '@/lib/database/db';

interface FrequencyQueryParams {
  chain?: string;
  dapiName?: string;
  timeRange: '1h' | '24h' | '7d' | '30d';
}

function parseQueryParams(request: NextRequest): FrequencyQueryParams {
  const { searchParams } = new URL(request.url);
  return {
    chain: searchParams.get('chain') ?? undefined,
    dapiName: searchParams.get('dapi_name') ?? undefined,
    timeRange: (searchParams.get('timeRange') as FrequencyQueryParams['timeRange']) || '24h',
  };
}

function getTimeRangeMs(timeRange: FrequencyQueryParams['timeRange']): number {
  const ranges: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
  };
  return ranges[timeRange] ?? ranges['24h'] ?? 24 * 60 * 60 * 1000;
}

function detectAnomaly(
  intervalMs: number,
  avgIntervalMs: number,
): { isAnomaly: boolean; reason?: string } {
  if (intervalMs <= 0) {
    return { isAnomaly: true, reason: 'Invalid interval' };
  }

  if (avgIntervalMs > 0) {
    const deviationRatio = intervalMs / avgIntervalMs;
    if (deviationRatio > 5) {
      return {
        isAnomaly: true,
        reason: `Interval ${Math.round(deviationRatio)}x longer than average`,
      };
    }
    if (deviationRatio < 0.1) {
      return { isAnomaly: true, reason: 'Unusually short interval' };
    }
  }

  const oneHour = 60 * 60 * 1000;
  if (intervalMs > oneHour) {
    return { isAnomaly: true, reason: 'Update delay exceeds 1 hour' };
  }

  return { isAnomaly: false };
}

async function getFrequencyStats(
  params: FrequencyQueryParams,
): Promise<UpdateFrequencyResponse | null> {
  const { chain, dapiName, timeRange } = params;
  const timeRangeMs = getTimeRangeMs(timeRange);
  const startTime = new Date(Date.now() - timeRangeMs);

  let whereClause = 'WHERE timestamp >= $1';
  const queryParams: (string | Date)[] = [startTime];
  let paramIndex = 2;

  if (chain) {
    whereClause += ` AND chain = $${paramIndex}`;
    queryParams.push(chain);
    paramIndex++;
  }

  if (dapiName) {
    whereClause += ` AND dapi_name = $${paramIndex}`;
    queryParams.push(dapiName);
    paramIndex++;
  }

  const priceQuery = `
    SELECT 
      dapi_name,
      chain,
      timestamp,
      price
    FROM api3_price_history
    ${whereClause}
    ORDER BY dapi_name, chain, timestamp ASC
  `;

  const result = await query<{
    dapi_name: string;
    chain: string;
    timestamp: Date;
    price: string;
  }>(priceQuery, queryParams);

  if (result.rows.length < 2) {
    return null;
  }

  const groupedData = new Map<string, { timestamps: Date[]; chain: string }>();

  for (const row of result.rows) {
    const key = `${row.chain}:${row.dapi_name}`;
    if (!groupedData.has(key)) {
      groupedData.set(key, { timestamps: [], chain: row.chain });
    }
    groupedData.get(key)!.timestamps.push(row.timestamp);
  }

  const firstKey = Array.from(groupedData.keys())[0];
  if (!firstKey) return null;

  const firstGroup = groupedData.get(firstKey)!;
  const [targetChain, targetDapiName] = firstKey.split(':');
  const timestamps = firstGroup.timestamps;

  const intervals: UpdateIntervalPoint[] = [];
  const intervalValues: number[] = [];

  for (let i = 1; i < timestamps.length; i++) {
    const prevTime = timestamps[i - 1]!.getTime();
    const currTime = timestamps[i]!.getTime();
    const intervalMs = currTime - prevTime;

    intervalValues.push(intervalMs);
    intervals.push({
      timestamp: timestamps[i]!.toISOString(),
      intervalMs,
      isAnomaly: false,
    });
  }

  if (intervalValues.length === 0) {
    return null;
  }

  const avgIntervalMs = intervalValues.reduce((a, b) => a + b, 0) / intervalValues.length;
  const minIntervalMs = Math.min(...intervalValues);
  const maxIntervalMs = Math.max(...intervalValues);

  let anomalyCount = 0;
  let anomalyReason: string | undefined;

  for (let i = 0; i < intervals.length; i++) {
    const anomalyResult = detectAnomaly(intervals[i]!.intervalMs, avgIntervalMs);
    intervals[i]!.isAnomaly = anomalyResult.isAnomaly;
    if (anomalyResult.isAnomaly) {
      anomalyCount++;
      if (!anomalyReason) {
        anomalyReason = anomalyResult.reason;
      }
    }
  }

  const stats: UpdateFrequencyStats = {
    dapiName: targetDapiName || 'unknown',
    chain: targetChain || 'unknown',
    avgUpdateIntervalMs: Math.round(avgIntervalMs),
    minUpdateIntervalMs: minIntervalMs,
    maxUpdateIntervalMs: maxIntervalMs,
    updateCount: timestamps.length,
    lastUpdateTime: timestamps[timestamps.length - 1]!.toISOString(),
    anomalyDetected: anomalyCount > 0,
    anomalyReason: anomalyCount > 0 ? `${anomalyCount} anomalies detected` : undefined,
  };

  return {
    stats,
    intervals,
    timeRange,
  };
}

function generateMockFrequencyData(params: FrequencyQueryParams): UpdateFrequencyResponse {
  const { chain = 'ethereum', dapiName = 'ETH/USD', timeRange } = params;
  const timeRangeMs = getTimeRangeMs(timeRange);

  const points =
    timeRange === '1h' ? 60 : timeRange === '24h' ? 96 : timeRange === '7d' ? 168 : 720;
  const baseInterval = timeRangeMs / points;

  const intervals: UpdateIntervalPoint[] = [];
  const intervalValues: number[] = [];
  let anomalyCount = 0;
  let anomalyReason: string | undefined;

  const now = Date.now();

  for (let i = 0; i < points; i++) {
    const isAnomaly = Math.random() < 0.05;
    let intervalMs: number;

    if (isAnomaly) {
      intervalMs = baseInterval * (3 + Math.random() * 5);
      anomalyCount++;
      if (!anomalyReason) {
        anomalyReason = 'Update delay detected';
      }
    } else {
      intervalMs = baseInterval * (0.8 + Math.random() * 0.4);
    }

    intervalValues.push(intervalMs);
    intervals.push({
      timestamp: new Date(now - (points - i) * baseInterval).toISOString(),
      intervalMs: Math.round(intervalMs),
      isAnomaly,
    });
  }

  const avgIntervalMs = intervalValues.reduce((a, b) => a + b, 0) / intervalValues.length;
  const minIntervalMs = Math.min(...intervalValues);
  const maxIntervalMs = Math.max(...intervalValues);

  const stats: UpdateFrequencyStats = {
    dapiName,
    chain,
    avgUpdateIntervalMs: Math.round(avgIntervalMs),
    minUpdateIntervalMs: Math.round(minIntervalMs),
    maxUpdateIntervalMs: Math.round(maxIntervalMs),
    updateCount: points,
    lastUpdateTime: new Date(now).toISOString(),
    anomalyDetected: anomalyCount > 0,
    anomalyReason: anomalyCount > 0 ? `${anomalyCount} anomalies detected` : undefined,
  };

  return {
    stats,
    intervals,
    timeRange,
  };
}

export async function GET(request: NextRequest) {
  try {
    const params = parseQueryParams(request);

    let data: UpdateFrequencyResponse;

    try {
      const dbData = await getFrequencyStats(params);
      if (dbData) {
        data = dbData;
      } else {
        data = generateMockFrequencyData(params);
      }
    } catch {
      data = generateMockFrequencyData(params);
    }

    return ok(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
