/**
 * Solana Prisma Service
 *
 * Solana 数据 Prisma 服务
 * - 使用 Prisma ORM 操作 PostgreSQL
 * - 替代内存存储
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '@/lib/logger';
import type {
  SolanaPriceFeed,
  SolanaPriceHistory,
  SolanaOracleInstance,
  SolanaSyncStatus,
  SolanaAlert,
} from '@/lib/db/schema/solana';

// ============================================================================
// Prisma 客户端单例
// ============================================================================

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ============================================================================
// Solana Prisma 服务
// ============================================================================

export class SolanaPrismaService {
  /**
   * 保存或更新价格喂价
   */
  async savePriceFeed(feed: SolanaPriceFeed): Promise<void> {
    try {
      await prisma.solanaPriceFeed.upsert({
        where: { id: String(feed.id) },
        update: {
          price: feed.price,
          confidence: feed.confidence || '0',
          slot: feed.slot ? BigInt(feed.slot) : undefined,
          timestamp: feed.lastUpdate,
          status: feed.isActive ? 'active' : 'inactive',
          updatedAt: new Date(),
        },
        create: {
          id: String(feed.id),
          symbol: feed.symbol,
          name: feed.symbol,
          price: feed.price,
          confidence: feed.confidence || '0',
          timestamp: feed.lastUpdate,
          slot: feed.slot ? BigInt(feed.slot) : BigInt(0),
          signature: '',
          source: feed.protocol,
          status: feed.isActive ? 'active' : 'inactive',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.debug(`Saved price feed: ${feed.symbol}`);
    } catch (error) {
      logger.error('Failed to save price feed', { error, feed });
      throw error;
    }
  }

  /**
   * 获取价格喂价
   */
  async getPriceFeed(id: number): Promise<SolanaPriceFeed | null> {
    try {
      const feed = await prisma.solanaPriceFeed.findUnique({
        where: { id: String(id) },
      });

      if (!feed) return null;

      return this.mapPriceFeedFromPrisma(feed);
    } catch (error) {
      logger.error('Failed to get price feed', { error, id });
      throw error;
    }
  }

  /**
   * 获取所有活跃的价格喂价
   */
  async getActivePriceFeeds(): Promise<SolanaPriceFeed[]> {
    try {
      const feeds = await prisma.solanaPriceFeed.findMany({
        where: { status: 'active' },
        orderBy: { timestamp: 'desc' },
      });

      return feeds.map(this.mapPriceFeedFromPrisma);
    } catch (error) {
      logger.error('Failed to get active price feeds', { error });
      throw error;
    }
  }

  /**
   * 根据 symbol 获取价格喂价
   */
  async getPriceFeedBySymbol(symbol: string): Promise<SolanaPriceFeed | null> {
    try {
      const feed = await prisma.solanaPriceFeed.findFirst({
        where: { symbol, status: 'active' },
        orderBy: { timestamp: 'desc' },
      });

      if (!feed) return null;

      return this.mapPriceFeedFromPrisma(feed);
    } catch (error) {
      logger.error('Failed to get price feed by symbol', { error, symbol });
      throw error;
    }
  }

  /**
   * 保存价格历史
   */
  async savePriceHistory(history: SolanaPriceHistory): Promise<void> {
    try {
      await prisma.solanaPriceHistory.create({
        data: {
          id: String(history.id),
          feedId: String(history.feedId),
          price: history.price,
          confidence: history.confidence || '0',
          timestamp: history.blockTime || new Date(),
          slot: BigInt(history.slot),
          signature: history.blockHash || '',
          createdAt: history.createdAt,
        },
      });

      logger.debug(`Saved price history: ${history.feedId}`);
    } catch (error) {
      logger.error('Failed to save price history', { error, history });
      throw error;
    }
  }

  /**
   * 获取价格历史
   */
  async getPriceHistory(feedId: number, limit: number = 100): Promise<SolanaPriceHistory[]> {
    try {
      const histories = await prisma.solanaPriceHistory.findMany({
        where: { feedId: String(feedId) },
        orderBy: { timestamp: 'desc' },
        take: limit,
      });

      return histories.map(this.mapPriceHistoryFromPrisma);
    } catch (error) {
      logger.error('Failed to get price history', { error, feedId });
      throw error;
    }
  }

  /**
   * 保存 Oracle 实例
   */
  async saveOracleInstance(instance: SolanaOracleInstance): Promise<void> {
    try {
      await prisma.solanaOracleInstance.upsert({
        where: { id: String(instance.id) },
        update: {
          name: instance.symbol,
          programId: instance.address,
          cluster: instance.chain,
          rpcUrl: '',
          isActive: instance.enabled,
          lastSyncAt: instance.lastSyncAt,
          updatedAt: new Date(),
        },
        create: {
          id: String(instance.id),
          name: instance.symbol,
          programId: instance.address,
          cluster: instance.chain,
          rpcUrl: '',
          isActive: instance.enabled,
          lastSyncAt: instance.lastSyncAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.debug(`Saved oracle instance: ${instance.symbol}`);
    } catch (error) {
      logger.error('Failed to save oracle instance', { error, instance });
      throw error;
    }
  }

  /**
   * 获取所有 Oracle 实例
   */
  async getOracleInstances(): Promise<SolanaOracleInstance[]> {
    try {
      const instances = await prisma.solanaOracleInstance.findMany({
        orderBy: { createdAt: 'desc' },
      });

      return instances.map(this.mapOracleInstanceFromPrisma);
    } catch (error) {
      logger.error('Failed to get oracle instances', { error });
      throw error;
    }
  }

  /**
   * 更新同步状态
   */
  async updateSyncStatus(status: SolanaSyncStatus): Promise<void> {
    try {
      await prisma.solanaSyncStatus.upsert({
        where: {
          instanceId_feedSymbol: {
            instanceId: status.instanceId,
            feedSymbol: status.instanceId,
          },
        },
        update: {
          lastSlot: status.lastProcessedSlot ? BigInt(status.lastProcessedSlot) : BigInt(0),
          lastSignature: '',
          lastTimestamp: status.lastSyncAt || new Date(),
          updatedAt: new Date(),
        },
        create: {
          id: String(status.id),
          instanceId: status.instanceId,
          feedSymbol: status.instanceId,
          lastSlot: status.lastProcessedSlot ? BigInt(status.lastProcessedSlot) : BigInt(0),
          lastSignature: '',
          lastTimestamp: status.lastSyncAt || new Date(),
          updatedAt: new Date(),
        },
      });

      logger.debug(`Updated sync status: ${status.instanceId}`);
    } catch (error) {
      logger.error('Failed to update sync status', { error, status });
      throw error;
    }
  }

  /**
   * 获取同步状态
   */
  async getSyncStatus(instanceId: string, feedSymbol: string): Promise<SolanaSyncStatus | null> {
    try {
      const status = await prisma.solanaSyncStatus.findUnique({
        where: {
          instanceId_feedSymbol: {
            instanceId,
            feedSymbol,
          },
        },
      });

      if (!status) return null;

      return this.mapSyncStatusFromPrisma(status);
    } catch (error) {
      logger.error('Failed to get sync status', { error, instanceId, feedSymbol });
      throw error;
    }
  }

  /**
   * 创建告警
   */
  async createAlert(alert: SolanaAlert): Promise<void> {
    try {
      await prisma.solanaAlert.create({
        data: {
          id: String(alert.id),
          type: alert.alertType,
          severity: alert.severity,
          symbol: alert.symbol,
          message: alert.message,
          details: (alert.details || {}) as any,
          status: alert.isResolved ? 'resolved' : 'active',
          resolvedAt: alert.resolvedAt,
          createdAt: alert.createdAt,
        },
      });

      logger.debug(`Created alert: ${alert.alertType}`);
    } catch (error) {
      logger.error('Failed to create alert', { error, alert });
      throw error;
    }
  }

  /**
   * 获取活跃告警
   */
  async getActiveAlerts(): Promise<SolanaAlert[]> {
    try {
      const alerts = await prisma.solanaAlert.findMany({
        where: { status: 'active' },
        orderBy: { createdAt: 'desc' },
      });

      return alerts.map(this.mapAlertFromPrisma);
    } catch (error) {
      logger.error('Failed to get active alerts', { error });
      throw error;
    }
  }

  /**
   * 解决告警
   */
  async resolveAlert(id: number): Promise<void> {
    try {
      await prisma.solanaAlert.update({
        where: { id: String(id) },
        data: {
          status: 'resolved',
          resolvedAt: new Date(),
        },
      });

      logger.debug(`Resolved alert: ${id}`);
    } catch (error) {
      logger.error('Failed to resolve alert', { error, id });
      throw error;
    }
  }

  // ============================================================================
  // 映射函数
  // ============================================================================

  private mapPriceFeedFromPrisma(feed: any): SolanaPriceFeed {
    return {
      id: parseInt(feed.id),
      symbol: feed.symbol,
      protocol: feed.source as 'switchboard' | 'pyth',
      chain: 'solana',
      feedAddress: '',
      decimals: 8,
      price: String(feed.price),
      confidence: feed.confidence ? String(feed.confidence) : null,
      slot: feed.slot ? Number(feed.slot) : null,
      isActive: feed.status === 'active',
      isStale: false,
      lastUpdate: feed.timestamp,
      createdAt: feed.createdAt,
      updatedAt: feed.updatedAt,
    };
  }

  private mapPriceHistoryFromPrisma(history: any): SolanaPriceHistory {
    return {
      id: parseInt(history.id),
      feedId: parseInt(history.feedId),
      price: String(history.price),
      confidence: history.confidence ? String(history.confidence) : null,
      slot: Number(history.slot),
      blockTime: history.timestamp,
      blockHash: history.signature,
      createdAt: history.createdAt,
    };
  }

  private mapOracleInstanceFromPrisma(instance: any): SolanaOracleInstance {
    return {
      id: parseInt(instance.id),
      instanceId: instance.id,
      protocol: 'switchboard',
      chain: instance.cluster as 'solana' | 'solanaDevnet',
      address: instance.programId,
      feedAddress: '',
      symbol: instance.name,
      decimals: 8,
      updateInterval: 0,
      enabled: instance.isActive,
      status: instance.isActive ? 'active' : 'stopped',
      lastSyncAt: instance.lastSyncAt,
      errorCount: 0,
      createdAt: instance.createdAt,
      updatedAt: instance.updatedAt,
    };
  }

  private mapSyncStatusFromPrisma(status: any): SolanaSyncStatus {
    return {
      id: parseInt(status.id),
      instanceId: status.instanceId,
      chain: 'solana',
      status: 'active',
      lastSyncAt: status.lastTimestamp,
      lastProcessedSlot: Number(status.lastSlot),
      errorCount: 0,
      updatedAt: status.updatedAt,
    };
  }

  private mapAlertFromPrisma(alert: any): SolanaAlert {
    return {
      id: parseInt(alert.id),
      instanceId: '',
      symbol: alert.symbol,
      alertType: alert.type as 'price_deviation' | 'stale_price' | 'sync_error',
      severity: alert.severity as 'low' | 'medium' | 'high' | 'critical',
      title: alert.message,
      message: alert.message,
      details: alert.details as Record<string, unknown>,
      isResolved: alert.status === 'resolved',
      resolvedAt: alert.resolvedAt,
      createdAt: alert.createdAt,
      updatedAt: alert.createdAt,
    };
  }
}

// ============================================================================
// 单例导出
// ============================================================================

export const solanaPrismaService = new SolanaPrismaService();
