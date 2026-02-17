/**
 * Type Guards - 类型守卫函数
 *
 * 用于运行时类型检查，替代不安全的 `as` 类型断言
 */

// ============================================================================
// WebSocket Message Type Guards
// ============================================================================

interface StatsUpdateMessage {
  type: 'stats_update';
  data: unknown;
}

/**
 * 检查值是否为 StatsUpdateMessage 类型
 */
export function isStatsUpdateMessage(value: unknown): value is StatsUpdateMessage {
  if (typeof value !== 'object' || value === null) return false;
  const message = value as Record<string, unknown>;
  return message.type === 'stats_update';
}

// ============================================================================
// General Type Guards
// ============================================================================

// getErrorMessage 已从 lib/errors 统一导出
// 请从 @/lib/errors 导入 getErrorMessage
export { getErrorMessage } from '@/lib/errors';
