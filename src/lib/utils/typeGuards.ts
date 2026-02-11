/**
 * Type Guards - 类型守卫函数
 *
 * 用于运行时类型检查，替代不安全的 `as` 类型断言
 */

import type { DashboardStats } from '@/app/oracle/dashboard/page';
import type { CrossChainPriceData } from '@/lib/types/crossChainAnalysisTypes';
import type { OracleProtocol, SupportedChain } from '@/lib/types/unifiedOracleTypes';

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
 * 检查值是否为正数
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * 检查值是否为非负数
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * 检查值是否为有效的 Date 对象
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * 安全地获取错误消息
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
}

// ============================================================================
// String Validation Type Guards
// ============================================================================

/**
 * 检查值是否为有效的 Symbol 格式（如 ETH/USD）
 */
export function isValidSymbol(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[A-Z0-9]+\/[A-Z0-9]+$/.test(value);
}

// ============================================================================
// Number Validation Type Guards
// ============================================================================

/**
 * 检查值是否为有效的价格（正数且在一定范围内）
 */
export function isValidPrice(value: unknown): value is number {
  if (!isPositiveNumber(value)) return false;
  // 价格应该在合理范围内（0.00000001 到 1万亿）
  return value >= 1e-8 && value <= 1e12;
}

/**
 * 检查值是否为有效的百分比（0-100）
 */
export function isValidPercentage(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  return value >= 0 && value <= 100;
}

/**
 * 检查值是否为有效的区块号
 */
export function isValidBlockNumber(value: unknown): value is number {
  return isNonNegativeNumber(value) && Number.isInteger(value);
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
  if (value instanceof Date) return isValidDate(value) ? value : null;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isValidDate(date) ? date : null;
  }
  return null;
}

// ============================================================================
// Assertion Functions (for development/debugging)
// ============================================================================

/**
 * 断言值不为 null/undefined，否则抛出错误
 */
export function assertDefined<T>(value: T, message = 'Value is not defined'): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

/**
 * 断言值为特定类型，否则抛出错误
 */
export function assertType<T>(
  value: unknown, 
  guard: (v: unknown) => v is T, 
  message = 'Value is not of expected type'
): asserts value is T {
  if (!guard(value)) {
    throw new Error(message);
  }
}
