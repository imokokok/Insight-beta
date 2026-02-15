/**
 * Realtime Price Aggregation Service
 *
 * P0 优化：实时价格聚合服务
 * - WebSocket 连接池管理
 * - 多协议价格订阅
 * - 批量聚合和推送
 * - 适用于 Supabase + Vercel 架构
 */

import { EventEmitter } from 'events';

import pLimit from 'p-limit';

import { PriceAggregationEngine } from '@/services/oracle/priceAggregation/engine';
import { logger } from '@/shared/logger';
import type {
  CrossOracleComparison,
  OracleProtocol,
  SupportedChain,
} from '@/types/unifiedOracleTypes';


// ============================================================================
// 配置常量
// ============================================================================

const CONFIG = {
  // 聚合配置
  AGGREGATION_INTERVAL_MS: 5000, // 5秒聚合间隔
  MAX_CONCURRENT_AGGREGATION: 5, // 最大并发聚合数

  // WebSocket 配置
  WS_HEARTBEAT_INTERVAL_MS: 30000, // 30秒心跳
  WS_MAX_CONNECTIONS: 100, // 最大连接数

  // 缓存配置
  CACHE_TTL_MS: 30000, // 30秒缓存

  // 批处理配置
  BATCH_SIZE: 50, // 每批处理数量
  BATCH_INTERVAL_MS: 1000, // 批处理间隔
};

// ============================================================================
// 类型定义
// ============================================================================

interface Subscription {
  symbols: string[];
  protocols: OracleProtocol[];
  chains: SupportedChain[];
  clientId: string;
  lastUpdateAt: number;
}

interface PriceUpdate {
  symbol: string;
  comparison: CrossOracleComparison;
  timestamp: number;
}

interface ServiceStats {
  activeSubscriptions: number;
  totalConnections: number;
  lastAggregationAt: number;
  avgAggregationTimeMs: number;
  /** 缓存命中率，小数形式 (如 0.5 = 50%) */
  cacheHitRate: number;
}

// ============================================================================
// 实时价格服务
// ============================================================================

export class RealtimePriceService extends EventEmitter {
  private engine: PriceAggregationEngine;
  private subscriptions: Map<string, Subscription> = new Map();
  private priceCache: Map<string, { data: CrossOracleComparison; timestamp: number }> = new Map();
  private aggregationTimer: NodeJS.Timeout | null = null;
  private isRunning = false;
  private stats: ServiceStats = {
    activeSubscriptions: 0,
    totalConnections: 0,
    lastAggregationAt: 0,
    avgAggregationTimeMs: 0,
    cacheHitRate: 0,
  };

  // 并发限制器
  private aggregateLimit = pLimit(CONFIG.MAX_CONCURRENT_AGGREGATION);

  // 批处理队列
  private pendingSymbols: Set<string> = new Set();
  private batchTimer: NodeJS.Timeout | null = null;

  // 缓存上限配置
  private readonly MAX_CACHE_SIZE = 1000;
  private readonly MAX_SUBSCRIPTIONS = 500;

  constructor() {
    super();
    this.engine = new PriceAggregationEngine();
  }

  // ============================================================================
  // 服务生命周期
  // ============================================================================

  /**
   * 启动服务
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    logger.info('RealtimePriceService started');

    // 启动定时聚合
    this.startAggregationLoop();

    this.emit('started');
  }

  /**
   * 停止服务
   */
  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.aggregationTimer) {
      clearInterval(this.aggregationTimer);
      this.aggregationTimer = null;
    }

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    this.subscriptions.clear();
    this.priceCache.clear();
    this.pendingSymbols.clear();

    // 移除所有事件监听器，防止内存泄漏
    this.removeAllListeners();

    logger.info('RealtimePriceService stopped');
    this.emit('stopped');
  }

  // ============================================================================
  // 订阅管理
  // ============================================================================

  /**
   * 添加订阅
   */
  subscribe(
    clientId: string,
    symbols: string[],
    options: {
      protocols?: OracleProtocol[];
      chains?: SupportedChain[];
    } = {},
  ): void {
    // 检查订阅数量上限
    if (this.subscriptions.size >= this.MAX_SUBSCRIPTIONS) {
      logger.warn('Max subscriptions reached, rejecting new subscription', { clientId });
      this.emit('subscriptionRejected', { clientId, reason: 'max_subscriptions_reached' });
      return;
    }

    const subscription: Subscription = {
      symbols: [...symbols],
      protocols: options.protocols || [],
      chains: options.chains || [],
      clientId,
      lastUpdateAt: Date.now(),
    };

    this.subscriptions.set(clientId, subscription);
    this.stats.activeSubscriptions = this.subscriptions.size;

    // 立即触发一次聚合
    symbols.forEach((symbol) => this.pendingSymbols.add(symbol));
    this.scheduleBatchAggregation();

    logger.debug('Client subscribed', { clientId, symbols: symbols.length });
    this.emit('subscribed', { clientId, symbols });
  }

  /**
   * 取消订阅
   */
  unsubscribe(clientId: string): void {
    const existed = this.subscriptions.delete(clientId);
    if (existed) {
      this.stats.activeSubscriptions = this.subscriptions.size;
      logger.debug('Client unsubscribed', { clientId });
      this.emit('unsubscribed', { clientId });
    }
  }

  /**
   * 更新订阅
   */
  updateSubscription(
    clientId: string,
    symbols: string[],
    options: {
      protocols?: OracleProtocol[];
      chains?: SupportedChain[];
    } = {},
  ): void {
    const existing = this.subscriptions.get(clientId);
    if (!existing) {
      this.subscribe(clientId, symbols, options);
      return;
    }

    existing.symbols = [...symbols];
    if (options.protocols) existing.protocols = options.protocols;
    if (options.chains) existing.chains = options.chains;
    existing.lastUpdateAt = Date.now();

    // 触发新符号的聚合
    symbols.forEach((symbol) => this.pendingSymbols.add(symbol));
    this.scheduleBatchAggregation();

    logger.debug('Subscription updated', { clientId, symbols: symbols.length });
  }

  // ============================================================================
  // 聚合逻辑
  // ============================================================================

  /**
   * 启动定时聚合循环
   */
  private startAggregationLoop(): void {
    this.aggregationTimer = setInterval(() => {
      // 添加错误处理，防止定时器回调中的未处理 Promise 拒绝
      this.performAggregation().catch((error) => {
        logger.error('Scheduled aggregation failed', { error });
      });
    }, CONFIG.AGGREGATION_INTERVAL_MS);
  }

  /**
   * 执行聚合
   */
  private async performAggregation(): Promise<void> {
    const startTime = Date.now();

    // 收集所有需要聚合的符号
    const allSymbols = new Set<string>();
    for (const sub of this.subscriptions.values()) {
      sub.symbols.forEach((s) => allSymbols.add(s));
    }

    if (allSymbols.size === 0) return;

    // 检查缓存，过滤掉未过期的
    const symbolsToAggregate: string[] = [];
    for (const symbol of allSymbols) {
      const cached = this.priceCache.get(symbol);
      if (!cached || Date.now() - cached.timestamp > CONFIG.CACHE_TTL_MS) {
        symbolsToAggregate.push(symbol);
      }
    }

    if (symbolsToAggregate.length === 0) {
      this.stats.cacheHitRate = 1; // 100% 缓存命中率
      return;
    }

    try {
      // 批量聚合（带并发控制）
      const results = await this.batchAggregate(symbolsToAggregate);

      // 更新缓存（带上限检查）
      const updates: PriceUpdate[] = [];
      for (const result of results) {
        if (result) {
          // 检查缓存大小，如果超过上限则清理最旧的条目
          if (this.priceCache.size >= this.MAX_CACHE_SIZE) {
            const oldestKey = this.priceCache.keys().next().value;
            if (oldestKey) {
              this.priceCache.delete(oldestKey);
            }
          }
          this.priceCache.set(result.symbol, {
            data: result,
            timestamp: Date.now(),
          });
          updates.push({
            symbol: result.symbol,
            comparison: result,
            timestamp: Date.now(),
          });
        }
      }

      // 推送更新
      if (updates.length > 0) {
        this.pushUpdates(updates);
      }

      // 更新统计
      const duration = Date.now() - startTime;
      this.stats.lastAggregationAt = Date.now();
      this.stats.avgAggregationTimeMs = this.stats.avgAggregationTimeMs * 0.9 + duration * 0.1;
      // 缓存命中率，小数形式 (0.5 = 50%)
      this.stats.cacheHitRate = (allSymbols.size - symbolsToAggregate.length) / allSymbols.size;

      logger.debug('Aggregation completed', {
        symbols: symbolsToAggregate.length,
        duration,
        cacheHitRate: `${(this.stats.cacheHitRate * 100).toFixed(1)}%`,
      });
    } catch (error) {
      logger.error('Aggregation failed', { error });
    }
  }

  /**
   * 批量聚合（带并发控制）
   */
  private async batchAggregate(symbols: string[]): Promise<(CrossOracleComparison | null)[]> {
    const batches: string[][] = [];
    for (let i = 0; i < symbols.length; i += CONFIG.BATCH_SIZE) {
      batches.push(symbols.slice(i, i + CONFIG.BATCH_SIZE));
    }

    const results: (CrossOracleComparison | null)[] = [];

    for (const batch of batches) {
      const batchResults = await Promise.all(
        batch.map((symbol) => this.aggregateLimit(() => this.engine.aggregatePrices(symbol))),
      );
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * 调度批处理聚合
   */
  private scheduleBatchAggregation(): void {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      if (this.pendingSymbols.size > 0) {
        const symbols = Array.from(this.pendingSymbols);
        this.pendingSymbols.clear();
        this.aggregateSymbols(symbols);
      }
    }, CONFIG.BATCH_INTERVAL_MS);
  }

  /**
   * 立即聚合指定符号
   */
  private async aggregateSymbols(symbols: string[]): Promise<void> {
    try {
      const results = await this.batchAggregate(symbols);

      const updates: PriceUpdate[] = [];
      for (const result of results) {
        if (result) {
          this.priceCache.set(result.symbol, {
            data: result,
            timestamp: Date.now(),
          });
          updates.push({
            symbol: result.symbol,
            comparison: result,
            timestamp: Date.now(),
          });
        }
      }

      if (updates.length > 0) {
        this.pushUpdates(updates);
      }
    } catch (error) {
      logger.error('Immediate aggregation failed', { error, symbols });
    }
  }

  // ============================================================================
  // 推送逻辑
  // ============================================================================

  /**
   * 推送更新到客户端
   */
  private pushUpdates(updates: PriceUpdate[]): void {
    const updateMap = new Map(updates.map((u) => [u.symbol, u]));

    for (const [clientId, subscription] of this.subscriptions) {
      const relevantUpdates: PriceUpdate[] = [];

      for (const symbol of subscription.symbols) {
        const update = updateMap.get(symbol);
        if (update) {
          relevantUpdates.push(update);
        }
      }

      if (relevantUpdates.length > 0) {
        this.emit('priceUpdate', {
          clientId,
          updates: relevantUpdates,
        });

        subscription.lastUpdateAt = Date.now();
      }
    }

    logger.debug('Updates pushed', {
      updates: updates.length,
      clients: this.subscriptions.size,
    });
  }

  // ============================================================================
  // 查询接口
  // ============================================================================

  /**
   * 获取最新价格
   */
  getLatestPrice(symbol: string): CrossOracleComparison | null {
    const cached = this.priceCache.get(symbol);
    if (cached && Date.now() - cached.timestamp < CONFIG.CACHE_TTL_MS) {
      return cached.data;
    }
    return null;
  }

  /**
   * 获取多个最新价格
   */
  getLatestPrices(symbols: string[]): Map<string, CrossOracleComparison> {
    const result = new Map<string, CrossOracleComparison>();
    const now = Date.now();

    for (const symbol of symbols) {
      const cached = this.priceCache.get(symbol);
      if (cached && now - cached.timestamp < CONFIG.CACHE_TTL_MS) {
        result.set(symbol, cached.data);
      }
    }

    return result;
  }

  /**
   * 获取服务统计
   */
  getStats(): ServiceStats {
    return { ...this.stats };
  }

  /**
   * 获取所有订阅的符号
   */
  getSubscribedSymbols(): string[] {
    const symbols = new Set<string>();
    for (const sub of this.subscriptions.values()) {
      sub.symbols.forEach((s) => symbols.add(s));
    }
    return Array.from(symbols);
  }
}

// 导出单例
export const realtimePriceService = new RealtimePriceService();
