/**
 * UI Utilities
 *
 * UI 相关工具函数
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * 合并 Tailwind CSS 类名，自动处理冲突
 *
 * 使用 clsx 处理条件类名，使用 tailwind-merge 解决类名冲突
 *
 * @param inputs - 类名数组，支持字符串、对象、数组等多种格式
 * @returns 合并后的类名字符串
 *
 * @example
 * ```typescript
 * cn('px-2 py-1', 'bg-red-500', { 'text-white': true });
 * // Returns: 'px-2 py-1 bg-red-500 text-white'
 *
 * cn('px-2', 'px-4'); // 后面的会覆盖前面的
 * // Returns: 'px-4'
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
