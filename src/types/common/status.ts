/**
 * Status Types - 统一状态类型定义
 *
 * 集中管理所有状态相关的类型定义，避免重复
 *
 * 注意：颜色常量已统一迁移到 @/lib/design-system/tokens/colors.ts
 * 此文件仅保留类型定义，颜色常量从 colors.ts 重新导出以保持向后兼容
 */

// ============================================================================
// 实体状态
// ============================================================================

export type EntityStatus = 'active' | 'inactive' | 'pending' | 'archived';

// ============================================================================
// 健康状态
// ============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy' | 'unknown';

// ============================================================================
// 告警严重级别（统一类型）
// ============================================================================

export type AlertSeverity =
  | 'low'
  | 'medium'
  | 'high'
  | 'critical'
  | 'info'
  | 'warning'
  | 'emergency';

export type SeverityLevel = AlertSeverity;

// ============================================================================
// 告警状态（统一类型）
// ============================================================================

export type AlertStatus =
  | 'active'
  | 'resolved'
  | 'investigating'
  | 'Open'
  | 'Acknowledged'
  | 'Resolved'
  | 'open'
  | 'acknowledged'
  | 'firing'
  | 'pending'
  | 'silenced';

export type OracleAlertStatus = 'Open' | 'Acknowledged' | 'Resolved';

// ============================================================================
// 同步状态
// ============================================================================

export type SyncStatus = 'synced' | 'syncing' | 'stale' | 'offline';

// ============================================================================
// 风险等级
// ============================================================================

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

// ============================================================================
// Dispute 状态
// ============================================================================

export type DisputeStatus =
  | 'active'
  | 'disputed'
  | 'settled'
  | 'expired'
  | 'resolved'
  | 'accepted'
  | 'rejected';

// ============================================================================
// 断言状态
// ============================================================================

export type AssertionStatus = 'proposed' | 'disputed' | 'settled' | 'expired' | 'resolved';

// ============================================================================
// 投票状态
// ============================================================================

export type VotingStatus = 'active' | 'passed' | 'failed' | 'expired';

// ============================================================================
// Badge 状态类型（向后兼容）
// ============================================================================

export type StatusType =
  | 'active'
  | 'stale'
  | 'error'
  | 'pending'
  | 'settled'
  | 'disputed'
  | 'expired'
  | 'inactive'
  | 'resolved'
  | 'unknown'
  | 'online'
  | 'offline'
  | 'warning'
  | 'success';

// ============================================================================
// 颜色常量 - 从 colors.ts 重新导出（向后兼容）
// ============================================================================

export {
  STATUS_COLORS,
  STATUS_THEME_COLORS,
  SEVERITY_COLORS,
  RISK_COLORS,
  HEALTH_COLORS,
  type StatusColor,
  type StatusThemeColor,
  type SeverityColor,
  type RiskColor,
  type HealthColor,
} from '@/lib/design-system/tokens/colors';
