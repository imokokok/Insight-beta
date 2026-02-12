/**
 * Oracle Health Monitor - 预言机健康检查监控服务
 *
 * 统一的健康检查调度服务，支持所有预言机协议：
 * - Chainlink
 * - Pyth
 * - API3
 * - Band
 * - RedStone
 * - DIA
 * - UMA (含争议事件检测)
 */

import { query } from '@/lib/database/db';
import { logger } from '@/shared/logger';
import type { OracleProtocol, SupportedChain } from '@/types/unifiedOracleTypes';

// ============================================================================
// 类型定义
// ============================================================================

export interface HealthCheckResult {
  protocol: OracleProtocol;
  chain: SupportedChain;
  feedId: string;
  healthy: boolean;
  lastUpdate: Date;
  stalenessSeconds: number;
  issues: string[];
  checkedAt: Date;
  latencyMs: number;
  // UMA 特定字段
  activeAssertions?: number;
  activeDisputes?: number;
  totalBonded?: bigint;
}

export interface ProtocolHealthSummary {
  protocol: OracleProtocol;
  totalFeeds: number;
  healthyFeeds: number;
  unhealthyFeeds: number;
  staleFeeds: number;
  averageStalenessSeconds: number;
  lastCheckedAt: Date;
}

export interface HealthMonitorConfig {
  checkIntervalMs: number;
  staleThresholdSeconds: Record<OracleProtocol, number>;
  maxConcurrentChecks: number;
  enabledProtocols: OracleProtocol[];
}

export type HealthCheckStatus = 'healthy' | 'stale' | 'error' | 'unknown';

// ============================================================================
// 健康检查客户端接口
// ============================================================================

interface IHealthCheckClient {
  checkFeedHealth(feedId: string): Promise<{
    healthy: boolean;
    lastUpdate: Date;
    stalenessSeconds: number;
    issues: string[];
    activeAssertions?: number;
    activeDisputes?: number;
    totalBonded?: bigint;
  }>;
}

// ============================================================================
// 健康检查监控服务
// ============================================================================

export class OracleHealthMonitor {
  private config: HealthMonitorConfig;
  private checkIntervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private isRunning: Map<string, boolean> = new Map();
  private lastResults: Map<string, HealthCheckResult> = new Map();

  constructor(config?: Partial<HealthMonitorConfig>) {
    this.config = {
      checkIntervalMs: 60000, // 1分钟
      staleThresholdSeconds: {
        chainlink: 3600,
        pyth: 60,
        redstone: 60,
        uma: 600,
      },
      maxConcurrentChecks: 5,
      enabledProtocols: ['chainlink', 'pyth', 'redstone', 'uma'],
      ...config,
    };
  }

  // ============================================================================
  // 核心健康检查方法
  // ============================================================================

  /**
   * 执行单个喂价的健康检查
   */
  async checkFeedHealth(
    protocol: OracleProtocol,
    chain: SupportedChain,
    feedId: string,
    rpcUrl: string,
  ): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const client = await this.createHealthCheckClient(protocol, chain, rpcUrl);
      const result = await client.checkFeedHealth(feedId);
      const latencyMs = Date.now() - startTime;

      const healthResult: HealthCheckResult = {
        protocol,
        chain,
        feedId,
        healthy: result.healthy,
        lastUpdate: result.lastUpdate,
        stalenessSeconds: result.stalenessSeconds,
        issues: result.issues,
        checkedAt: new Date(),
        latencyMs,
        // UMA 特定字段
        activeAssertions: result.activeAssertions,
        activeDisputes: result.activeDisputes,
        totalBonded: result.totalBonded,
      };

      // 保存结果
      this.lastResults.set(`${protocol}-${chain}-${feedId}`, healthResult);

      // 保存到数据库
      await this.saveHealthCheckResult(healthResult);

      return healthResult;
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      const healthResult: HealthCheckResult = {
        protocol,
        chain,
        feedId,
        healthy: false,
        lastUpdate: new Date(0),
        stalenessSeconds: Infinity,
        issues: [`Health check failed: ${errorMessage}`],
        checkedAt: new Date(),
        latencyMs,
      };

      this.lastResults.set(`${protocol}-${chain}-${feedId}`, healthResult);
      await this.saveHealthCheckResult(healthResult);

      return healthResult;
    }
  }

  /**
   * 批量检查协议的所有喂价
   */
  async checkProtocolFeeds(
    protocol: OracleProtocol,
    chain: SupportedChain,
    feedIds: string[],
    rpcUrl: string,
  ): Promise<HealthCheckResult[]> {
    logger.info(`Starting health check for ${protocol} on ${chain}`, {
      feedCount: feedIds.length,
    });

    const results: HealthCheckResult[] = [];

    // 并发控制
    const batchSize = this.config.maxConcurrentChecks;
    for (let i = 0; i < feedIds.length; i += batchSize) {
      const batch = feedIds.slice(i, i + batchSize);
      const batchResults = await Promise.all(
        batch.map((feedId) =>
          this.checkFeedHealth(protocol, chain, feedId, rpcUrl).catch(
            (error): HealthCheckResult => ({
              protocol,
              chain,
              feedId,
              healthy: false,
              lastUpdate: new Date(0),
              stalenessSeconds: Infinity,
              issues: [`Batch check error: ${error.message}`],
              checkedAt: new Date(),
              latencyMs: 0,
            }),
          ),
        ),
      );
      results.push(...batchResults);
    }

    // 记录摘要
    const healthyCount = results.filter((r) => r.healthy).length;
    const staleCount = results.filter(
      (r) => !r.healthy && r.stalenessSeconds > this.config.staleThresholdSeconds[protocol],
    ).length;

    logger.info(`Health check completed for ${protocol} on ${chain}`, {
      total: results.length,
      healthy: healthyCount,
      stale: staleCount,
      failed: results.length - healthyCount - staleCount,
    });

    return results;
  }

  // ============================================================================
  // 定时监控
  // ============================================================================

  /**
   * 启动定时健康检查
   */
  async startMonitoring(
    protocol: OracleProtocol,
    chain: SupportedChain,
    feedIds: string[],
    rpcUrl: string,
  ): Promise<void> {
    const key = `${protocol}-${chain}`;

    if (this.isRunning.get(key)) {
      logger.warn(`Health monitoring already running for ${key}`);
      return;
    }

    logger.info(`Starting health monitoring for ${key}`, {
      feedCount: feedIds.length,
      intervalMs: this.config.checkIntervalMs,
    });

    this.isRunning.set(key, true);

    // 立即执行一次检查
    await this.checkProtocolFeeds(protocol, chain, feedIds, rpcUrl);

    // 设置定时器
    const interval = setInterval(async () => {
      if (!this.isRunning.get(key)) {
        return;
      }

      try {
        await this.checkProtocolFeeds(protocol, chain, feedIds, rpcUrl);
      } catch (error) {
        logger.error(`Scheduled health check failed for ${key}`, {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }, this.config.checkIntervalMs);

    this.checkIntervals.set(key, interval);
  }

  /**
   * 停止定时监控
   */
  stopMonitoring(protocol: OracleProtocol, chain: SupportedChain): void {
    const key = `${protocol}-${chain}`;
    const interval = this.checkIntervals.get(key);

    if (interval) {
      clearInterval(interval);
      this.checkIntervals.delete(key);
    }

    this.isRunning.set(key, false);
    logger.info(`Stopped health monitoring for ${key}`);
  }

  /**
   * 停止所有监控
   */
  stopAllMonitoring(): void {
    for (const [key, interval] of this.checkIntervals.entries()) {
      clearInterval(interval);
      this.isRunning.set(key, false);
      logger.info(`Stopped health monitoring for ${key}`);
    }
    this.checkIntervals.clear();
  }

  // ============================================================================
  // 数据查询
  // ============================================================================

  /**
   * 获取协议健康摘要
   */
  async getProtocolHealthSummary(protocol: OracleProtocol): Promise<ProtocolHealthSummary> {
    const results = Array.from(this.lastResults.values()).filter((r) => r.protocol === protocol);

    if (results.length === 0) {
      return {
        protocol,
        totalFeeds: 0,
        healthyFeeds: 0,
        unhealthyFeeds: 0,
        staleFeeds: 0,
        averageStalenessSeconds: 0,
        lastCheckedAt: new Date(),
      };
    }

    const healthyFeeds = results.filter((r) => r.healthy).length;
    const staleFeeds = results.filter(
      (r) => !r.healthy && r.stalenessSeconds > this.config.staleThresholdSeconds[protocol],
    ).length;

    const averageStaleness =
      results.reduce((sum, r) => sum + r.stalenessSeconds, 0) / results.length;

    return {
      protocol,
      totalFeeds: results.length,
      healthyFeeds,
      unhealthyFeeds: results.length - healthyFeeds,
      staleFeeds,
      averageStalenessSeconds: Math.round(averageStaleness),
      lastCheckedAt: results[results.length - 1]?.checkedAt || new Date(),
    };
  }

  /**
   * 获取所有不健康的数据源
   */
  getUnhealthyFeeds(): HealthCheckResult[] {
    return Array.from(this.lastResults.values()).filter((r) => !r.healthy);
  }

  /**
   * 获取特定数据源的最新结果
   */
  getFeedHealth(
    protocol: OracleProtocol,
    chain: SupportedChain,
    feedId: string,
  ): HealthCheckResult | undefined {
    return this.lastResults.get(`${protocol}-${chain}-${feedId}`);
  }

  // ============================================================================
  // 私有方法
  // ============================================================================

  /**
   * 创建健康检查客户端
   */
  private async createHealthCheckClient(
    protocol: OracleProtocol,
    chain: SupportedChain,
    rpcUrl: string,
  ): Promise<IHealthCheckClient> {
    switch (protocol) {
      case 'chainlink': {
        const { ChainlinkClient } = await import('@/lib/blockchain/chainlinkDataFeeds');
        return new ChainlinkClient(chain, rpcUrl);
      }
      case 'pyth': {
        const { PythClient } = await import('@/lib/blockchain/pythOracle');
        return new PythClient(chain, rpcUrl);
      }
      case 'redstone': {
        const { RedStoneClient } = await import('@/lib/blockchain/redstoneOracle');
        return new RedStoneClient(chain, rpcUrl);
      }
      case 'uma': {
        const { UMAClient } = await import('@/lib/blockchain/umaOracle');
        return new UMAClient(chain, rpcUrl);
      }
      default:
        throw new Error(`Unsupported protocol: ${protocol}`);
    }
  }

  /**
   * 保存健康检查结果到数据库
   */
  private async saveHealthCheckResult(result: HealthCheckResult): Promise<void> {
    try {
      await query(
        `INSERT INTO oracle_health_checks (
          protocol, chain, feed_id, healthy, last_update, staleness_seconds,
          issues, checked_at, latency_ms, active_assertions, active_disputes, total_bonded
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (protocol, chain, feed_id) DO UPDATE SET
          healthy = EXCLUDED.healthy,
          last_update = EXCLUDED.last_update,
          staleness_seconds = EXCLUDED.staleness_seconds,
          issues = EXCLUDED.issues,
          checked_at = EXCLUDED.checked_at,
          latency_ms = EXCLUDED.latency_ms,
          active_assertions = EXCLUDED.active_assertions,
          active_disputes = EXCLUDED.active_disputes,
          total_bonded = EXCLUDED.total_bonded`,
        [
          result.protocol,
          result.chain,
          result.feedId,
          result.healthy,
          result.lastUpdate,
          result.stalenessSeconds,
          JSON.stringify(result.issues),
          result.checkedAt,
          result.latencyMs,
          result.activeAssertions ?? null,
          result.activeDisputes ?? null,
          result.totalBonded?.toString() ?? null,
        ],
      );
    } catch (error) {
      logger.error('Failed to save health check result', {
        error: error instanceof Error ? error.message : String(error),
        protocol: result.protocol,
        feedId: result.feedId,
      });
    }
  }
}

// ============================================================================
// 单例实例
// ============================================================================

export const oracleHealthMonitor = new OracleHealthMonitor();

// ============================================================================
// 便捷函数
// ============================================================================

export async function checkFeedHealth(
  protocol: OracleProtocol,
  chain: SupportedChain,
  feedId: string,
  rpcUrl: string,
): Promise<HealthCheckResult> {
  return oracleHealthMonitor.checkFeedHealth(protocol, chain, feedId, rpcUrl);
}

export async function checkProtocolFeeds(
  protocol: OracleProtocol,
  chain: SupportedChain,
  feedIds: string[],
  rpcUrl: string,
): Promise<HealthCheckResult[]> {
  return oracleHealthMonitor.checkProtocolFeeds(protocol, chain, feedIds, rpcUrl);
}

export async function getProtocolHealthSummary(
  protocol: OracleProtocol,
): Promise<ProtocolHealthSummary> {
  return oracleHealthMonitor.getProtocolHealthSummary(protocol);
}

export function startHealthMonitoring(
  protocol: OracleProtocol,
  chain: SupportedChain,
  feedIds: string[],
  rpcUrl: string,
): Promise<void> {
  return oracleHealthMonitor.startMonitoring(protocol, chain, feedIds, rpcUrl);
}

export function stopHealthMonitoring(protocol: OracleProtocol, chain: SupportedChain): void {
  oracleHealthMonitor.stopMonitoring(protocol, chain);
}

export function stopAllHealthMonitoring(): void {
  oracleHealthMonitor.stopAllMonitoring();
}
