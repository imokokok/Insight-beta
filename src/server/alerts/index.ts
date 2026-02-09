/**
 * Alert Management Module
 *
 * 告警管理模块统一导出
 */

// 类型
export type {
  Alert,
  AlertStatus,
  AlertChannel,
  EscalationRecord,
  NotificationRecord,
  SuppressionRule,
  SuppressionCondition,
  EscalationPolicy,
  EscalationLevel,
  AlertStats,
} from './types';

// 告警规则引擎
export {
  AlertRuleEngine,
  AlertManager,
  alertManager,
  registerCustomCondition,
  getCustomCondition,
  unregisterCustomCondition,
} from './alertRuleEngine';

export type {
  AlertRule,
  AlertCondition,
  AlertConditionType,
  AlertEvaluationContext,
  AlertEvaluationResult,
  PriceDeviationCondition,
  PriceThresholdCondition,
  StaleDataCondition,
  SyncFailureCondition,
  ProtocolDownCondition,
  CustomCondition,
  // UMA 特定条件类型
  AssertionCreatedCondition,
  DisputeCreatedCondition,
  AssertionDisputedCondition,
  AssertionResolvedCondition,
  HighGasPriceCondition,
  LowLiquidityCondition,
  PriceVolatilityCondition,
  OracleLagCondition,
} from './alertRuleEngine';

// 通知服务
export {
  NotificationService,
  type AlertNotification,
  type AlertSeverity,
} from './notifications';

// 管理器 - temporarily disabled
// export {
//   AlertSuppressionManager,
//   AlertEscalationManager,
//   AlertDeduplicationManager,
// } from './managers';
