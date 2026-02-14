/**
 * Realtime Price Aggregation Module
 *
 * @deprecated 请使用 @/features/oracle/services/realtime
 */

// 实时价格服务
export { RealtimePriceService, realtimePriceService } from '@/features/oracle/services/realtime/RealtimePriceService';

// 告警规则引擎
export {
  AlertRuleEngine,
  alertRuleEngine,
  type Alert,
  type AlertRule,
  type AlertCondition,
  type NotificationChannel,
  type AlertSeverity,
  type AlertConditionType,
} from '@/features/oracle/services/realtime/AlertRuleEngine';
