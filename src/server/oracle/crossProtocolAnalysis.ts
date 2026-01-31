/**
 * Cross-Protocol Price Analysis Service
 *
 * 跨协议价格对比分析服务
 * 提供高级价格偏差检测、置信度评分、趋势分析等功能
 */

import { query } from '@/server/db';
import { logger } from '@/lib/logger';
import type { OracleProtocol, SupportedChain } from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// Types
// ============================================================================

export interface PriceDeviationConfig {
  warningThreshold: number; // 警告阈值 (%)
  criticalThreshold: number; // 严重阈值 (%)
  minDataPoints: number; // 最小数据点数量
  timeWindowMinutes: number; // 时间窗口 (分钟)
}

export interface CrossProtocolPrice {
  protocol: OracleProtocol;
  chain: SupportedChain;
  symbol: string;
  price: number;
  timestamp: Date;
  confidence?: number;
  isStale: boolean;
  stalenessSeconds?: number;
}

export interface DeviationAlert {
  severity: 'warning' | 'critical' | 'info';
  protocol: OracleProtocol;
  chain: SupportedChain;
  symbol: string;
  price: number;
  referencePrice: number;
  deviationPercent: number;
  message: string;
  timestamp: Date;
}

export interface ProtocolReliability {
  protocol: OracleProtocol;
  totalUpdates: number;
  staleUpdates: number;
  avgDeviationFromMedian: number;
  maxDeviationFromMedian: number;
  reliabilityScore: number; // 0-100
  lastUpdated: Date;
}

export interface PriceConsensus {
  symbol: string;
  timestamp: Date;
  consensusPrice: number;
  consensusMethod: 'median' | 'weighted' | 'trimmed_mean';
  participatingProtocols: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  priceRange: {
    min: number;
    max: number;
    spread: number;
    spreadPercent: number;
  };
}

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_CONFIG: PriceDeviationConfig = {
  warningThreshold: 0.5, // 0.5%
  criticalThreshold: 1.0, // 1%
  minDataPoints: 3,
  timeWindowMinutes: 5,
};

// ============================================================================
// Core Analysis Functions
// ============================================================================

/**
 * 获取指定币种在所有协议中的最新价格
 */
export async function getCrossProtocolPrices(
  symbol: string,
  timeWindowMinutes: number = 5,
): Promise<CrossProtocolPrice[]> {
  const result = await query(
    `
    SELECT DISTINCT ON (protocol, chain)
      protocol,
      chain,
      symbol,
      price,
      timestamp,
      confidence,
      is_stale,
      staleness_seconds
    FROM unified_price_feeds
    WHERE symbol = $1
      AND timestamp > NOW() - INTERVAL '${timeWindowMinutes} minutes'
      AND is_stale = false
    ORDER BY protocol, chain, timestamp DESC
    `,
    [symbol],
  );

  return result.rows.map((row) => ({
    protocol: row.protocol as OracleProtocol,
    chain: row.chain as SupportedChain,
    symbol: row.symbol,
    price: parseFloat(row.price),
    timestamp: new Date(row.timestamp),
    confidence: row.confidence ? parseFloat(row.confidence) : undefined,
    isStale: row.is_stale,
    stalenessSeconds: row.staleness_seconds,
  }));
}

/**
 * 计算加权中位数价格
 * 考虑各协议的置信度和历史可靠性
 */
export async function calculateWeightedConsensus(
  prices: CrossProtocolPrice[],
  protocolWeights?: Map<OracleProtocol, number>,
): Promise<{ price: number; method: string; confidence: number }> {
  if (prices.length === 0) {
    throw new Error('No prices available for consensus calculation');
  }

  if (prices.length === 1) {
    const firstPrice = prices[0]!;
    return {
      price: firstPrice.price,
      method: 'single_source',
      confidence: firstPrice.confidence || 0.5,
    };
  }

  // 获取协议可靠性评分
  const reliabilityScores = await getProtocolReliabilityScores(
    prices.map((p) => p.protocol),
  );

  // 计算权重（结合置信度和可靠性）
  const weightedPrices = prices.map((p) => {
    const reliability = reliabilityScores.get(p.protocol) || 0.5;
    const confidence = p.confidence || 0.5;
    const customWeight = protocolWeights?.get(p.protocol) || 1;
    const weight = confidence * reliability * customWeight;
    return { price: p.price, weight };
  });

  // 按价格排序
  weightedPrices.sort((a, b) => a.price - b.price);

  // 计算加权中位数
  const totalWeight = weightedPrices.reduce((sum, wp) => sum + wp.weight, 0);
  let cumulativeWeight = 0;
  let medianPrice = weightedPrices[0]!.price;

  for (const wp of weightedPrices) {
    cumulativeWeight += wp.weight;
    if (cumulativeWeight >= totalWeight / 2) {
      medianPrice = wp.price;
      break;
    }
  }

  // 计算整体置信度
  const avgConfidence =
    weightedPrices.reduce((sum, wp) => sum + wp.weight, 0) / weightedPrices.length;

  return {
    price: medianPrice,
    method: 'weighted_median',
    confidence: Math.min(avgConfidence * prices.length, 1), // 数据源越多置信度越高
  };
}

/**
 * 检测价格偏差并生成告警
 */
export async function detectPriceDeviations(
  symbol: string,
  config: Partial<PriceDeviationConfig> = {},
): Promise<{
  consensus: PriceConsensus;
  deviations: DeviationAlert[];
  healthy: CrossProtocolPrice[];
}> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  // 获取所有协议的价格
  const prices = await getCrossProtocolPrices(symbol, finalConfig.timeWindowMinutes);

  if (prices.length < finalConfig.minDataPoints) {
    throw new Error(
      `Insufficient data points: ${prices.length} < ${finalConfig.minDataPoints}`,
    );
  }

  // 计算共识价格（使用加权中位数）
  const consensusResult = await calculateWeightedConsensus(prices);
  const consensusPrice = consensusResult.price;

  // 计算价格范围
  const priceValues = prices.map((p) => p.price);
  const minPrice = Math.min(...priceValues);
  const maxPrice = Math.max(...priceValues);
  const priceRange = maxPrice - minPrice;
  const spreadPercent = (priceRange / consensusPrice) * 100;

  // 生成共识结果
  const consensus: PriceConsensus = {
    symbol,
    timestamp: new Date(),
    consensusPrice,
    consensusMethod: consensusResult.method as 'median' | 'weighted' | 'trimmed_mean',
    participatingProtocols: prices.length,
    confidenceLevel:
      consensusResult.confidence > 0.8 ? 'high' : consensusResult.confidence > 0.5 ? 'medium' : 'low',
    priceRange: {
      min: minPrice,
      max: maxPrice,
      spread: priceRange,
      spreadPercent,
    },
  };

  // 检测偏差
  const deviations: DeviationAlert[] = [];
  const healthy: CrossProtocolPrice[] = [];

  for (const price of prices) {
    const deviationPercent = ((price.price - consensusPrice) / consensusPrice) * 100;
    const absDeviation = Math.abs(deviationPercent);

    if (absDeviation > finalConfig.criticalThreshold) {
      deviations.push({
        severity: 'critical',
        protocol: price.protocol,
        chain: price.chain,
        symbol,
        price: price.price,
        referencePrice: consensusPrice,
        deviationPercent,
        message: `Critical price deviation: ${absDeviation.toFixed(2)}% from consensus`,
        timestamp: new Date(),
      });
    } else if (absDeviation > finalConfig.warningThreshold) {
      deviations.push({
        severity: 'warning',
        protocol: price.protocol,
        chain: price.chain,
        symbol,
        price: price.price,
        referencePrice: consensusPrice,
        deviationPercent,
        message: `Warning: Price deviation of ${absDeviation.toFixed(2)}% from consensus`,
        timestamp: new Date(),
      });
    } else {
      healthy.push(price);
    }
  }

  // 记录分析结果
  logger.info('Cross-protocol price analysis completed', {
    symbol,
    consensusPrice,
    participatingProtocols: prices.length,
    deviationCount: deviations.length,
    healthyCount: healthy.length,
  });

  return { consensus, deviations, healthy };
}

/**
 * 获取协议可靠性评分
 */
export async function getProtocolReliabilityScores(
  protocols: OracleProtocol[],
): Promise<Map<OracleProtocol, number>> {
  const scores = new Map<OracleProtocol, number>();

  for (const protocol of protocols) {
    const result = await query(
      `
      SELECT
        COUNT(*) as total_updates,
        COUNT(*) FILTER (WHERE is_stale = true) as stale_count,
        AVG(ABS(price - sub.median_price) / sub.median_price * 100) as avg_deviation
      FROM unified_price_feeds
      CROSS JOIN (
        SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) as median_price
        FROM unified_price_feeds
        WHERE protocol = $1
          AND timestamp > NOW() - INTERVAL '24 hours'
      ) sub
      WHERE protocol = $1
        AND timestamp > NOW() - INTERVAL '24 hours'
      `,
      [protocol],
    );

    const row = result.rows[0];
    if (row) {
      const totalUpdates = parseInt(row.total_updates) || 1;
      const staleCount = parseInt(row.stale_count) || 0;
      const avgDeviation = parseFloat(row.avg_deviation) || 0;

      // 计算可靠性评分 (0-100)
      const freshnessScore = ((totalUpdates - staleCount) / totalUpdates) * 100;
      const accuracyScore = Math.max(0, 100 - avgDeviation * 10);
      const reliabilityScore = freshnessScore * 0.5 + accuracyScore * 0.5;

      scores.set(protocol, Math.min(100, Math.max(0, reliabilityScore)) / 100);
    } else {
      scores.set(protocol, 0.5); // 默认中等可靠性
    }
  }

  return scores;
}

/**
 * 获取详细的协议可靠性报告
 */
export async function getProtocolReliabilityReport(
  protocol: OracleProtocol,
): Promise<ProtocolReliability> {
  const result = await query(
    `
    SELECT
      COUNT(*) as total_updates,
      COUNT(*) FILTER (WHERE is_stale = true) as stale_updates,
      AVG(ABS(price - sub.median_price) / sub.median_price * 100) as avg_deviation,
      MAX(ABS(price - sub.median_price) / sub.median_price * 100) as max_deviation,
      MAX(timestamp) as last_updated
    FROM unified_price_feeds
    CROSS JOIN (
      SELECT PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price) as median_price
      FROM unified_price_feeds
      WHERE protocol = $1
        AND timestamp > NOW() - INTERVAL '24 hours'
    ) sub
    WHERE protocol = $1
      AND timestamp > NOW() - INTERVAL '24 hours'
    `,
    [protocol],
  );

  const row = result.rows[0];
  if (!row) {
    return {
      protocol,
      totalUpdates: 0,
      staleUpdates: 0,
      avgDeviationFromMedian: 0,
      maxDeviationFromMedian: 0,
      reliabilityScore: 50,
      lastUpdated: new Date(),
    };
  }

  const totalUpdates = parseInt(row.total_updates) || 0;
  const staleUpdates = parseInt(row.stale_updates) || 0;
  const avgDeviation = parseFloat(row.avg_deviation) || 0;
  const maxDeviation = parseFloat(row.max_deviation) || 0;

  // 计算可靠性评分
  const freshnessScore = totalUpdates > 0 ? ((totalUpdates - staleUpdates) / totalUpdates) * 100 : 0;
  const accuracyScore = Math.max(0, 100 - avgDeviation * 10);
  const reliabilityScore = freshnessScore * 0.5 + accuracyScore * 0.5;

  return {
    protocol,
    totalUpdates,
    staleUpdates,
    avgDeviationFromMedian: avgDeviation,
    maxDeviationFromMedian: maxDeviation,
    reliabilityScore: Math.round(reliabilityScore),
    lastUpdated: new Date(row.last_updated),
  };
}

// ============================================================================
// Trend Analysis
// ============================================================================

export interface PriceTrend {
  symbol: string;
  protocol: OracleProtocol;
  chain: SupportedChain;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  volatility: number;
  timeWindow: string;
}

/**
 * 分析价格趋势
 */
export async function analyzePriceTrends(
  symbol: string,
  timeWindowHours: number = 1,
): Promise<PriceTrend[]> {
  const result = await query(
    `
    WITH price_stats AS (
      SELECT
        protocol,
        chain,
        symbol,
        FIRST_VALUE(price) OVER (PARTITION BY protocol, chain ORDER BY timestamp) as first_price,
        LAST_VALUE(price) OVER (PARTITION BY protocol, chain ORDER BY timestamp 
          RANGE BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING) as last_price,
        STDDEV(price) as price_stddev,
        AVG(price) as avg_price
      FROM unified_price_feeds
      WHERE symbol = $1
        AND timestamp > NOW() - INTERVAL '${timeWindowHours} hours'
      GROUP BY protocol, chain, symbol, timestamp
    )
    SELECT DISTINCT
      protocol,
      chain,
      symbol,
      first_price,
      last_price,
      price_stddev,
      avg_price
    FROM price_stats
    `,
    [symbol],
  );

  return result.rows.map((row) => {
    const firstPrice = parseFloat(row.first_price);
    const lastPrice = parseFloat(row.last_price);
    const avgPrice = parseFloat(row.avg_price);
    const stddev = parseFloat(row.price_stddev) || 0;

    const changePercent = ((lastPrice - firstPrice) / firstPrice) * 100;
    const volatility = avgPrice > 0 ? (stddev / avgPrice) * 100 : 0;

    let trend: 'up' | 'down' | 'stable';
    if (Math.abs(changePercent) < 0.1) {
      trend = 'stable';
    } else if (changePercent > 0) {
      trend = 'up';
    } else {
      trend = 'down';
    }

    return {
      symbol: row.symbol,
      protocol: row.protocol as OracleProtocol,
      chain: row.chain as SupportedChain,
      trend,
      changePercent,
      volatility,
      timeWindow: `${timeWindowHours}h`,
    };
  });
}

// ============================================================================
// Batch Analysis
// ============================================================================

export interface BatchAnalysisResult {
  symbol: string;
  consensus: PriceConsensus;
  deviations: DeviationAlert[];
  healthy: CrossProtocolPrice[];
  trends: PriceTrend[];
  reliability: Map<OracleProtocol, number>;
}

/**
 * 批量分析多个币种
 */
export async function batchAnalyzeSymbols(
  symbols: string[],
  config: Partial<PriceDeviationConfig> = {},
): Promise<BatchAnalysisResult[]> {
  const results: BatchAnalysisResult[] = [];

  for (const symbol of symbols) {
    try {
      const { consensus, deviations, healthy } = await detectPriceDeviations(symbol, config);
      const trends = await analyzePriceTrends(symbol, 1);
      const reliability = await getProtocolReliabilityScores(
        healthy.map((p) => p.protocol),
      );

      results.push({
        symbol,
        consensus,
        deviations,
        healthy,
        trends,
        reliability,
      });
    } catch (error) {
      logger.warn(`Failed to analyze symbol ${symbol}`, {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return results;
}

// ============================================================================
// Alert Management
// ============================================================================

/**
 * 保存偏差告警到数据库
 */
export async function saveDeviationAlerts(alerts: DeviationAlert[]): Promise<void> {
  for (const alert of alerts) {
    await query(
      `
      INSERT INTO unified_alerts (
        protocol, chain, alert_type, severity, message, details, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (protocol, chain, alert_type, created_at)
      DO UPDATE SET
        message = EXCLUDED.message,
        details = EXCLUDED.details,
        status = 'open'
      `,
      [
        alert.protocol,
        alert.chain,
        'price_deviation',
        alert.severity,
        alert.message,
        JSON.stringify({
          symbol: alert.symbol,
          price: alert.price,
          referencePrice: alert.referencePrice,
          deviationPercent: alert.deviationPercent,
        }),
        'open',
      ],
    );
  }

  logger.info(`Saved ${alerts.length} deviation alerts`);
}

/**
 * 运行完整的跨协议分析并生成告警
 */
export async function runCrossProtocolAnalysis(
  symbols: string[],
  config: Partial<PriceDeviationConfig> = {},
): Promise<{
  analyzed: number;
  alertsGenerated: number;
  details: BatchAnalysisResult[];
}> {
  const results = await batchAnalyzeSymbols(symbols, config);

  let totalAlerts = 0;
  for (const result of results) {
    if (result.deviations.length > 0) {
      await saveDeviationAlerts(result.deviations);
      totalAlerts += result.deviations.length;
    }
  }

  logger.info('Cross-protocol analysis completed', {
    symbolsAnalyzed: results.length,
    alertsGenerated: totalAlerts,
  });

  return {
    analyzed: results.length,
    alertsGenerated: totalAlerts,
    details: results,
  };
}
