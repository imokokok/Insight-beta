/**
 * Type Guards - 类型守卫函数
 *
 * 用于运行时类型检查，替代不安全的 `as` 类型断言
 */

import type { DashboardStats } from '@/app/oracle/dashboard/page';

// ============================================================================
// WebSocket Message Type Guards
// ============================================================================

interface StatsUpdateMessage {
  type: 'stats_update';
  data: DashboardStats;
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

/**
 * 获取错误消息
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
}

// ============================================================================
// Safe Parsing Functions
// ============================================================================

/**
 * 安全地解析 JSON，返回 Result 类型
 */
export function safeJsonParse<T>(json: string): { success: true; data: T } | { success: false; error: Error } {
  try {
    return { success: true, data: JSON.parse(json) as T };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('JSON parse failed')
    };
  }
}

/**
 * 安全地将值转换为数字
 */
export function safeToNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  return null;
}

/**
 * 安全地将值转换为日期
 */
export function safeToDate(value: unknown): Date | null {
  if (value instanceof Date) return !isNaN(value.getTime()) ? value : null;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return !isNaN(date.getTime()) ? date : null;
  }
  return null;
}
