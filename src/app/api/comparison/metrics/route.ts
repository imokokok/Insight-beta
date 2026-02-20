/**
 * Comparison Metrics API
 *
 * 协议比较指标 API - 返回多协议性能指标对比数据
 * GET /api/comparison/metrics
 */

import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';
import { logger } from '@/shared/logger';
import { type OracleProtocol, ORACLE_PROTOCOLS } from '@/types/oracle/protocol';

export interface ProtocolMetrics {
  protocol: OracleProtocol;
  latency: number;
  accuracy: number;
  updateFrequency: number;
  priceDeviation: number;
  totalFeeds: number;
  activeFeeds: number;
  uptime: number;
  tvl: number;
}

interface MetricsResponse {
  metrics: ProtocolMetrics[];
  lastUpdated: string;
  isMock: boolean;
}

function isValidProtocol(protocol: string): protocol is OracleProtocol {
  return ORACLE_PROTOCOLS.includes(protocol as OracleProtocol);
}

function generateMockMetrics(protocols: OracleProtocol[]): ProtocolMetrics[] {
  const baseMetrics: Record<OracleProtocol, Omit<ProtocolMetrics, 'protocol'>> = {
    chainlink: {
      latency: 45,
      accuracy: 99.8,
      updateFrequency: 95,
      priceDeviation: 0.02,
      totalFeeds: 150,
      activeFeeds: 147,
      uptime: 99.9,
      tvl: 12.5e9,
    },
    pyth: {
      latency: 25,
      accuracy: 99.5,
      updateFrequency: 98,
      priceDeviation: 0.03,
      totalFeeds: 400,
      activeFeeds: 398,
      uptime: 99.95,
      tvl: 8.2e9,
    },
    redstone: {
      latency: 35,
      accuracy: 99.3,
      updateFrequency: 92,
      priceDeviation: 0.04,
      totalFeeds: 50,
      activeFeeds: 48,
      uptime: 99.5,
      tvl: 2.1e9,
    },
    uma: {
      latency: 120,
      accuracy: 98.5,
      updateFrequency: 75,
      priceDeviation: 0.08,
      totalFeeds: 0,
      activeFeeds: 0,
      uptime: 99.0,
      tvl: 1.5e9,
    },
    api3: {
      latency: 30,
      accuracy: 99.6,
      updateFrequency: 96,
      priceDeviation: 0.025,
      totalFeeds: 20,
      activeFeeds: 20,
      uptime: 99.9,
      tvl: 3.8e9,
    },
    band: {
      latency: 50,
      accuracy: 99.4,
      updateFrequency: 90,
      priceDeviation: 0.035,
      totalFeeds: 25,
      activeFeeds: 25,
      uptime: 99.8,
      tvl: 1.2e9,
    },
  };

  return protocols.map((protocol) => ({
    protocol,
    ...baseMetrics[protocol],
    latency: baseMetrics[protocol].latency + Math.random() * 10 - 5,
    accuracy: Math.min(100, baseMetrics[protocol].accuracy + Math.random() * 0.2 - 0.1),
    updateFrequency: Math.min(100, baseMetrics[protocol].updateFrequency + Math.random() * 2 - 1),
    priceDeviation: Math.max(
      0.01,
      baseMetrics[protocol].priceDeviation + Math.random() * 0.01 - 0.005,
    ),
  }));
}

export async function GET(request: NextRequest) {
  const requestStartTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const protocolsParam = searchParams.get('protocols');

    let protocols: OracleProtocol[];

    if (protocolsParam) {
      const requestedProtocols = protocolsParam.split(',').map((p) => p.trim().toLowerCase());
      const invalidProtocols = requestedProtocols.filter((p) => !isValidProtocol(p));

      if (invalidProtocols.length > 0) {
        return error(
          {
            code: 'invalid_protocols',
            message: `Invalid protocols: ${invalidProtocols.join(', ')}. Valid protocols are: ${ORACLE_PROTOCOLS.join(', ')}`,
          },
          400,
        );
      }

      protocols = requestedProtocols as OracleProtocol[];
    } else {
      protocols = ORACLE_PROTOCOLS;
    }

    const metrics = generateMockMetrics(protocols);

    const requestTime = performance.now() - requestStartTime;

    logger.info('Comparison metrics API request completed', {
      performance: { totalRequestTimeMs: Math.round(requestTime) },
      requestParams: { protocols },
      responseStats: { metricsCount: metrics.length },
    });

    const response: MetricsResponse = {
      metrics,
      lastUpdated: new Date().toISOString(),
      isMock: true,
    };

    return ok(response);
  } catch (err) {
    const requestTime = performance.now() - requestStartTime;

    logger.error('Comparison metrics API request failed', {
      error: err,
      performance: { totalRequestTimeMs: Math.round(requestTime) },
    });

    return error(
      {
        code: 'internal_error',
        message: err instanceof Error ? err.message : 'Internal server error',
      },
      500,
    );
  }
}
