/**
 * Price Aggregation Module - Complete Optimized Version
 *
 * 价格聚合模块 - 完整优化版本统一导出
 * P0/P1/P2 优化全部集成
 */

// 类型导入
import type { CrossOracleComparison, SupportedChain } from '@/lib/types/unifiedOracleTypes';

// 配置
export { AGGREGATION_CONFIG, AggregationMethod } from './config';

// 工具函数
export {
  detectOutliers,
  calculateProtocolWeightedAverage,
  calculateRecommendedPrice,
  determineRecommendationSource,
  detectOutliersZScore,
  detectOutliersIQR,
} from './utils';

// 引擎 - 导出类和单例
export { PriceAggregationEngine, priceAggregationEngine } from './engine';

// 便捷函数（使用新的单例）
import { priceAggregationEngine } from './engine';

export async function aggregatePrices(
  symbol: string,
  chain?: SupportedChain,
): Promise<CrossOracleComparison | null> {
  return priceAggregationEngine.aggregatePrices(symbol, chain);
}

export async function aggregateMultipleSymbols(
  symbols: string[],
): Promise<CrossOracleComparison[]> {
  return priceAggregationEngine.aggregateMultipleSymbols(symbols);
}

export async function getHistoricalComparisons(
  symbol: string,
  hours?: number,
): Promise<CrossOracleComparison[]> {
  return priceAggregationEngine.getHistoricalComparisons(symbol, hours);
}

export async function getAggregatedPrice(
  symbol: string,
  chain?: SupportedChain,
): Promise<{ price: number; timestamp: number; primarySource: string; confidence?: number } | null> {
  return priceAggregationEngine.getAggregatedPrice(symbol, chain);
}

// 获取统计信息
export function getEngineStats() {
  return {
    cache: priceAggregationEngine.getCacheStats(),
    circuitBreaker: priceAggregationEngine.getCircuitBreakerStats(),
  };
}
