/**
 * LoggerFactory - 日志记录器工厂
 *
 * 提供统一的日志记录器创建方式，支持：
 * - 带前缀的日志记录器
 * - Oracle 专用日志记录器
 * - 结构化日志元数据
 */

import { logger as defaultLogger } from '@/lib/logger';

export interface Logger {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

export interface PrefixedLogger extends Logger {
  /** 日志前缀 */
  readonly prefix: string;
  /** 创建子记录器（追加前缀） */
  child: (subPrefix: string) => PrefixedLogger;
}

export class LoggerFactory {
  /**
   * 创建带前缀的日志记录器
   */
  static createPrefixedLogger(prefix: string): PrefixedLogger {
    return new PrefixedLoggerImpl(prefix);
  }

  /**
   * 创建 Oracle 客户端专用日志记录器
   */
  static createOracleLogger(protocol: string, chain: string): PrefixedLogger {
    return this.createPrefixedLogger(`${protocol}[${chain}]`);
  }

  /**
   * 创建同步管理器专用日志记录器
   */
  static createSyncLogger(protocol: string): PrefixedLogger {
    return this.createPrefixedLogger(`Sync[${protocol}]`);
  }

  /**
   * 创建服务专用日志记录器
   */
  static createServiceLogger(serviceName: string): PrefixedLogger {
    return this.createPrefixedLogger(`Service[${serviceName}]`);
  }
}

/**
 * 带前缀的日志记录器实现
 */
class PrefixedLoggerImpl implements PrefixedLogger {
  readonly prefix: string;

  constructor(prefix: string) {
    this.prefix = prefix;
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    defaultLogger.debug(`[${this.prefix}] ${message}`, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    defaultLogger.info(`[${this.prefix}] ${message}`, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    defaultLogger.warn(`[${this.prefix}] ${message}`, meta);
  }

  error(message: string, meta?: Record<string, unknown>): void {
    defaultLogger.error(`[${this.prefix}] ${message}`, meta);
  }

  child(subPrefix: string): PrefixedLogger {
    return new PrefixedLoggerImpl(`${this.prefix}:${subPrefix}`);
  }
}

/**
 * 创建带前缀的日志记录器的便捷函数
 */
export function createLogger(prefix: string): PrefixedLogger {
  return LoggerFactory.createPrefixedLogger(prefix);
}

/**
 * 创建 Oracle 日志记录器的便捷函数
 */
export function createOracleLogger(protocol: string, chain: string): PrefixedLogger {
  return LoggerFactory.createOracleLogger(protocol, chain);
}
