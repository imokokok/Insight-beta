/**
 * Unified Oracle Service
 *
 * 通用预言机平台主服务 - Refactored Version
 * - 协调所有协议的同步服务
 * - 管理价格聚合
 * - 启动 WebSocket 流
 */

import { logger } from '@/lib/logger';
import { ensureUnifiedSchema } from '@/server/unifiedSchema';
import { priceStreamManager } from '@/server/websocket/priceStream';
import { getServiceConfig } from './config/serviceConfig';
import { ProtocolSyncManager } from './managers/ProtocolSyncManager';
import { AggregationManager } from './managers/AggregationManager';
import { HealthCheckManager } from './managers/HealthCheckManager';
import { AlertManager } from './managers/AlertManager';
import type { ServiceStatus } from './types/serviceTypes';

export class UnifiedOracleService {
  private isRunning = false;
  private protocolSyncManager: ProtocolSyncManager;
  private aggregationManager: AggregationManager;
  private healthCheckManager: HealthCheckManager;
  private alertManager: AlertManager;
  private config: ReturnType<typeof getServiceConfig>;

  constructor() {
    this.config = getServiceConfig();
    this.protocolSyncManager = new ProtocolSyncManager();
    this.aggregationManager = new AggregationManager(
      this.config.defaultSymbols,
      this.config.aggregationIntervalMs,
    );
    this.healthCheckManager = new HealthCheckManager(this.config.healthCheckIntervalMs);
    this.alertManager = new AlertManager(this.config.alertCheckIntervalMs);
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
      if (this.config.autoStartSync) {
        await this.protocolSyncManager.startAllSync();
      }

      // 4. 启动定时聚合任务
      this.aggregationManager.start();

      // 5. 启动健康检查
      this.healthCheckManager.start((result) => {
        result.activeSyncs = this.protocolSyncManager.getActiveSyncCount();
      });

      // 6. 启动告警规则引擎
      await this.alertManager.start();

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

    // 停止各个管理器
    this.aggregationManager.stop();
    this.healthCheckManager.stop();
    this.alertManager.stop();

    // 停止协议同步
    await this.protocolSyncManager.stopAllSync();

    // 停止 WebSocket 流
    priceStreamManager.stop();

    this.isRunning = false;
    logger.info('Unified oracle service stopped');
  }

  /**
   * 获取服务状态
   */
  getStatus(): ServiceStatus {
    return {
      isRunning: this.isRunning,
      wsStats: priceStreamManager.getStats(),
      activeSyncs: this.protocolSyncManager.getActiveSyncCount(),
    };
  }

  /**
   * 手动触发聚合
   */
  async triggerAggregation(symbols?: string[]): Promise<void> {
    await this.aggregationManager.aggregate(symbols);
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

export function getServiceStatus(): ServiceStatus {
  return unifiedOracleService.getStatus();
}

export async function triggerManualAggregation(symbols?: string[]): Promise<void> {
  return unifiedOracleService.triggerAggregation(symbols);
}
