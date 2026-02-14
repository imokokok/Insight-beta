/**
 * Services - 统一服务层导出
 *
 * 按领域组织所有服务
 */

// Oracle 服务 - 从 features/oracle/services 重新导出
export * from './oracle/priceAggregation';
export * from './oracle/sync';
// priceFetcher, unifiedPriceService, crossChainAnalysisService, priceDeviationAnalytics, realDataService
// 已从 @/features/oracle/services 导出

// Oracle Realtime - 排除与 alert/notifications 重复的类型
export {
  RealtimePriceService,
  realtimePriceService,
  AlertRuleEngine,
  alertRuleEngine,
  type Alert,
  type AlertRule,
  type AlertCondition,
  type AlertConditionType,
} from './oracle/realtime';

// 告警服务 - 从 features/alert/services 重新导出
// AlertSeverity 和 NotificationChannel 从这里导出
export * from './alert/notifications';

// 安全服务
export * from './security/anomaly';
export * from './security/apiAuth';
// rateLimiter 已从 lib/security/rateLimit.ts 导出
export * from './security/manipulationDetectionService';

// 监控服务
export * from './monitoring/oracleHealthMonitor';
export * from './monitoring/performanceMonitor';

// Gas 服务
export * from './gas/gasPriceService';
