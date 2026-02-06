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
