/**
 * Database Initializer - 统一的数据库初始化模块
 *
 * 消除多个模块中重复的 ensureDb() 函数模式
 */

import { ensureSchema } from '@/server/schema';
import { hasDatabase } from '@/server/db';
import { logger } from '@/lib/logger';

// ============================================================================
// 单例模式实现
// ============================================================================

class DbInitializerSingleton {
  private schemaEnsured = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * 确保数据库已初始化
   * 使用单例模式避免重复初始化
   */
  async ensureDb(): Promise<void> {
    if (!hasDatabase()) {
      return;
    }

    if (this.schemaEnsured) {
      return;
    }

    // 如果正在初始化中，等待完成
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    // 创建初始化 Promise
    this.initializationPromise = this.doInitialize();

    try {
      await this.initializationPromise;
    } finally {
      this.initializationPromise = null;
    }
  }

  /**
   * 执行实际的初始化
   */
  private async doInitialize(): Promise<void> {
    try {
      logger.debug('Ensuring database schema...');
      await ensureSchema();
      this.schemaEnsured = true;
      logger.info('Database schema ensured successfully');
    } catch (error) {
      logger.error('Failed to ensure database schema', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * 重置初始化状态（主要用于测试）
   */
  reset(): void {
    this.schemaEnsured = false;
    this.initializationPromise = null;
    logger.debug('DbInitializer reset');
  }

  /**
   * 获取当前初始化状态
   */
  isInitialized(): boolean {
    return this.schemaEnsured;
  }
}

// ============================================================================
// 导出单例实例
// ============================================================================

export const dbInitializer = new DbInitializerSingleton();

// ============================================================================
// 便捷导出函数
// ============================================================================

/**
 * 确保数据库已初始化
 * 这是主要的入口函数，替代之前分散在各处的 ensureDb()
 */
export async function ensureDb(): Promise<void> {
  return dbInitializer.ensureDb();
}

/**
 * 检查数据库是否已初始化
 */
export function isDbInitialized(): boolean {
  return dbInitializer.isInitialized();
}

/**
 * 重置数据库初始化状态（仅用于测试）
 */
export function resetDbInitialization(): void {
  dbInitializer.reset();
}

// ============================================================================
// 向后兼容的包装函数
// ============================================================================

/**
 * 创建带有 ensureDb 的包装函数
 * 用于简化需要 ensureDb 的函数定义
 */
export function withDbInitialization<T extends (...args: unknown[]) => Promise<unknown>>(fn: T): T {
  return (async (...args: unknown[]) => {
    await ensureDb();
    return fn(...args) as ReturnType<T>;
  }) as T;
}
