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

// Oracle Realtime
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

// 安全服务
export * from './security/apiAuth';

// 监控服务
export * from './monitoring/oracleHealthMonitor';