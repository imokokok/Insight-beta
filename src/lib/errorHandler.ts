/**
 * Global Error Handler - 全局错误处理器
 *
 * 处理未捕获的异常和未处理的 Promise 拒绝
 * 确保错误被正确记录和上报
 */

import { gracefulShutdown } from '@/lib/database/db';
import { logger } from '@/shared/logger';

let isInitialized = false;

export interface GlobalErrorHandlerOptions {
  enableGracefulShutdown?: boolean;
  shutdownTimeoutMs?: number;
  onUncaughtException?: (error: Error) => void;
  onUnhandledRejection?: (reason: unknown) => void;
}

/**
 * 初始化全局错误处理器
 */
export function initializeGlobalErrorHandler(options: GlobalErrorHandlerOptions = {}): void {
  if (isInitialized) {
    logger.warn('Global error handler already initialized');
    return;
  }

  const {
    enableGracefulShutdown = true,
    shutdownTimeoutMs = 10000,
    onUncaughtException,
    onUnhandledRejection,
  } = options;

  // 处理未捕获的异常
  process.on('uncaughtException', (error: Error) => {
    logger.fatal('Uncaught exception', {
      error: error.message,
      stack: error.stack,
      name: error.name,
    });

    if (onUncaughtException) {
      try {
        onUncaughtException(error);
      } catch (handlerError) {
        logger.error('Error in uncaughtException handler', {
          error: handlerError instanceof Error ? handlerError.message : String(handlerError),
        });
      }
    }

    // 未捕获的异常通常意味着应用处于不一致状态，应该退出
    if (enableGracefulShutdown) {
      performGracefulShutdown(1, shutdownTimeoutMs);
    } else {
      process.exit(1);
    }
  });

  // 处理未处理的 Promise 拒绝
  process.on('unhandledRejection', (reason: unknown, promise: Promise<unknown>) => {
    const errorInfo =
      reason instanceof Error
        ? {
            message: reason.message,
            stack: reason.stack,
            name: reason.name,
          }
        : {
            message: String(reason),
            type: typeof reason,
          };

    logger.fatal('Unhandled promise rejection', {
      reason: errorInfo,
      promise: promise.toString().slice(0, 200),
    });

    if (onUnhandledRejection) {
      try {
        onUnhandledRejection(reason);
      } catch (handlerError) {
        logger.error('Error in unhandledRejection handler', {
          error: handlerError instanceof Error ? handlerError.message : String(handlerError),
        });
      }
    }

    // 根据配置决定是否退出
    // 注意：未处理的 Promise 拒绝在 Node.js 未来版本中会导致进程退出
    if (enableGracefulShutdown && process.env.UNHANDLED_REJECTION_EXIT === 'true') {
      performGracefulShutdown(1, shutdownTimeoutMs);
    }
  });

  // 处理警告
  process.on('warning', (warning: Error) => {
    logger.warn('Process warning', {
      name: warning.name,
      message: warning.message,
      stack: warning.stack,
    });
  });

  // 处理内存不足警告
  process.on('maxListenersExceeded', (eventType: string, count: number) => {
    logger.warn('Max listeners exceeded', {
      eventType,
      count,
    });
  });

  isInitialized = true;
  logger.info('Global error handler initialized', {
    enableGracefulShutdown,
    shutdownTimeoutMs,
  });
}

/**
 * 执行优雅关闭
 */
async function performGracefulShutdown(exitCode: number, timeoutMs: number): Promise<void> {
  const timeout = setTimeout(() => {
    logger.error('Graceful shutdown timeout, forcing exit');
    process.exit(exitCode);
  }, timeoutMs);

  try {
    await gracefulShutdown(timeoutMs);
    clearTimeout(timeout);
    process.exit(exitCode);
  } catch (error) {
    clearTimeout(timeout);
    logger.error('Error during graceful shutdown', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(exitCode);
  }
}

/**
 * 检查全局错误处理器是否已初始化
 */
export function isGlobalErrorHandlerInitialized(): boolean {
  return isInitialized;
}

/**
 * 手动触发错误报告
 */
export function reportError(error: Error, context?: Record<string, unknown>): void {
  logger.error('Manual error report', {
    error: error.message,
    stack: error.stack,
    name: error.name,
    ...context,
  });
}

// 自动初始化（仅在服务端环境）
if (
  typeof window === 'undefined' &&
  typeof process !== 'undefined' &&
  typeof process.on === 'function'
) {
  // 延迟初始化，确保其他模块已加载
  const initDelay = Number(process.env.GLOBAL_ERROR_HANDLER_DELAY) || 100;
  setTimeout(() => {
    if (!isInitialized) {
      initializeGlobalErrorHandler();
    }
  }, initDelay);
}
