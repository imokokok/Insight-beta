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
import { bandSyncManager } from './bandSync';
import { API3SyncManager } from './api3Sync';
import { startRedStoneSync, stopRedStoneSync } from './redstoneSync';
import { SwitchboardSyncService } from './switchboardSync';
import { startFluxSync, stopFluxSync } from './fluxSync';
import { startDIASync, stopDIASync } from './diaSync';
import { query } from '@/server/db';
import { getUnifiedInstance } from './unifiedConfig';
import { AlertRuleEngine } from '@/server/alerts/alertRuleEngine';
import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// 服务配置
// ============================================================================

const SERVICE_CONFIG = {
  // 聚合任务间隔（毫秒）
  aggregationIntervalMs: 30000, // 30秒

  // 健康检查间隔
  healthCheckIntervalMs: 60000, // 1分钟

  // 告警检查间隔
  alertCheckIntervalMs: 60000, // 1分钟

  // 默认聚合的交易对
  defaultSymbols: ['ETH/USD', 'BTC/USD', 'LINK/USD', 'MATIC/USD', 'AVAX/USD'],

  // 是否自动启动同步
  autoStartSync: true,
};

// ============================================================================
// 统一服务管理器
// ============================================================================

/** Sync manager interface for stopping sync services */
interface SyncManager {
  stopAllSync?: () => void;
  stop?: () => void;
}

export class UnifiedOracleService {
  private isRunning = false;
  private aggregationInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;
  private activeSyncManagers: Map<string, SyncManager> = new Map();
  private alertRuleEngine: AlertRuleEngine;
  private alertCheckInterval?: NodeJS.Timeout;

  constructor() {
    this.alertRuleEngine = new AlertRuleEngine();
  }

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

      // 6. 启动告警规则引擎
      await this.startAlertEngine();

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
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
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

            case 'band':
              await this.startBandSync(id, row.chain);
              break;

            case 'api3':
              await this.startAPI3Sync(id);
              break;

            case 'redstone':
              await startRedStoneSync(id);
              this.activeSyncManagers.set(id, { stopAllSync: () => stopRedStoneSync(id) });
              break;

            case 'switchboard':
              await this.startSwitchboardSync(id);
              break;

            case 'flux':
              await startFluxSync(id);
              this.activeSyncManagers.set(id, { stopAllSync: () => stopFluxSync(id) });
              break;

            case 'dia':
              await startDIASync(id);
              this.activeSyncManagers.set(id, { stopAllSync: () => stopDIASync(id) });
              break;

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
   * 启动 API3 同步
   */
  private async startAPI3Sync(instanceId: string): Promise<void> {
    const manager = new API3SyncManager();
    await manager.startSync(instanceId);
    this.activeSyncManagers.set(instanceId, {
      stopAllSync: () => manager.stopSync(instanceId),
    });
  }

  /**
   * 启动 Band 同步
   */
  private async startBandSync(instanceId: string, chain: string): Promise<void> {
    const instance = await getUnifiedInstance(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    // 从 protocolConfig 中获取配置或使用默认值
    const protocolConfig = instance.config.protocolConfig as
      | {
          symbols?: string[];
          bandEndpoint?: string;
        }
      | undefined;

    const symbols = protocolConfig?.symbols || SERVICE_CONFIG.defaultSymbols;
    const bandEndpoint = protocolConfig?.bandEndpoint;

    // 动态导入 BandSyncService 以避免循环依赖
    const { BandSyncService } = await import('./bandSync');

    const service = new BandSyncService({
      instanceId,
      chain: chain as SupportedChain,
      rpcUrl: instance.config.rpcUrl || '',
      bandEndpoint,
      symbols,
      intervalMs: instance.config.syncIntervalMs || 60000,
    });

    await service.start();
    this.activeSyncManagers.set(instanceId, {
      stopAllSync: () => service.stop(),
    });

    logger.info('Band sync started', { instanceId, chain, symbolsCount: symbols.length });
  }

  /**
   * 启动 Switchboard 同步
   */
  private async startSwitchboardSync(instanceId: string): Promise<void> {
    const instance = await getUnifiedInstance(instanceId);
    if (!instance) {
      throw new Error(`Instance ${instanceId} not found`);
    }

    // 从 protocolConfig 中获取 symbols 或使用默认值
    const symbols =
      (instance.config.protocolConfig as { symbols?: string[] } | undefined)?.symbols ||
      SERVICE_CONFIG.defaultSymbols;

    const service = new SwitchboardSyncService({
      instanceId,
      chain: instance.chain,
      rpcUrl: instance.config.rpcUrl || '',
      symbols,
      intervalMs: instance.config.syncIntervalMs || 60000,
    });

    await service.start();
    this.activeSyncManagers.set(instanceId, {
      stopAllSync: () => service.stop(),
    });
  }

  /**
   * 停止所有协议同步
   */
  private async stopAllProtocolSync(): Promise<void> {
    logger.info('Stopping all protocol sync services...');

    // 停止 Chainlink 同步
    try {
      chainlinkSyncManager.stopAllSync();
      logger.debug('Chainlink sync stopped');
    } catch (error) {
      logger.error('Error stopping Chainlink sync', { error });
    }

    // 停止 Pyth 同步
    try {
      pythSyncManager.stopAllSync();
      logger.debug('Pyth sync stopped');
    } catch (error) {
      logger.error('Error stopping Pyth sync', { error });
    }

    // 停止 Band 同步
    try {
      bandSyncManager.stopAllSync();
      logger.debug('Band sync stopped');
    } catch (error) {
      logger.error('Error stopping Band sync', { error });
    }

    // 停止所有活跃的同步管理器
    for (const [instanceId, manager] of this.activeSyncManagers.entries()) {
      try {
        if (typeof manager.stopAllSync === 'function') {
          manager.stopAllSync();
        } else if (typeof manager.stop === 'function') {
          manager.stop();
        }
        logger.debug(`Sync stopped for instance: ${instanceId}`);
      } catch (error) {
        logger.error(`Error stopping sync for ${instanceId}`, { error });
      }
    }

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
   * 启动告警规则引擎
   */
  private async startAlertEngine(): Promise<void> {
    try {
      // 加载告警规则
      await this.alertRuleEngine.loadRules();
      logger.info('Alert rules loaded', { count: this.alertRuleEngine.getRuleCount() });

      // 启动定期检查
      this.alertCheckInterval = setInterval(() => {
        this.checkAlerts();
      }, SERVICE_CONFIG.alertCheckIntervalMs);

      logger.info('Alert engine started');
    } catch (error) {
      logger.error('Failed to start alert engine', { error });
    }
  }

  /**
   * 检查告警规则
   */
  private async checkAlerts(): Promise<void> {
    try {
      // 获取最新的价格数据用于告警检查
      const priceData = await query(`
        SELECT DISTINCT ON (symbol) 
          symbol,
          price,
          protocol,
          chain,
          timestamp
        FROM unified_price_feeds
        ORDER BY symbol, timestamp DESC
      `);

      // 为每个价格数据评估规则
      for (const row of priceData.rows) {
        const context = {
          symbol: row.symbol,
          price: parseFloat(row.price),
          protocol: row.protocol,
          chain: row.chain,
          timestamp: row.timestamp,
        };

        await this.alertRuleEngine.evaluateAllRules(context);
      }
    } catch (error) {
      logger.error('Alert check failed', { error });
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
