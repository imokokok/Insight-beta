/**
 * Type Guards - 类型守卫函数
 *
 * 用于运行时类型检查，替代不安全的 `as` 类型断言
 */

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
