/**
 * Types Index - 统一导出所有类型定义
 *
 * 这是类型定义的中央出口，所有类型都从这里导出
 * 保持向后兼容性
 */

// ============================================================================
// Oracle 类型（主要模块）
// ============================================================================

export * from './oracle';

// ============================================================================
// 其他类型模块
// ============================================================================

export * from './permissions';
export * from './commentTypes';

// ============================================================================
// 向后兼容的别名导出
// ============================================================================

// 为了向后兼容，保留一些常用的类型别名
export type {
  // 这些别名确保旧代码可以继续使用
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
