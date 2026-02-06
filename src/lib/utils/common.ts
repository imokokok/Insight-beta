/**
 * Common Utilities
 *
 * 通用工具函数
 */

/**
 * 延迟指定毫秒数
 * @param ms - 毫秒数
 * @returns Promise
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
