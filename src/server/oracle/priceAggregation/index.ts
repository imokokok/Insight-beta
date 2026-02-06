/**
 * Price Aggregation Module
 *
 * 价格聚合模块统一导出
 */

// 配置
export { AGGREGATION_CONFIG, AggregationMethod } from './config';

// 工具函数
export {
  calculateWeightedAverage,
  detectOutliers,
  calculateProtocolWeightedAverage,
  calculateRecommendedPrice,
  determineRecommendationSource,
} from './utils';

// 引擎
export { PriceAggregationEngine } from './engine';

// 单例实例
import { PriceAggregationEngine } from './engine';

export const priceAggregationEngine = new PriceAggregationEngine();

// 便捷函数
import type { CrossOracleComparison, SupportedChain } from '@/lib/types/unifiedOracleTypes';

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
