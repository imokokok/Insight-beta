/**
 * Types Index - 统一导出所有类型定义
 */

// 统一从 oracle/index 导出所有类型
export * from './oracle';

// 保持向后兼容 - 重新导出旧类型名称
export type {
  // 类型别名保持兼容
  PriceFeed as UnifiedPriceFeed,
  PriceUpdate as UnifiedPriceUpdate,
  Assertion as UnifiedAssertion,
  Dispute as UnifiedDispute,
  OracleStats as UnifiedOracleStats,
  AlertRule as UnifiedAlertRule,
  Alert as UnifiedAlert,
  AlertEvent as UnifiedAlertEvent,
  SyncState as UnifiedSyncState,
  ConfigTemplate as UnifiedConfigTemplate,
  CrossProtocolComparison,
  ProtocolPerformanceRanking,
} from './oracle';

// 导出其他类型模块
export * from './permissions';
export * from './commentTypes';
