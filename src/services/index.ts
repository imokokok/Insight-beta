/**
 * Services - 统一服务层导出
 *
 * 按领域组织所有服务
 * @deprecated 建议直接从 @/features/* 目录导入需要的模块
 */

// Oracle 服务 - 从 features/oracle/services 重新导出
export * from './oracle/priceAggregation';

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

// Gas 服务
export * from './gas';
