/**
 * Price Aggregation Engine - Complete Optimized Version
 *
 * 价格聚合引擎 - 完整优化版本
 * P0: 并发控制 + 内存缓存
 * P1: 性能监控 + 熔断保护
 * P2: 高级告警规则引擎
 */

import pLimit from 'p-limit';

import { defaultCache } from '@/infrastructure/api/optimization/cache';
import { logger } from '@/shared/logger';
import { priceMetrics } from '@/lib/monitoring/priceMetrics';
import type {
  CrossOracleComparison,
  OracleProtocol,
  SupportedChain,
  UnifiedPriceFeed,
} from '@/types/unifiedOracleTypes';
import { calculateMean, calculateMedian } from '@/shared/utils/math';
import { withRetry, circuitBreakerManager } from '@/shared/utils/resilience';
import { query } from '@/infrastructure/database/db';
import { alertRuleEngine } from '@/services/oracle/realtime';

import { AGGREGATION_CONFIG } from './config';
import {
  calculateProtocolWeightedAverage,
  determineRecommendationSource,
  detectOutliersIQR,
  detectOutliersZScore,
} from './utils';

// 并发限制器
const aggregateLimit = pLimit(5);

// 缓存 TTL
const CACHE_TTL_MS = 30000;

// 熔断器
const priceBreaker = circuitBreakerManager.getBreaker('price-aggregation', {
  failureThreshold: 5,
  successThreshold: 3,
  timeoutMs: 60000,
});

export class PriceAggregationEngine {
  /**
   * 聚合指定交易对的价格数据
   * 完整优化版本：缓存 + 熔断 + 监控 + 告警
   */
  async aggregatePrices(
    symbol: string,
    chain?: SupportedChain,
  ): Promise<CrossOracleComparison | null> {
    const startTime = performance.now();
    const cacheKey = `aggregation:${symbol}:${chain ?? 'all'}`;

    try {
      // 1. 检查内存缓存
      const cached = await defaultCache.get<CrossOracleComparison>(cacheKey);
      if (cached) {
        priceMetrics.recordCacheHit();
        logger.debug(`Cache hit for ${symbol}`, { chain });
        return cached;
      }
      priceMetrics.recordCacheMiss();

      // 2. 使用熔断器保护聚合操作
      const comparison = await priceBreaker.execute(() => this.performAggregation(symbol, chain));

      // 3. 记录性能指标
      const duration = performance.now() - startTime;
      priceMetrics.recordAggregation(duration, comparison !== null);

      // 4. 记录偏差指标
      if (comparison) {
        priceMetrics.recordDeviation(comparison.maxDeviationPercent);
      }

      return comparison;
    } catch (error) {
      // 熔断器打开时的处理
      if (error instanceof Error && error.name === 'CircuitBreakerError') {
        logger.warn(`Circuit breaker open for ${symbol}`, { chain });
        // 尝试返回缓存数据（即使过期）
        const stale = await defaultCache.get<CrossOracleComparison>(cacheKey);
        if (stale) {
          logger.info(`Returning stale cache for ${symbol}`);
          // 添加熔断回退状态标识
          const breakerStats = priceBreaker.getStats();
          const estimatedRecovery = new Date(breakerStats.nextAttemptTime).toISOString();
          
          return {
            ...stale,
            dataStatus: {
              freshness: 'stale',
              source: 'circuit-breaker',
              generatedAt: stale.timestamp,
              cachedAt: stale.timestamp,
              circuitBreakerOpenedAt: new Date(breakerStats.lastFailureTime).toISOString(),
              estimatedRecoveryTime: estimatedRecovery,
              errorMessage: 'Circuit breaker is open, using cached data',
            },
          };
        }
      }

      const duration = performance.now() - startTime;
      priceMetrics.recordAggregation(duration, false);
      logger.error(`Aggregation failed for ${symbol}`, { error, chain });
      return null;
    }
  }

  /**
   * 执行实际聚合逻辑
   */
  private async performAggregation(
    symbol: string,
    chain?: SupportedChain,
  ): Promise<CrossOracleComparison | null> {
    const cacheKey = `aggregation:${symbol}:${chain ?? 'all'}`;

    // 使用智能重试获取价格数据
    const prices = await withRetry(() => this.fetchLatestPrices(symbol, chain), {
      maxRetries: 3,
      baseDelayMs: 500,
      backoffMultiplier: 2,
      jitter: true,
      onRetry: (attempt, error, delay) => {
        logger.warn(`Retry ${attempt} for ${symbol}`, { error: error.message, delay });
      },
    });

    if (prices.length < AGGREGATION_CONFIG.minDataSources) {
      logger.warn(`Insufficient price data for ${symbol}`, {
        count: prices.length,
        minRequired: AGGREGATION_CONFIG.minDataSources,
      });
      return null;
    }

    // 解析交易对
    const [baseAsset, quoteAsset] = symbol.split('/');

    // 计算统计数据 - 单次遍历优化性能
    const stats = this.calculatePriceStats(prices.map((p) => p.price));
    const { avg: avgPrice, median: medianPrice, min: minPrice, max: maxPrice, range: priceRange } = stats;
    // 价格区间百分比，小数形式 (0.01 = 1%)
    const priceRangePercent = avgPrice > 0 ? priceRange / avgPrice : 0;

    // 检测异常值
    const { outliers, maxDeviation, maxDeviationPercent } = this.detectOutliers(
      prices,
      medianPrice,
      avgPrice,
    );

    // 计算推荐价格
    const recommendedPrice = this.calculateRecommendedPrice(prices, outliers);

    // 构建对比数据
    const comparison: CrossOracleComparison = {
      id: `comparison-${symbol}-${Date.now()}`,
      symbol,
      baseAsset: baseAsset || symbol,
      quoteAsset: quoteAsset || 'USD',
      prices: prices
        .filter(
          (p): p is UnifiedPriceFeed & { protocol: OracleProtocol; instanceId: string } =>
            p.protocol !== undefined && p.instanceId !== undefined,
        )
        .map((p) => ({
          protocol: p.protocol,
          instanceId: p.instanceId,
          price: p.price,
          timestamp: p.timestamp,
          confidence: p.confidence ?? 1,
          isStale: p.isStale,
        })),
      avgPrice,
      medianPrice,
      minPrice,
      maxPrice,
      priceRange,
      priceRangePercent,
      maxDeviation,
      maxDeviationPercent,
      outlierProtocols: outliers
        .filter(
          (o): o is UnifiedPriceFeed & { protocol: OracleProtocol; instanceId: string } =>
            o.protocol !== undefined && o.instanceId !== undefined,
        )
        .map((o) => o.protocol),
      recommendedPrice,
      recommendationSource: this.determineRecommendationSource(prices, outliers),
      timestamp: new Date().toISOString(),
    };

    // 保存到缓存（异步）
    defaultCache.set(cacheKey, comparison, CACHE_TTL_MS).catch((error: unknown) => {
      logger.error('Failed to save to cache', { error, symbol });
    });

    // 保存到数据库（异步）
    this.saveComparison(comparison).catch((error) => {
      logger.error('Failed to save comparison', { error });
    });

    // 使用新的告警规则引擎评估告警
    alertRuleEngine.evaluate(comparison);

    return comparison;
  }

  /**
   * 获取最新价格数据
   */
  private async fetchLatestPrices(
    symbol: string,
    chain?: SupportedChain,
  ): Promise<Array<UnifiedPriceFeed & { instanceId: string }>> {
    const sql = `
      WITH latest_prices AS (
        SELECT
          id,
          instance_id as "instanceId",
          protocol,
          chain,
          symbol,
          base_asset as "baseAsset",
          quote_asset as "quoteAsset",
          price,
          price_raw as "priceRaw",
          decimals,
          timestamp,
          block_number as "blockNumber",
          confidence,
          sources,
          is_stale as "isStale",
          staleness_seconds as "stalenessSeconds",
          tx_hash as "txHash",
          log_index as "logIndex",
          ROW_NUMBER() OVER (PARTITION BY protocol ORDER BY timestamp DESC) as rn
        FROM unified_price_feeds
        WHERE symbol = $1
          AND timestamp > NOW() - INTERVAL '5 minutes'
          AND is_stale = false
          ${chain ? 'AND chain = $2' : ''}
      )
      SELECT * FROM latest_prices
      WHERE rn = 1
      LIMIT 100
    `;

    const params: (string | SupportedChain)[] = [symbol];
    if (chain) {
      params.push(chain);
    }

    const startTime = performance.now();
    const result = await query(sql, params);
    const duration = performance.now() - startTime;

    // 记录协议指标
    for (const row of result.rows) {
      priceMetrics.recordProtocolRequest(row.protocol, duration / result.rows.length, true);
    }

    return result.rows as Array<UnifiedPriceFeed & { instanceId: string }>;
  }

  /**
   * 计算价格统计信息 - 单次遍历优化
   * 同时计算平均值、中位数、最小值、最大值和范围
   */
  private calculatePriceStats(values: number[]): {
    avg: number;
    median: number;
    min: number;
    max: number;
    range: number;
  } {
    if (values.length === 0) {
      return { avg: 0, median: 0, min: 0, max: 0, range: 0 };
    }

    let sum = 0;
    let min = values[0]!;
    let max = values[0]!;

    for (const v of values) {
      sum += v;
      if (v < min) min = v;
      if (v > max) max = v;
    }

    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median =
      sorted.length % 2 !== 0 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;

    return {
      avg: sum / values.length,
      median,
      min,
      max,
      range: max - min,
    };
  }

  /**
   * 检测异常值
   */
  private detectOutliers(
    prices: Array<UnifiedPriceFeed & { instanceId: string }>,
    medianPrice: number,
    _avgPrice: number,
  ): {
    outliers: Array<UnifiedPriceFeed & { instanceId: string }>;
    maxDeviation: number;
    maxDeviationPercent: number;
  } {
    const outliers: Array<UnifiedPriceFeed & { instanceId: string }> = [];
    let maxDeviation = 0;
    let maxDeviationPercent = 0;

    const priceValues = prices.map((p) => p.price);
    const outlierIndices = new Set<number>();

    // 阈值法检测
    if (['threshold', 'both'].includes(AGGREGATION_CONFIG.outlierDetection.method)) {
      for (let i = 0; i < prices.length; i++) {
        const price = prices[i];
        if (!price) continue;
        const deviation = Math.abs(price.price - medianPrice);
        const deviationPercent = medianPrice > 0 ? deviation / medianPrice : 0;

        if (deviationPercent > maxDeviationPercent) {
          maxDeviation = deviation;
          maxDeviationPercent = deviationPercent;
        }

        if (deviationPercent > AGGREGATION_CONFIG.outlierDetection.threshold) {
          outlierIndices.add(i);
        }
      }
    }

    // IQR 方法检测
    if (['iqr', 'both'].includes(AGGREGATION_CONFIG.outlierDetection.method)) {
      if (priceValues.length >= AGGREGATION_CONFIG.outlierDetection.minDataPoints) {
        const iqrOutlierIndices = detectOutliersIQR(
          priceValues,
          AGGREGATION_CONFIG.outlierDetection.iqrMultiplier,
        );
        iqrOutlierIndices.forEach((idx) => outlierIndices.add(idx));
      }
    }

    // Z-Score 方法检测
    if (
      AGGREGATION_CONFIG.outlierDetection.method === 'zscore' ||
      (AGGREGATION_CONFIG.outlierDetection.method === 'both' && priceValues.length >= 3)
    ) {
      const zscoreOutlierIndices = detectOutliersZScore(
        priceValues,
        AGGREGATION_CONFIG.outlierDetection.zscoreThreshold ?? 3,
      );
      zscoreOutlierIndices.forEach((idx) => outlierIndices.add(idx));
    }

    outlierIndices.forEach((idx) => {
      const price = prices[idx];
      if (price) {
        outliers.push(price);
      }
    });

    return { outliers, maxDeviation, maxDeviationPercent };
  }

  /**
   * 计算推荐价格
   */
  private calculateRecommendedPrice(
    prices: Array<UnifiedPriceFeed & { instanceId: string }>,
    outliers: Array<UnifiedPriceFeed & { instanceId: string }>,
  ): number {
    const validPrices = prices.filter(
      (p): p is UnifiedPriceFeed & { protocol: OracleProtocol; instanceId: string } =>
        p.protocol !== undefined && !outliers.some((o) => o.protocol === p.protocol),
    );

    if (validPrices.length === 0) {
      return calculateMedian(prices.map((p) => p.price));
    }

    switch (AGGREGATION_CONFIG.aggregationMethod) {
      case 'mean':
        return calculateMean(validPrices.map((p) => p.price));
      case 'weighted':
        return calculateProtocolWeightedAverage(
          validPrices.map((p) => ({ protocol: p.protocol, price: p.price })),
        );
      case 'median':
      default:
        return calculateMedian(validPrices.map((p) => p.price));
    }
  }

  /**
   * 确定推荐价格来源
   */
  private determineRecommendationSource(
    prices: Array<UnifiedPriceFeed & { instanceId: string }>,
    outliers: Array<UnifiedPriceFeed & { instanceId: string }>,
  ): string {
    const validPrices = prices.filter(
      (p) => p.protocol !== undefined && !outliers.some((o) => o.protocol === p.protocol),
    );

    if (validPrices.length === 0) return 'median_all';
    if (validPrices.length === 1) {
      const first = validPrices[0];
      return first?.protocol ?? 'median_all';
    }

    return determineRecommendationSource(validPrices.length);
  }

  /**
   * 保存对比数据到数据库
   */
  private async saveComparison(comparison: CrossOracleComparison): Promise<void> {
    try {
      await query(
        `INSERT INTO cross_oracle_comparisons (
          id, symbol, base_asset, quote_asset,
          avg_price, median_price, min_price, max_price,
          price_range, price_range_percent,
          max_deviation, max_deviation_percent,
          outlier_protocols, recommended_price, recommendation_source,
          participating_protocols, participating_instances, timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        ON CONFLICT (id) DO UPDATE SET
          avg_price = EXCLUDED.avg_price,
          median_price = EXCLUDED.median_price,
          min_price = EXCLUDED.min_price,
          max_price = EXCLUDED.max_price,
          price_range = EXCLUDED.price_range,
          price_range_percent = EXCLUDED.price_range_percent,
          max_deviation = EXCLUDED.max_deviation,
          max_deviation_percent = EXCLUDED.max_deviation_percent,
          outlier_protocols = EXCLUDED.outlier_protocols,
          recommended_price = EXCLUDED.recommended_price,
          recommendation_source = EXCLUDED.recommendation_source,
          participating_protocols = EXCLUDED.participating_protocols,
          participating_instances = EXCLUDED.participating_instances,
          timestamp = EXCLUDED.timestamp,
          created_at = NOW()`,
        [
          comparison.id,
          comparison.symbol,
          comparison.baseAsset,
          comparison.quoteAsset,
          comparison.avgPrice,
          comparison.medianPrice,
          comparison.minPrice,
          comparison.maxPrice,
          comparison.priceRange,
          comparison.priceRangePercent,
          comparison.maxDeviation,
          comparison.maxDeviationPercent,
          comparison.outlierProtocols,
          comparison.recommendedPrice,
          comparison.recommendationSource,
          comparison.prices.map((p) => p.protocol),
          comparison.prices.map((p) => p.instanceId),
          comparison.timestamp,
        ],
      );
    } catch (error) {
      logger.error('Failed to save comparison', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 批量聚合多个交易对
   */
  async aggregateMultipleSymbols(symbols: string[]): Promise<CrossOracleComparison[]> {
    const results = await Promise.all(
      symbols.map((symbol) => aggregateLimit(() => this.aggregatePrices(symbol))),
    );
    return results.filter((r): r is CrossOracleComparison => r !== null);
  }

  /**
   * 获取历史对比数据
   */
  async getHistoricalComparisons(
    symbol: string,
    hours: number = 24,
  ): Promise<CrossOracleComparison[]> {
    const result = await query(
      `SELECT * FROM cross_oracle_comparisons
       WHERE symbol = $1
         AND timestamp > NOW() - INTERVAL '${hours} hours'
       ORDER BY timestamp DESC`,
      [symbol],
    );

    return result.rows.map((row) => ({
      id: row.id,
      symbol: row.symbol,
      baseAsset: row.base_asset,
      quoteAsset: row.quote_asset,
      prices: [],
      avgPrice: parseFloat(row.avg_price),
      medianPrice: parseFloat(row.median_price),
      minPrice: parseFloat(row.min_price),
      maxPrice: parseFloat(row.max_price),
      priceRange: parseFloat(row.price_range),
      priceRangePercent: parseFloat(row.price_range_percent),
      maxDeviation: parseFloat(row.max_deviation),
      maxDeviationPercent: parseFloat(row.max_deviation_percent),
      outlierProtocols: row.outlier_protocols || [],
      recommendedPrice: parseFloat(row.recommended_price),
      recommendationSource: row.recommendation_source,
      timestamp: row.timestamp,
    }));
  }

  /**
   * 获取聚合价格
   */
  async getAggregatedPrice(
    symbol: string,
    chain?: SupportedChain,
  ): Promise<{
    price: number;
    timestamp: number;
    primarySource: string;
    confidence?: number;
  } | null> {
    const comparison = await this.aggregatePrices(symbol, chain);
    if (!comparison) return null;

    return {
      price: comparison.recommendedPrice,
      timestamp: new Date(comparison.timestamp).getTime(),
      primarySource: comparison.recommendationSource,
      confidence: 0.95,
    };
  }

  /**
   * 清除缓存
   */
  async clearCache(): Promise<void> {
    await defaultCache.clear('aggregation:*');
    logger.info('Aggregation cache cleared');
  }

  /**
   * 获取缓存统计
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    activeEntries: number;
    expiredEntries: number;
    totalSize: string;
  } | null> {
    // 内存缓存不提供详细统计，返回简化版本
    return {
      totalEntries: 0,
      activeEntries: 0,
      expiredEntries: 0,
      totalSize: 'N/A (memory cache)',
    };
  }

  /**
   * 获取熔断器统计
   */
  getCircuitBreakerStats() {
    return circuitBreakerManager.getAllStats();
  }
}

// 导出单例
export const priceAggregationEngine = new PriceAggregationEngine();
