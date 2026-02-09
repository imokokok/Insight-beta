/**
 * Oracle Health Check API
 *
 * 预言机健康检查 API 端点
 * 支持查询特定协议、特定喂价的健康状态
 */

import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import type { OracleProtocol, SupportedChain } from '@/lib/types/unifiedOracleTypes';
import {
  checkFeedHealth,
  checkProtocolFeeds,
  getProtocolHealthSummary,
} from '@/server/monitoring/oracleHealthMonitor';

// ============================================================================
// 类型定义
// ============================================================================

interface HealthCheckResponse {
  success: boolean;
  data?: {
    protocol: OracleProtocol;
    chain: SupportedChain;
    feedId: string;
    healthy: boolean;
    lastUpdate: string;
    stalenessSeconds: number;
    issues: string[];
    checkedAt: string;
    latencyMs: number;
    // UMA 特定字段
    activeAssertions?: number;
    activeDisputes?: number;
    totalBonded?: string;
  };
  error?: string;
}

interface ProtocolHealthResponse {
  success: boolean;
  data?: {
    protocol: OracleProtocol;
    totalFeeds: number;
    healthyFeeds: number;
    unhealthyFeeds: number;
    staleFeeds: number;
    averageStalenessSeconds: number;
    lastCheckedAt: string;
  };
  error?: string;
}

interface HealthSummaryData {
  protocol: OracleProtocol;
  totalFeeds: number;
  healthyFeeds: number;
  unhealthyFeeds: number;
  staleFeeds: number;
  averageStalenessSeconds: number;
  lastCheckedAt: string;
}

interface AllProtocolsHealthResponse {
  success: boolean;
  data?: HealthSummaryData[];
  error?: string;
}

// ============================================================================
// GET 请求处理
// ============================================================================

/**
 * 获取健康检查状态
 *
 * 查询参数:
 * - protocol: 预言机协议 (可选)
 * - chain: 区块链网络 (可选)
 * - feedId: 喂价ID (可选)
 * - rpcUrl: RPC 节点 URL (可选)
 */
export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const protocol = searchParams.get('protocol') as OracleProtocol | null;
  const chain = searchParams.get('chain') as SupportedChain | null;
  const feedId = searchParams.get('feedId');
  const rpcUrl = searchParams.get('rpcUrl') || process.env.DEFAULT_RPC_URL || '';

  try {
    // 如果指定了 protocol 和 feedId，检查特定喂价
    if (protocol && chain && feedId) {
      const result = await checkFeedHealth(protocol, chain, feedId, rpcUrl);

      const response: HealthCheckResponse = {
        success: true,
        data: {
          protocol: result.protocol,
          chain: result.chain,
          feedId: result.feedId,
          healthy: result.healthy,
          lastUpdate: result.lastUpdate.toISOString(),
          stalenessSeconds: result.stalenessSeconds,
          issues: result.issues,
          checkedAt: result.checkedAt.toISOString(),
          latencyMs: result.latencyMs,
          activeAssertions: result.activeAssertions,
          activeDisputes: result.activeDisputes,
          totalBonded: result.totalBonded?.toString(),
        },
      };

      return NextResponse.json(response);
    }

    // 如果指定了 protocol，获取协议摘要
    if (protocol) {
      const summary = await getProtocolHealthSummary(protocol);

      const response: ProtocolHealthResponse = {
        success: true,
        data: {
          protocol: summary.protocol,
          totalFeeds: summary.totalFeeds,
          healthyFeeds: summary.healthyFeeds,
          unhealthyFeeds: summary.unhealthyFeeds,
          staleFeeds: summary.staleFeeds,
          averageStalenessSeconds: summary.averageStalenessSeconds,
          lastCheckedAt: summary.lastCheckedAt.toISOString(),
        },
      };

      return NextResponse.json(response);
    }

    // 否则获取所有协议的摘要
    const protocols: OracleProtocol[] = [
      'chainlink',
      'pyth',
      'api3',
      'band',
      'redstone',
      'dia',
      'uma',
    ];

    const summaries = await Promise.all(
      protocols.map((p) => getProtocolHealthSummary(p)),
    );

    const response: AllProtocolsHealthResponse = {
      success: true,
      data: summaries.map((summary): HealthSummaryData => ({
        protocol: summary.protocol,
        totalFeeds: summary.totalFeeds,
        healthyFeeds: summary.healthyFeeds,
        unhealthyFeeds: summary.unhealthyFeeds,
        staleFeeds: summary.staleFeeds,
        averageStalenessSeconds: summary.averageStalenessSeconds,
        lastCheckedAt: summary.lastCheckedAt.toISOString(),
      })),
    };

    return NextResponse.json(response);
  } catch (error) {
    logger.error('Health check API error', { error });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// POST 请求处理
// ============================================================================

/**
 * 执行批量健康检查
 *
 * 请求体:
 * {
 *   protocol: OracleProtocol;
 *   chain: SupportedChain;
 *   feedIds: string[];
 *   rpcUrl?: string;
 * }
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: {
      protocol: OracleProtocol;
      chain: SupportedChain;
      feedIds: string[];
      rpcUrl?: string;
    } = await request.json();

    const { protocol, chain, feedIds, rpcUrl = process.env.DEFAULT_RPC_URL || '' } = body;

    if (!protocol || !chain || !feedIds || !Array.isArray(feedIds)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: protocol, chain, feedIds',
        },
        { status: 400 },
      );
    }

    const results = await checkProtocolFeeds(protocol, chain, feedIds, rpcUrl);

    return NextResponse.json({
      success: true,
      data: results.map((result) => ({
        protocol: result.protocol,
        chain: result.chain,
        feedId: result.feedId,
        healthy: result.healthy,
        lastUpdate: result.lastUpdate.toISOString(),
        stalenessSeconds: result.stalenessSeconds,
        issues: result.issues,
        checkedAt: result.checkedAt.toISOString(),
        latencyMs: result.latencyMs,
        activeAssertions: result.activeAssertions,
        activeDisputes: result.activeDisputes,
        totalBonded: result.totalBonded?.toString(),
      })),
    });
  } catch (error) {
    logger.error('Batch health check API error', { error });

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
