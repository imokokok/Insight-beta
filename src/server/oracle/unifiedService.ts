/**
 * Unified Oracle Service
 *
 * 通用预言机平台主服务
 * - 协调所有协议的同步服务
 * - 管理价格聚合
 * - 启动 WebSocket 流
 */

import { logger } from '@/lib/logger';
import { ensureUnifiedSchema } from '@/server/unifiedSchema';
import { priceAggregationEngine } from './priceAggregationService';
import { priceStreamManager } from '@/server/websocket/priceStream';
import { chainlinkSyncManager } from './chainlinkSync';
import { pythSyncManager } from './pythSync';
import { query } from '@/server/db';

// ============================================================================
// 服务配置
// ============================================================================

const SERVICE_CONFIG = {
  // 聚合任务间隔（毫秒）
  aggregationIntervalMs: 30000, // 30秒

  // 健康检查间隔
  healthCheckIntervalMs: 60000, // 1分钟

  // 默认聚合的交易对
  defaultSymbols: ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD', 'AVAX/USD'],

  // 是否自动启动同步
  autoStartSync: true,
};

// ============================================================================
// 统一服务管理器
// ============================================================================

export class UnifiedOracleService {
  private isRunning = false;
  private aggregationInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private activeSyncManagers: Map<string, unknown> = new Map();

  /**
   * 启动统一服务
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('Unified oracle service already running');
      return;
    }

    logger.info('Starting unified oracle service...');

    try {
      // 1. 确保数据库 Schema
      await ensureUnifiedSchema();
      logger.info('Database schema ensured');

      // 2. 启动 WebSocket 价格流
      priceStreamManager.start();
      logger.info('Price stream manager started');

      // 3. 启动协议同步服务
      if (SERVICE_CONFIG.autoStartSync) {
        await this.startProtocolSync();
      }

      // 4. 启动定时聚合任务
      this.startAggregationTask();

      // 5. 启动健康检查
      this.startHealthCheck();

      this.isRunning = true;
      logger.info('Unified oracle service started successfully');
    } catch (error) {
      logger.error('Failed to start unified oracle service', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 停止统一服务
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;

    logger.info('Stopping unified oracle service...');

    // 停止定时任务
    if (this.aggregationInterval) {
      clearInterval(this.aggregationInterval);
    }
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // 停止所有同步服务
    await this.stopAllProtocolSync();

    // 停止 WebSocket 流
    priceStreamManager.stop();

    this.isRunning = false;
    logger.info('Unified oracle service stopped');
  }

  /**
   * 启动协议同步服务
   */
  private async startProtocolSync(): Promise<void> {
    try {
      // 获取所有启用的实例
      const result = await query(
        `SELECT id, protocol, chain, enabled 
         FROM unified_oracle_instances 
         WHERE enabled = true`,
      );

      logger.info(`Found ${result.rows.length} enabled oracle instances`);

      for (const row of result.rows) {
        const { id, protocol } = row;

        try {
          switch (protocol) {
            case 'chainlink':
              await chainlinkSyncManager.startSync(id);
              this.activeSyncManagers.set(id, chainlinkSyncManager);
              break;

            case 'pyth':
              await pythSyncManager.startSync(id);
              this.activeSyncManagers.set(id, pythSyncManager);
              break;

            // 其他协议可以在这里添加
            // case 'band':
            // case 'api3':
            // ...

            default:
              logger.warn(`Unknown protocol: ${protocol}, skipping sync for ${id}`);
          }
        } catch (error) {
          logger.error(`Failed to start sync for ${id}`, {
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      logger.info(`Started ${this.activeSyncManagers.size} sync managers`);
    } catch (error) {
      logger.error('Failed to start protocol sync', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 停止所有协议同步
   */
  private async stopAllProtocolSync(): Promise<void> {
    // 停止 Chainlink 同步
    chainlinkSyncManager.stopAllSync();

    // 停止 Pyth 同步
    pythSyncManager.stopAllSync();

    this.activeSyncManagers.clear();
    logger.info('All protocol sync stopped');
  }

  /**
   * 启动定时聚合任务
   */
  private startAggregationTask(): void {
    logger.info('Starting price aggregation task');

    // 立即执行一次
    this.runAggregation();

    // 设置定时任务
    this.aggregationInterval = setInterval(() => {
      this.runAggregation();
    }, SERVICE_CONFIG.aggregationIntervalMs);
  }

  /**
   * 执行价格聚合
   */
  private async runAggregation(): Promise<void> {
    try {
      logger.debug('Running price aggregation...');

      const results = await priceAggregationEngine.aggregateMultipleSymbols(
        SERVICE_CONFIG.defaultSymbols,
      );

      logger.debug(`Aggregated ${results.length} symbols`, {
        symbols: results.map((r) => r.symbol),
      });

      // 广播更新到所有 WebSocket 客户端
      for (const comparison of results) {
        priceStreamManager.broadcast({
          type: 'comparison_update',
          data: comparison,
        });
      }
    } catch (error) {
      logger.error('Price aggregation failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 启动健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, SERVICE_CONFIG.healthCheckIntervalMs);
  }

  /**
   * 执行健康检查
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const streamStats = priceStreamManager.getStats();
      const syncCount = this.activeSyncManagers.size;

      logger.debug('Health check', {
        wsClients: streamStats.totalClients,
        wsSubscriptions: streamStats.totalSubscriptions,
        activeSyncs: syncCount,
        isRunning: this.isRunning,
      });

      // 检查同步服务健康状态
      const unhealthyInstances = await query(
        `SELECT instance_id, status, consecutive_failures 
         FROM unified_sync_state 
         WHERE status IN ('error', 'stalled') 
           AND consecutive_failures > 3`,
      );

      if (unhealthyInstances.rows.length > 0) {
        logger.warn('Unhealthy sync instances detected', {
          count: unhealthyInstances.rows.length,
          instances: unhealthyInstances.rows.map((r) => r.instance_id),
        });
      }
    } catch (error) {
      logger.error('Health check failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 获取服务状态
   */
  getStatus(): {
    isRunning: boolean;
    wsStats: ReturnType<typeof priceStreamManager.getStats>;
    activeSyncs: number;
  } {
    return {
      isRunning: this.isRunning,
      wsStats: priceStreamManager.getStats(),
      activeSyncs: this.activeSyncManagers.size,
    };
  }

  /**
   * 手动触发聚合
   */
  async triggerAggregation(symbols?: string[]): Promise<void> {
    const targetSymbols = symbols || SERVICE_CONFIG.defaultSymbols;
    await priceAggregationEngine.aggregateMultipleSymbols(targetSymbols);
  }
}

// ============================================================================
// 单例导出
// ============================================================================

export const unifiedOracleService = new UnifiedOracleService();

// ============================================================================
// 便捷函数
// ============================================================================

export async function startUnifiedService(): Promise<void> {
  return unifiedOracleService.start();
}

export async function stopUnifiedService(): Promise<void> {
  return unifiedOracleService.stop();
}

export function getServiceStatus(): ReturnType<typeof unifiedOracleService.getStatus> {
  return unifiedOracleService.getStatus();
}

export async function triggerManualAggregation(symbols?: string[]): Promise<void> {
  return unifiedOracleService.triggerAggregation(symbols);
}
