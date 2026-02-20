/**
 * Protocol Details API
 *
 * 协议详情 API - 返回特定协议的详细信息
 * GET /api/oracle/protocols/[protocol]
 */

import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';
import { getProtocolConfig, PROTOCOL_CONFIGS } from '@/lib/protocol-config';
import { logger } from '@/shared/logger';
import {
  PROTOCOL_INFO,
  PROTOCOL_DISPLAY_NAMES,
  type OracleProtocol,
} from '@/types/oracle/protocol';

interface ProtocolFeed {
  id: string;
  name: string;
  symbol: string;
  price: number;
  decimals: number;
  updatedAt: string;
  chain: string;
  contractAddress?: string;
  status: 'active' | 'stale' | 'inactive';
  heartbeat?: number;
  deviationThreshold?: number;
}

interface ProtocolNode {
  id: string;
  name: string;
  address: string;
  status: 'active' | 'inactive';
  lastUpdate: string;
  totalSubmissions: number;
  accuracy: number;
}

interface ProtocolStats {
  totalFeeds: number;
  activeFeeds: number;
  staleFeeds: number;
  totalNodes?: number;
  avgUpdateLatency: number;
  networkUptime: number;
  totalSubmissions?: number;
  totalPublishers?: number;
  avgConfidence?: number;
}

interface ProtocolDetailResponse {
  id: OracleProtocol;
  name: string;
  description: string;
  website: string;
  supportedChains: string[];
  features: string[];
  category: string;
  feeds: ProtocolFeed[];
  nodes: ProtocolNode[];
  stats: ProtocolStats;
  tvl: number;
  tvlChange24h: number;
  avgLatency: number;
  uptime: number;
  priceFeeds: number;
  lastUpdate: string;
  usageCount: number;
  status: 'active' | 'inactive' | 'maintenance';
}

function isValidProtocol(protocol: string): protocol is OracleProtocol {
  return protocol in PROTOCOL_CONFIGS;
}

function generateMockFeeds(protocol: OracleProtocol): ProtocolFeed[] {
  const config = getProtocolConfig(protocol);
  const mockFeeds = config.mockData.feeds as ProtocolFeed[];

  if (mockFeeds && mockFeeds.length > 0) {
    return mockFeeds.map((feed) => ({
      ...feed,
      updatedAt: new Date(Date.now() - Math.random() * 300000).toISOString(),
    }));
  }

  const symbols = ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD', 'AVAX/USD'];
  const chains = config.supportedChains;

  return symbols.slice(0, 3).map((symbol, index) => ({
    id: `${protocol}-${symbol.toLowerCase().replace('/', '-')}`,
    name: symbol,
    symbol,
    price: [3254.78, 67432.15, 18.45][index] || 100,
    decimals: 8,
    updatedAt: new Date(Date.now() - Math.random() * 300000).toISOString(),
    chain: chains[0] || 'ethereum',
    status: Math.random() > 0.1 ? 'active' : 'stale',
  }));
}

function generateMockNodes(protocol: OracleProtocol): ProtocolNode[] {
  const config = getProtocolConfig(protocol);
  const mockNodes = config.mockData.nodes as ProtocolNode[] | undefined;

  if (mockNodes && mockNodes.length > 0) {
    return mockNodes;
  }

  if (!config.features.hasNodes) {
    return [];
  }

  return [
    {
      id: `${protocol}-node-1`,
      name: `${PROTOCOL_DISPLAY_NAMES[protocol]} Node 1`,
      address: '0x' + Math.random().toString(16).slice(2, 42),
      status: 'active',
      lastUpdate: new Date(Date.now() - 60000).toISOString(),
      totalSubmissions: Math.floor(Math.random() * 10000) + 1000,
      accuracy: 99 + Math.random() * 0.9,
    },
    {
      id: `${protocol}-node-2`,
      name: `${PROTOCOL_DISPLAY_NAMES[protocol]} Node 2`,
      address: '0x' + Math.random().toString(16).slice(2, 42),
      status: Math.random() > 0.2 ? 'active' : 'inactive',
      lastUpdate: new Date(Date.now() - 120000).toISOString(),
      totalSubmissions: Math.floor(Math.random() * 8000) + 500,
      accuracy: 98 + Math.random() * 1.5,
    },
  ];
}

function generateMockStats(protocol: OracleProtocol): ProtocolStats {
  const config = getProtocolConfig(protocol);
  const mockStats = config.mockData.stats as unknown as ProtocolStats;

  return {
    totalFeeds: mockStats.totalFeeds || 50,
    activeFeeds: mockStats.activeFeeds || 48,
    staleFeeds: mockStats.staleFeeds || 2,
    totalNodes: mockStats.totalNodes,
    avgUpdateLatency: mockStats.avgUpdateLatency || 45000,
    networkUptime: mockStats.networkUptime || 99.9,
    totalSubmissions: mockStats.totalSubmissions,
    totalPublishers: mockStats.totalPublishers,
    avgConfidence: mockStats.avgConfidence,
  };
}

async function getProtocolDetails(protocol: OracleProtocol): Promise<ProtocolDetailResponse> {
  const config = getProtocolConfig(protocol);
  const info = PROTOCOL_INFO[protocol];
  const stats = generateMockStats(protocol);

  const tvl = (Math.random() * 10 + 1) * 1e9;
  const tvlChange24h = (Math.random() - 0.5) * 10;

  return {
    id: protocol,
    name: PROTOCOL_DISPLAY_NAMES[protocol],
    description: info.description,
    website: info.website,
    supportedChains: config.supportedChains,
    features: info.features,
    category: info.category,
    feeds: generateMockFeeds(protocol),
    nodes: generateMockNodes(protocol),
    stats,
    tvl,
    tvlChange24h,
    avgLatency: stats.avgUpdateLatency,
    uptime: stats.networkUptime,
    priceFeeds: stats.totalFeeds,
    lastUpdate: new Date().toISOString(),
    usageCount: Math.floor(Math.random() * 100000) + 10000,
    status: 'active',
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ protocol: string }> },
) {
  const requestStartTime = performance.now();

  try {
    const { protocol: protocolParam } = await params;
    const protocol = protocolParam.toLowerCase();

    if (!isValidProtocol(protocol)) {
      return error(
        {
          code: 'invalid_protocol',
          message: `Invalid protocol: ${protocolParam}. Valid protocols are: ${Object.keys(PROTOCOL_CONFIGS).join(', ')}`,
        },
        400,
      );
    }

    const details = await getProtocolDetails(protocol);

    const requestTime = performance.now() - requestStartTime;

    logger.info('Protocol details API request completed', {
      performance: { totalRequestTimeMs: Math.round(requestTime) },
      requestParams: { protocol },
      responseStats: {
        feedsCount: details.feeds.length,
        nodesCount: details.nodes.length,
      },
    });

    return ok(details);
  } catch (err) {
    const requestTime = performance.now() - requestStartTime;

    logger.error('Protocol details API request failed', {
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
