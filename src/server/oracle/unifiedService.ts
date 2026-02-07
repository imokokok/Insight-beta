/**
 * Unified Oracle Service
 *
 * 通用预言机聚合服务
 * 提供跨协议价格数据聚合、比较和异常检测
 */

import { logger } from '@/lib/logger';

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

  // TODO: 实现真实的价格获取逻辑
  // 目前返回模拟数据
  const mockSources: PriceSource[] = [
    {
      protocol: 'chainlink',
      price: 3500.5,
      timestamp: new Date().toISOString(),
      latency: 100,
      confidence: 95,
      status: 'active',
    },
    {
      protocol: 'pyth',
      price: 3501.2,
      timestamp: new Date().toISOString(),
      latency: 80,
      confidence: 92,
      status: 'active',
    },
  ];

  const sources = protocols
    ? mockSources.filter((s) => protocols.includes(s.protocol))
    : mockSources;

  const activeSources = sources.filter((s) => s.status === 'active');

  if (activeSources.length === 0) {
    return {
      pair,
      aggregatedPrice: 0,
      confidence: 0,
      sources,
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
    activeSources.reduce((sum, s) => sum + s.price * s.confidence, 0) / totalWeight;

  const prices = activeSources.map((s) => s.price);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const maxDeviation = minPrice > 0 ? ((maxPrice - minPrice) / minPrice) * 100 : 0;

  return {
    pair,
    aggregatedPrice: Number(aggregatedPrice.toFixed(8)),
    confidence: totalWeight / activeSources.length,
    sources,
    deviation: {
      maxDeviation: Number(maxDeviation.toFixed(4)),
      avgDeviation: Number((maxDeviation / 2).toFixed(4)),
      outlierProtocols: [],
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
  const { pair, deviationThreshold = 1.0 } = query;

  logger.info('Comparing protocols', { pair, deviationThreshold });

  // TODO: 实现真实的价格比较逻辑
  // 目前返回模拟数据
  const mockProtocols: ProtocolPriceInfo[] = [
    {
      protocol: 'chainlink',
      price: 3500.5,
      timestamp: new Date().toISOString(),
      blockNumber: 12345678,
      confidence: 0.95,
    },
    {
      protocol: 'pyth',
      price: 3501.2,
      timestamp: new Date().toISOString(),
      blockNumber: 12345679,
      confidence: 0.92,
    },
  ];

  const prices = mockProtocols.map((p) => p.price);
  const highestPrice = Math.max(...prices);
  const lowestPrice = Math.min(...prices);
  const priceRange = highestPrice - lowestPrice;
  const priceRangePercent = lowestPrice > 0 ? (priceRange / lowestPrice) * 100 : 0;

  return {
    pair,
    protocols: mockProtocols,
    analysis: {
      highestPrice: {
        protocol: mockProtocols.find((p) => p.price === highestPrice)?.protocol || '',
        price: highestPrice,
      },
      lowestPrice: {
        protocol: mockProtocols.find((p) => p.price === lowestPrice)?.protocol || '',
        price: lowestPrice,
      },
      priceRange: Number(priceRange.toFixed(8)),
      priceRangePercent: Number(priceRangePercent.toFixed(4)),
      medianPrice: Number(((highestPrice + lowestPrice) / 2).toFixed(8)),
      meanPrice: Number((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(8)),
      recommendations:
        priceRangePercent > deviationThreshold
          ? [`Price deviation of ${priceRangePercent.toFixed(2)}% exceeds threshold`]
          : [],
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

  if (priceValues.length === 0) {
    return { anomalies: [], normal: [] };
  }

  const mean = priceValues.reduce((a, b) => a + b, 0) / priceValues.length;
  const variance =
    priceValues.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / priceValues.length;
  const stdDev = Math.sqrt(variance);

  const anomalies: PriceSource[] = [];
  const normal: PriceSource[] = [];

  activePrices.forEach((source) => {
    const zScore = stdDev > 0 ? Math.abs(source.price - mean) / stdDev : 0;
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
  const cv = mean > 0 ? Math.sqrt(variance) / mean : 0; // 变异系数
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
