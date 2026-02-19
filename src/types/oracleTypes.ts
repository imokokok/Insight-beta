/**
 * Oracle Types - 向后兼容的类型导出
 *
 * 注意：此文件现在仅作为 re-export 层，所有类型定义已迁移到 unifiedOracleTypes.ts
 * 新代码应直接从 unifiedOracleTypes.ts 导入
 */

export {
  type OracleChain,
  type OracleStatus,
  type Assertion,
  type OracleDisputeStatus,
  type OracleDispute,
  type ListResult,
  type OracleStats,
  type LeaderboardEntry,
  type LeaderboardStats,
  type OracleConfig,
  type OracleConfigPatch,
  type OracleConfigField,
  type OracleInstance,
  type OracleStatusSnapshot,
  type ApiOk,
  type ApiError,
  type UserStats,
  type DbAssertionRow,
  type DbDisputeRow,
  type OracleAlert,
  type AuditLogEntry,
  type OracleAlertRuleEvent,
  type OracleAlertRule,
  type IncidentStatus,
  type Incident,
  type RiskSeverity,
  type RiskItem,
  type OpsMetricsSeriesPoint,
  type OpsMetrics,
  type AlertSeverity,
  type OracleAlertStatus,
} from './unifiedOracleTypes';

export {
  type UMAChain,
  type UMAAssertionStatus,
  type UMAAssertion,
  type UMADisputeStatus,
  type UMADispute,
  type UMAVote,
  type UMAConfig,
  type UMAStats,
} from './protocol';
