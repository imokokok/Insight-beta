/**
 * Graceful Shutdown Module
 *
 * 优雅关闭模块
 * 确保应用在关闭前完成所有进行中的请求和资源清理
 */

import { logger } from '@/lib/logger';
import { syncManager } from '@/server/oracle/syncFramework';

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
// 请求追踪
// ============================================================================

/**
 * 增加活跃请求计数
 */
export function incrementActiveRequests(): void {
  if (!state.isShuttingDown) {
    state.activeRequests++;
  }
}

/**
 * 减少活跃请求计数
 */
export function decrementActiveRequests(): void {
  state.activeRequests = Math.max(0, state.activeRequests - 1);
}

/**
 * 获取活跃请求数
 */
export function getActiveRequests(): number {
  return state.activeRequests;
}

// ============================================================================
// 关闭回调注册
// ============================================================================

/**
 * 注册关闭回调函数
 */
export function onShutdown(callback: () => Promise<void>): void {
  state.shutdownCallbacks.push(callback);
}

/**
 * 注销关闭回调函数
 */
export function offShutdown(callback: () => Promise<void>): void {
  const index = state.shutdownCallbacks.indexOf(callback);
  if (index > -1) {
    state.shutdownCallbacks.splice(index, 1);
  }
}

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

    // 4. 执行注册的关闭回调
    logger.info(`Executing ${state.shutdownCallbacks.length} shutdown callbacks`);
    for (const callback of state.shutdownCallbacks) {
      try {
        await callback();
      } catch (error) {
        logger.error('Error in shutdown callback', { error });
      }
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
 * 睡眠函数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================================================
// 信号处理
// ============================================================================

/**
 * 初始化优雅关闭处理器
 */
export function initGracefulShutdown(): void {
  // 处理 SIGTERM (Docker stop, Kubernetes)
  process.on('SIGTERM', () => {
    void gracefulShutdown('SIGTERM');
  });

  // 处理 SIGINT (Ctrl+C)
  process.on('SIGINT', () => {
    void gracefulShutdown('SIGINT');
  });

  // 处理未捕获的异常
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error });
    void gracefulShutdown('uncaughtException', 10000);
  });

  // 处理未处理的 Promise 拒绝
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled rejection', { reason, promise });
  });

  logger.info('Graceful shutdown handlers initialized');
}

// ============================================================================
// 健康检查
// ============================================================================

/**
 * 检查是否正在关闭
 */
export function isShuttingDown(): boolean {
  return state.isShuttingDown;
}

/**
 * 获取关闭状态
 */
export function getShutdownStatus(): {
  isShuttingDown: boolean;
  activeRequests: number;
  registeredCallbacks: number;
} {
  return {
    isShuttingDown: state.isShuttingDown,
    activeRequests: state.activeRequests,
    registeredCallbacks: state.shutdownCallbacks.length,
  };
}
