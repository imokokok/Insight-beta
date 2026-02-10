/**
 * Price Aggregation Engine
 *
 * 价格聚合引擎
 */

import { logger } from '@/lib/logger';
import type {
  CrossOracleComparison,
  OracleProtocol,
  SupportedChain,
  UnifiedPriceFeed,
} from '@/lib/types/unifiedOracleTypes';
import { calculateMean, calculateMedian } from '@/lib/utils/math';
import { query } from '@/server/db';

import { AGGREGATION_CONFIG } from './config';
import { calculateProtocolWeightedAverage, determineRecommendationSource, detectOutliersIQR } from './utils';

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
    // 优化查询：使用窗口函数代替 DISTINCT ON，性能更好
    // 同时添加 LIMIT 防止大数据集问题
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

    const result = await query(sql, params);

    return result.rows as Array<UnifiedPriceFeed & { instanceId: string }>;
  }

  /**
   * 检测异常值
   * 
   * 统一异常检测方法：
   * - 主方法：阈值法（偏差百分比 > 阈值）
   * - 辅助方法：IQR（四分位距）统计方法
   * 
   * 配置来源：AGGREGATION_CONFIG.outlierDetection
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

    const priceValues = prices.map((p) => p.price);
    const outlierIndices = new Set<number>();

    // 1. 阈值法检测
    if (['threshold', 'both'].includes(AGGREGATION_CONFIG.outlierDetection.method)) {
      for (let i = 0; i < prices.length; i++) {
        const price = prices[i];
        const deviation = Math.abs(price.price - medianPrice);
        const deviationPercent = deviation / medianPrice; // 使用小数形式

        if (deviationPercent > maxDeviationPercent) {
          maxDeviation = deviation;
          maxDeviationPercent = deviationPercent;
        }

        // 如果偏差超过阈值，标记为异常值
        if (deviationPercent > AGGREGATION_CONFIG.outlierDetection.threshold) {
          outlierIndices.add(i);
        }
      }
    }

    // 2. IQR 方法检测（作为辅助）
    if (['iqr', 'both'].includes(AGGREGATION_CONFIG.outlierDetection.method)) {
      if (priceValues.length >= AGGREGATION_CONFIG.outlierDetection.minDataPoints) {
        const iqrOutlierIndices = detectOutliersIQR(
          priceValues,
          AGGREGATION_CONFIG.outlierDetection.iqrMultiplier,
        );
        iqrOutlierIndices.forEach((idx) => outlierIndices.add(idx));
      }
    }

    // 收集异常值
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
    // 过滤掉异常值和 protocol 为 undefined 的价格
    const validPrices = prices.filter(
      (p): p is UnifiedPriceFeed & { protocol: OracleProtocol; instanceId: string } =>
        p.protocol !== undefined && !outliers.some((o) => o.protocol === p.protocol),
    );

    if (validPrices.length === 0) {
      // 如果所有价格都是异常值，使用中位数
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
