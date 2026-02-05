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

// 管理器
export {
  AlertSuppressionManager,
  AlertEscalationManager,
  AlertDeduplicationManager,
} from './managers';
