/**
 * Graceful Shutdown Module
 *
 * 优雅关闭模块
 * 确保应用在关闭前完成所有进行中的请求和资源清理
 */

import { logger } from '@/shared/logger';
import { sleep } from '@/shared/utils/common';
import { syncManager } from '@/services/oracle/syncFramework';

// ============================================================================
// 关闭状态管理
// ============================================================================

interface ShutdownState {
  isShuttingDown: boolean;
  activeRequests: number;
  shutdownCallbacks: Array<() => Promise<void>>;
}

const state: ShutdownState = {
  isShuttingDown: false,
  activeRequests: 0,
  shutdownCallbacks: [],
};

// ============================================================================
// 关闭回调注册
// ============================================================================
// 优雅关闭实现
// ============================================================================

const DEFAULT_SHUTDOWN_TIMEOUT = 30000; // 30秒

/**
 * 执行优雅关闭
 */
export async function gracefulShutdown(
  signal: string,
  timeoutMs = DEFAULT_SHUTDOWN_TIMEOUT,
): Promise<void> {
  if (state.isShuttingDown) {
    logger.warn('Shutdown already in progress, ignoring signal', { signal });
    return;
  }

  state.isShuttingDown = true;
  logger.info(`Starting graceful shutdown...`, { signal, timeoutMs });

  const startTime = Date.now();

  try {
    // 1. 停止接受新请求
    logger.info('Stopping new request acceptance');

    // 2. 等待活跃请求完成
    logger.info(`Waiting for ${state.activeRequests} active requests to complete`);
    await Promise.race([
      waitForActiveRequests(),
      sleep(timeoutMs * 0.5), // 50% 超时时间用于等待请求
    ]);

    if (state.activeRequests > 0) {
      logger.warn(`Force closing ${state.activeRequests} active requests`);
    }

    // 3. 停止同步任务
    logger.info('Stopping sync tasks');
    syncManager.stopAllSyncs();

    // 4. 执行注册的关闭回调（带超时控制）
    logger.info(`Executing ${state.shutdownCallbacks.length} shutdown callbacks`);
    const callbackTimeoutMs = Math.max(5000, Math.floor(timeoutMs * 0.3 / state.shutdownCallbacks.length)); // 每个回调至少5秒
    
    const callbackResults = await Promise.allSettled(
      state.shutdownCallbacks.map(async (callback, index) => {
        const callbackName = callback.name || `callback-${index}`;
        try {
          await executeWithTimeout(callback(), callbackTimeoutMs, `Shutdown callback ${callbackName} timeout`);
          logger.debug(`Shutdown callback ${callbackName} completed`);
        } catch (error) {
          logger.error(`Error in shutdown callback ${callbackName}`, { error });
          throw error;
        }
      })
    );
    
    const failedCallbacks = callbackResults.filter(r => r.status === 'rejected');
    if (failedCallbacks.length > 0) {
      logger.warn(`${failedCallbacks.length} shutdown callbacks failed`);
    }

    // 5. 关闭数据库连接
    logger.info('Closing database connections');
    try {
      const { db } = await import('@/server/db');
      await db.end();
      logger.info('Database connections closed successfully');
    } catch (error) {
      logger.error('Error closing database connections', { error });
    }

    const duration = Date.now() - startTime;
    logger.info(`Graceful shutdown completed in ${duration}ms`);

    // 7. 退出进程
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', { error });
    process.exit(1);
  }
}

/**
 * 等待活跃请求完成
 */
async function waitForActiveRequests(): Promise<void> {
  while (state.activeRequests > 0) {
    await sleep(100);
  }
}

/**
 * 执行带超时的 Promise
 * @param promise - 要执行的 Promise
 * @param timeoutMs - 超时时间（毫秒）
 * @param message - 超时错误消息
 * @returns Promise 的结果
 * @throws 当超时时抛出错误
 */
function executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer));
  });
}
