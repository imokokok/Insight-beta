/**
 * Unified Oracle Service
 *
 * 通用预言机聚合服务
 * 提供跨协议价格数据聚合、比较和异常检测
 */

import { createOracleClient } from '@/lib/blockchain';
import { logger } from '@/lib/logger';
import type { OracleProtocol } from '@/lib/types/oracle';

export interface UnifiedPriceData {
  pair: string;
  aggregatedPrice: number;
  confidence: number;
  sources: PriceSource[];
  deviation: DeviationInfo;
  lastUpdated: string;
}

export interface PriceSource {
  protocol: string;
  price: number;
  timestamp: string;
  latency: number;
  confidence: number;
  status: 'active' | 'stale' | 'error';
}

export interface DeviationInfo {
  maxDeviation: number;
  avgDeviation: number;
  outlierProtocols: string[];
  isAnomaly: boolean;
}

export interface ProtocolComparison {
  pair: string;
  protocols: ProtocolPriceInfo[];
  analysis: ComparisonAnalysis;
  timestamp: string;
}

export interface ProtocolPriceInfo {
  protocol: string;
  price: number;
  timestamp: string;
  blockNumber?: number;
  roundId?: string;
  confidence?: number;
}

export interface ComparisonAnalysis {
  highestPrice: { protocol: string; price: number };
  lowestPrice: { protocol: string; price: number };
  priceRange: number;
  priceRangePercent: number;
  medianPrice: number;
  meanPrice: number;
  recommendations: string[];
}

export interface UnifiedQuery {
  pair: string;
  protocols?: string[];
  includeStats?: boolean;
}

export interface ComparisonQuery {
  pair: string;
  protocols?: string[];
  deviationThreshold?: number;
  includeHistory?: boolean;
}

/**
 * 获取统一价格数据
 * 聚合多个协议的价格，计算加权平均值
 */
export async function getUnifiedPriceData(query: UnifiedQuery): Promise<UnifiedPriceData> {
  const { pair, protocols } = query;

  logger.info('Fetching unified price data', { pair, protocols });

  // 定义要查询的协议列表
  const targetProtocols: OracleProtocol[] = protocols
    ? (protocols.filter((p): p is OracleProtocol =>
        ['chainlink', 'pyth', 'band', 'api3', 'uma'].includes(p),
      ) as OracleProtocol[])
    : ['chainlink', 'pyth', 'band', 'api3'];

  // 从真实数据源获取价格
  const sources: PriceSource[] = [];

  for (const protocol of targetProtocols) {
    const startTime = Date.now();
    try {
      const client = createOracleClient({ protocol, chain: 'ethereum' });
      const feed = await client.getPrice(pair);
      const latency = Date.now() - startTime;

      if (feed) {
        sources.push({
          protocol,
          price: feed.price,
          timestamp: new Date(feed.timestamp).toISOString(),
          latency,
          confidence: (feed.confidence ?? 0) * 100, // 转换为百分比
          status: feed.isStale ? 'stale' : 'active',
        });
      } else {
        sources.push({
          protocol,
          price: 0,
          timestamp: new Date().toISOString(),
          latency,
          confidence: 0,
          status: 'error',
        });
      }
    } catch (error) {
      logger.error(`Failed to fetch price from ${protocol}`, { pair, error });
      sources.push({
        protocol,
        price: 0,
        timestamp: new Date().toISOString(),
        latency: Date.now() - startTime,
        confidence: 0,
        status: 'error',
      });
    }
  }

  // 过滤指定协议
  const filteredSources = protocols
    ? sources.filter((s) => protocols.includes(s.protocol))
    : sources;

  // 计算加权平均价格
  const activeSources = filteredSources.filter((s) => s.status === 'active');

  // 如果没有活跃的数据源，返回错误状态
  if (activeSources.length === 0) {
    return {
      pair,
      aggregatedPrice: 0,
      confidence: 0,
      sources: filteredSources,
      deviation: {
        maxDeviation: 0,
        avgDeviation: 0,
        outlierProtocols: [],
        isAnomaly: false,
      },
      lastUpdated: new Date().toISOString(),
    };
  }

  const totalWeight = activeSources.reduce((sum, s) => sum + s.confidence, 0);
  const aggregatedPrice =
    totalWeight > 0
      ? activeSources.reduce((sum, s) => sum + s.price * s.confidence, 0) / totalWeight
      : 0;

  // 计算偏差
  const prices = activeSources.map((s) => s.price);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const maxDeviation = minPrice > 0 ? ((maxPrice - minPrice) / minPrice) * 100 : 0;

  // 检测异常值
  const meanPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  const outlierProtocols = activeSources
    .filter((s) => meanPrice > 0 && Math.abs(s.price - meanPrice) / meanPrice > 0.005)
    .map((s) => s.protocol);

  return {
    pair,
    aggregatedPrice: Number(aggregatedPrice.toFixed(8)),
    confidence: totalWeight / activeSources.length,
    sources: filteredSources,
    deviation: {
      maxDeviation: Number(maxDeviation.toFixed(4)),
      avgDeviation: Number((maxDeviation / 2).toFixed(4)),
      outlierProtocols,
      isAnomaly: maxDeviation > 1.0,
    },
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * 比较多个协议的价格
 * 检测价格偏差和异常
 */
export async function compareProtocols(query: ComparisonQuery): Promise<ProtocolComparison> {
  const { pair, protocols, deviationThreshold = 1.0 } = query;

  logger.info('Comparing protocols', { pair, protocols, deviationThreshold });

  // 定义要查询的协议列表
  const targetProtocols: OracleProtocol[] = protocols
    ? (protocols.filter((p): p is OracleProtocol =>
        ['chainlink', 'pyth', 'band', 'api3', 'uma'].includes(p),
      ) as OracleProtocol[])
    : ['chainlink', 'pyth', 'band', 'api3'];

  // 从真实数据源获取价格
  const protocolData: ProtocolPriceInfo[] = [];

  for (const protocol of targetProtocols) {
    try {
      const client = createOracleClient({ protocol, chain: 'ethereum' });
      const feed = await client.getPrice(pair);

      if (feed) {
        protocolData.push({
          protocol,
          price: feed.price,
          timestamp: new Date(feed.timestamp).toISOString(),
          blockNumber: feed.blockNumber,
          confidence: feed.confidence,
        });
      }
    } catch (error) {
      logger.error(`Failed to fetch price from ${protocol} for comparison`, { pair, error });
    }
  }

  // 如果没有获取到任何数据，返回空结果
  if (protocolData.length === 0) {
    return {
      pair,
      protocols: [],
      analysis: {
        highestPrice: { protocol: '', price: 0 },
        lowestPrice: { protocol: '', price: 0 },
        priceRange: 0,
        priceRangePercent: 0,
        medianPrice: 0,
        meanPrice: 0,
        recommendations: ['No price data available from any protocol'],
      },
      timestamp: new Date().toISOString(),
    };
  }

  // 计算统计数据
  const prices = protocolData.map((p) => p.price);
  const highestPrice = Math.max(...prices);
  const lowestPrice = Math.min(...prices);
  const priceRange = highestPrice - lowestPrice;
  const priceRangePercent = lowestPrice > 0 ? (priceRange / lowestPrice) * 100 : 0;

  const sortedPrices = [...prices].sort((a, b) => a - b);
  let medianPrice: number;
  if (sortedPrices.length % 2 === 0) {
    const mid1 = sortedPrices[sortedPrices.length / 2 - 1] ?? 0;
    const mid2 = sortedPrices[sortedPrices.length / 2] ?? 0;
    medianPrice = (mid1 + mid2) / 2;
  } else {
    medianPrice = sortedPrices[Math.floor(sortedPrices.length / 2)] ?? 0;
  }
  const meanPrice = prices.reduce((a, b) => a + b, 0) / prices.length;

  // 生成建议
  const recommendations: string[] = [];
  if (priceRangePercent > deviationThreshold) {
    recommendations.push(
      `Price deviation of ${priceRangePercent.toFixed(2)}% exceeds threshold of ${deviationThreshold}%`,
    );
  }
  if (priceRangePercent > 2.0) {
    recommendations.push('Significant price divergence detected - verify data sources');
  }
  if (highestPrice > meanPrice * 1.01) {
    const highProtocol = protocolData.find((p) => p.price === highestPrice);
    if (highProtocol) {
      recommendations.push(`${highProtocol.protocol} shows elevated price`);
    }
  }

  return {
    pair,
    protocols: protocolData,
    analysis: {
      highestPrice: {
        protocol: protocolData.find((p) => p.price === highestPrice)?.protocol || '',
        price: highestPrice,
      },
      lowestPrice: {
        protocol: protocolData.find((p) => p.price === lowestPrice)?.protocol || '',
        price: lowestPrice,
      },
      priceRange: Number(priceRange.toFixed(8)),
      priceRangePercent: Number(priceRangePercent.toFixed(4)),
      medianPrice: Number(medianPrice.toFixed(8)),
      meanPrice: Number(meanPrice.toFixed(8)),
      recommendations,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * 检测价格异常
 * 使用统计方法检测离群值
 */
export function detectPriceAnomalies(
  prices: PriceSource[],
  threshold: number = 2.0,
): { anomalies: PriceSource[]; normal: PriceSource[] } {
  const activePrices = prices.filter((p) => p.status === 'active');
  const priceValues = activePrices.map((p) => p.price);

  const mean = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
  const variance =
    priceValues.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / priceValues.length;
  const stdDev = Math.sqrt(variance);

  const anomalies: PriceSource[] = [];
  const normal: PriceSource[] = [];

  activePrices.forEach((source) => {
    const zScore = Math.abs(source.price - mean) / stdDev;
    if (zScore > threshold) {
      anomalies.push(source);
    } else {
      normal.push(source);
    }
  });

  return { anomalies, normal };
}

/**
 * 计算价格置信度
 * 基于多个因素计算综合置信度
 */
export function calculatePriceConfidence(sources: PriceSource[]): {
  confidence: number;
  factors: Record<string, number>;
} {
  const activeSources = sources.filter((s) => s.status === 'active');

  if (activeSources.length === 0) {
    return { confidence: 0, factors: {} };
  }

  // 协议数量因子 (0-30分)
  const countFactor = Math.min(activeSources.length * 6, 30);

  // 一致性因子 (0-40分)
  const prices = activeSources.map((s) => s.price);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
  const cv = Math.sqrt(variance) / mean; // 变异系数
  const consistencyFactor = Math.max(0, 40 - cv * 1000);

  // 时效性因子 (0-30分)
  const now = Date.now();
  const avgLatency =
    activeSources.reduce((sum, s) => sum + (now - new Date(s.timestamp).getTime()), 0) /
    activeSources.length;
  const recencyFactor = Math.max(0, 30 - avgLatency / 60000); // 每分钟扣1分

  const confidence = countFactor + consistencyFactor + recencyFactor;

  return {
    confidence: Math.min(confidence, 100),
    factors: {
      count: countFactor,
      consistency: consistencyFactor,
      recency: recencyFactor,
    },
  };
}
