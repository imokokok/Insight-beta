/**
 * Format Utilities
 *
 * 格式化工具函数 - 统一入口
 *
 * @deprecated 请使用 @/shared/utils/format 代替
 * 此文件仅为向后兼容保留，所有工具函数已迁移到 @/shared/utils/format
 */

export * from './format/index';
export * from './format/number';
export * from './format/percentage';
export * from './format/date';

import { logger } from '@/shared/logger';

/**
 * 将文本复制到剪贴板
 *
 * 优先使用现代 Clipboard API，如果不支持则回退到 document.execCommand
 *
 * @param text - 要复制的文本
 * @returns 复制成功返回 true，失败返回 false
 *
 * @example
 * ```typescript
 * const success = await copyToClipboard('Hello World');
 * if (success) {
 *   console.log('复制成功');
 * }
 * ```
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    logger.warn('Failed to copy to clipboard using navigator.clipboard', {
      error: error instanceof Error ? error.message : String(error),
    });
  }

  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.left = '-9999px';
    el.style.top = '-9999px';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}
