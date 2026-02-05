/**
 * Price Aggregation Service
 *
 * 统一价格聚合服务
 * - 聚合多协议价格数据
 * - 计算推荐价格
 * - 检测异常值
 * - 生成跨协议对比数据
 *
 * @deprecated 请从 @/server/oracle/priceAggregation 导入
 */

// 重新导出所有内容以保持向后兼容
export {
  // 配置
  AGGREGATION_CONFIG,
  AggregationMethod,
  // 工具函数
  calculateWeightedAverage,
  detectOutliers,
  calculateProtocolWeightedAverage,
  calculateRecommendedPrice,
  determineRecommendationSource,
  // 引擎
  PriceAggregationEngine,
  // 单例
  priceAggregationEngine,
  // 便捷函数
  aggregatePrices,
  aggregateMultipleSymbols,
  getHistoricalComparisons,
} from './priceAggregation';
