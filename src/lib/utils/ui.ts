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

/**
 * 根据断言状态获取对应的 Tailwind CSS 颜色类
 *
 * @param status - 断言状态：'Pending' | 'Disputed' | 'Resolved'
 * @returns Tailwind CSS 类名字符串
 *
 * @example
 * ```typescript
 * getAssertionStatusColor('Pending');   // Returns: 'bg-blue-500/10 text-blue-700...'
 * getAssertionStatusColor('Disputed');  // Returns: 'bg-rose-500/10 text-rose-700...'
 * getAssertionStatusColor('Resolved');  // Returns: 'bg-emerald-500/10 text-emerald-700...'
 * ```
 */
export function getAssertionStatusColor(status: string): string {
  switch (status) {
    case 'Pending':
      return 'bg-blue-500/10 text-blue-700 ring-1 ring-blue-500/20';
    case 'Disputed':
      return 'bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20';
    case 'Resolved':
      return 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20';
    default:
      return 'bg-gray-500/10 text-gray-700 ring-1 ring-gray-500/20';
  }
}
