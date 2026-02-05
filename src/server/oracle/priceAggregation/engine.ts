/**
 * Price Aggregation Engine
 *
 * 价格聚合引擎
 */

import { logger } from '@/lib/logger';
import { query } from '@/server/db';
import type {
  CrossOracleComparison,
  SupportedChain,
  UnifiedPriceFeed,
} from '@/lib/types/unifiedOracleTypes';
import { calculateMean, calculateMedian } from '@/lib/utils/math';
import { AGGREGATION_CONFIG } from './config';
import { calculateProtocolWeightedAverage, determineRecommendationSource } from './utils';

export class PriceAggregationEngine {
  /**
   * 聚合指定交易对的价格数据
   */
  async aggregatePrices(
    symbol: string,
    chain?: SupportedChain,
  ): Promise<CrossOracleComparison | null> {
    try {
      // 获取所有协议的实时价格
      const prices = await this.fetchLatestPrices(symbol, chain);

      if (prices.length < AGGREGATION_CONFIG.minDataSources) {
        logger.warn(`Insufficient price data for ${symbol}`, {
          count: prices.length,
          minRequired: AGGREGATION_CONFIG.minDataSources,
        });
        return null;
      }

      // 解析交易对
      const [baseAsset, quoteAsset] = symbol.split('/');

      // 计算统计数据
      const priceValues = prices.map((p) => p.price);
      const avgPrice = calculateMean(priceValues);
      const medianPrice = calculateMedian(priceValues);
      const minPrice = Math.min(...priceValues);
      const maxPrice = Math.max(...priceValues);
      const priceRange = maxPrice - minPrice;
      const priceRangePercent = (priceRange / avgPrice) * 100;

      // 检测异常值
      const { outliers, maxDeviation, maxDeviationPercent } = this.detectOutliers(
        prices,
        medianPrice,
      );

      // 计算推荐价格
      const recommendedPrice = this.calculateRecommendedPrice(prices, outliers);

      // 构建对比数据
      const comparison: CrossOracleComparison = {
        id: `comparison-${symbol}-${Date.now()}`,
        symbol,
        baseAsset: baseAsset || symbol,
        quoteAsset: quoteAsset || 'USD',
        prices: prices.map((p) => ({
          protocol: p.protocol,
          instanceId: p.instanceId,
          price: p.price,
          timestamp: p.timestamp,
          confidence: p.confidence,
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
        outlierProtocols: outliers.map((o) => o.protocol),
        recommendedPrice,
        recommendationSource: this.determineRecommendationSource(prices, outliers),
        timestamp: new Date().toISOString(),
      };

      // 保存到数据库
      await this.saveComparison(comparison);

      // 检查是否需要触发告警
      await this.checkDeviationAlerts(comparison);

      return comparison;
    } catch (error) {
      logger.error(`Failed to aggregate prices for ${symbol}`, {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * 获取最新价格数据
   */
  private async fetchLatestPrices(
    symbol: string,
    chain?: SupportedChain,
  ): Promise<
    Array<
      UnifiedPriceFeed & {
        instanceId: string;
      }
    >
  > {
    let sql = `
      SELECT DISTINCT ON (protocol)
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
        log_index as "logIndex"
      FROM unified_price_feeds
      WHERE symbol = $1
        AND timestamp > NOW() - INTERVAL '5 minutes'
        AND is_stale = false
    `;

    const params: (string | SupportedChain)[] = [symbol];

    if (chain) {
      sql += ` AND chain = $2`;
      params.push(chain);
    }

    sql += ` ORDER BY protocol, timestamp DESC`;

    const result = await query(sql, params);

    return result.rows as Array<UnifiedPriceFeed & { instanceId: string }>;
  }

  /**
   * 检测异常值
   */
  private detectOutliers(
    prices: Array<UnifiedPriceFeed & { instanceId: string }>,
    medianPrice: number,
  ): {
    outliers: Array<UnifiedPriceFeed & { instanceId: string }>;
    maxDeviation: number;
    maxDeviationPercent: number;
  } {
    const outliers: Array<UnifiedPriceFeed & { instanceId: string }> = [];
    let maxDeviation = 0;
    let maxDeviationPercent = 0;

    for (const price of prices) {
      const deviation = Math.abs(price.price - medianPrice);
      const deviationPercent = (deviation / medianPrice) * 100;

      if (deviationPercent > maxDeviationPercent) {
        maxDeviation = deviation;
        maxDeviationPercent = deviationPercent;
      }

      // 如果偏差超过阈值，标记为异常值
      if (deviationPercent > AGGREGATION_CONFIG.deviationThreshold * 100) {
        outliers.push(price);
      }
    }

    return { outliers, maxDeviation, maxDeviationPercent };
  }

  /**
   * 计算推荐价格
   */
  private calculateRecommendedPrice(
    prices: Array<UnifiedPriceFeed & { instanceId: string }>,
    outliers: Array<UnifiedPriceFeed & { instanceId: string }>,
  ): number {
    // 过滤掉异常值
    const validPrices = prices.filter((p) => !outliers.some((o) => o.protocol === p.protocol));

    if (validPrices.length === 0) {
      // 如果所有价格都是异常值，使用中位数
      return calculateMedian(prices.map((p) => p.price));
    }

    switch (AGGREGATION_CONFIG.aggregationMethod) {
      case 'mean':
        return calculateMean(validPrices.map((p) => p.price));

      case 'weighted':
        return calculateProtocolWeightedAverage(validPrices);

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
    const validPrices = prices.filter((p) => !outliers.some((o) => o.protocol === p.protocol));

    if (validPrices.length === 0) return 'median_all';
    if (validPrices.length === 1) {
      const first = validPrices[0];
      return first === undefined ? 'median_all' : first.protocol;
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
   * 检查偏差告警
   */
  private async checkDeviationAlerts(comparison: CrossOracleComparison): Promise<void> {
    // 严重偏差告警
    if (comparison.maxDeviationPercent > AGGREGATION_CONFIG.severeDeviationThreshold * 100) {
      await this.createAlert({
        event: 'price_deviation_severe',
        severity: 'critical',
        title: `Severe Price Deviation: ${comparison.symbol}`,
        message: `Price deviation of ${comparison.maxDeviationPercent.toFixed(2)}% detected across protocols for ${comparison.symbol}`,
        symbol: comparison.symbol,
        context: {
          maxDeviationPercent: comparison.maxDeviationPercent,
          outlierProtocols: comparison.outlierProtocols,
          prices: comparison.prices,
        },
      });
    }
    // 一般偏差告警
    else if (comparison.maxDeviationPercent > AGGREGATION_CONFIG.deviationThreshold * 100) {
      await this.createAlert({
        event: 'price_deviation',
        severity: 'warning',
        title: `Price Deviation: ${comparison.symbol}`,
        message: `Price deviation of ${comparison.maxDeviationPercent.toFixed(2)}% detected across protocols for ${comparison.symbol}`,
        symbol: comparison.symbol,
        context: {
          maxDeviationPercent: comparison.maxDeviationPercent,
          outlierProtocols: comparison.outlierProtocols,
          prices: comparison.prices,
        },
      });
    }
  }

  /**
   * 创建告警
   */
  private async createAlert({
    event,
    severity,
    title,
    message,
    symbol,
    context,
  }: {
    event: string;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    symbol: string;
    context: Record<string, unknown>;
  }): Promise<void> {
    try {
      await query(
        `INSERT INTO unified_alerts (
          id, event, severity, title, message, symbol, context, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'open')
        ON CONFLICT (id) DO NOTHING`,
        [
          `alert-${event}-${symbol}-${Date.now()}`,
          event,
          severity,
          title,
          message,
          symbol,
          JSON.stringify(context),
        ],
      );
    } catch (error) {
      logger.error('Failed to create alert', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * 批量聚合多个交易对
   * 使用 Promise.all 并行处理以提高性能
   */
  async aggregateMultipleSymbols(symbols: string[]): Promise<CrossOracleComparison[]> {
    const results = await Promise.all(symbols.map((symbol) => this.aggregatePrices(symbol)));
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
      prices: [], // 历史数据不保存详细价格
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
      confidence: 0.95, // Default confidence
    };
  }

  /**
   * 获取跨预言机对比（别名方法）
   */
  async getCrossOracleComparison(
    symbol: string,
    chain?: SupportedChain,
  ): Promise<CrossOracleComparison | null> {
    return this.aggregatePrices(symbol, chain);
  }
}
