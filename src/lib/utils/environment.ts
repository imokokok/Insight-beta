/**
 * Environment Utilities
 *
 * 环境检测工具函数
 */

/**
 * 检查是否在服务端环境
 * @returns boolean
 */
export const isServer = (): boolean => typeof window === 'undefined';

/**
 * 检查是否在客户端环境
 * @returns boolean
 */
export const isClient = (): boolean => typeof window !== 'undefined';

/**
 * 安全地获取 localStorage 项
 * @param key - 键名
 * @returns 值或 null
 */
export const getLocalStorageItem = (key: string): string | null => {
  if (isServer()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

/**
 * 安全地设置 localStorage 项
 * @param key - 键名
 * @param value - 值
 * @returns 是否成功
 */
export const setLocalStorageItem = (key: string, value: string): boolean => {
  if (isServer()) return false;
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};
