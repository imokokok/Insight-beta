/**
 * Structured Logger - 结构化日志系统
 *
 * 统一的日志格式，支持多种传输方式
 */

import { logger as baseLogger } from '@/lib/logger';

// ============================================================================
// 日志级别
// ============================================================================

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4,
};

// ============================================================================
// 日志上下文
// ============================================================================

export interface LogContext {
  requestId?: string;
  userId?: string;
  sessionId?: string;
  traceId?: string;
  spanId?: string;
  [key: string]: unknown;
}

// ============================================================================
// 日志条目
// ============================================================================

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: Error;
  metadata?: Record<string, unknown>;
  source?: {
    file?: string;
    line?: number;
    function?: string;
  };
}

// ============================================================================
// 日志传输器接口
// ============================================================================

export interface LogTransport {
  log(entry: LogEntry): void | Promise<void>;
  flush?(): Promise<void>;
}

// ============================================================================
// 控制台传输器
// ============================================================================

export class ConsoleTransport implements LogTransport {
  log(entry: LogEntry): void {
    const { timestamp, level, message, context, error, metadata } = entry;

    const logData: Record<string, unknown> = {
      timestamp,
      level: level.toUpperCase(),
      message,
    };

    if (context && Object.keys(context).length > 0) {
      logData.context = context;
    }

    if (metadata && Object.keys(metadata).length > 0) {
      logData.metadata = metadata;
    }

    const consoleMethod = this.getConsoleMethod(level);

    if (error) {
      consoleMethod(logData, error);
    } else {
      consoleMethod(logData);
    }
  }

  private getConsoleMethod(level: LogLevel): typeof console.log {
    switch (level) {
      case 'debug':
        return console.debug;
      case 'info':
        return console.info;
      case 'warn':
        return console.warn;
      case 'error':
      case 'fatal':
        return console.error;
      default:
        return console.log;
    }
  }
}

// ============================================================================
// 文件传输器
// ============================================================================

export class FileTransport implements LogTransport {
  private buffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor(
    private filepath: string,
    private options: { bufferSize?: number; flushIntervalMs?: number } = {},
  ) {
    this.options = {
      bufferSize: 100,
      flushIntervalMs: 5000,
      ...options,
    };

    this.flushInterval = setInterval(() => this.flush(), this.options.flushIntervalMs);
  }

  log(entry: LogEntry): void {
    this.buffer.push(entry);

    if (this.buffer.length >= (this.options.bufferSize || 100)) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    // 实际实现中应该写入文件
    // 这里简化处理
    baseLogger.info(`Flushing ${entries.length} log entries to ${this.filepath}`);
  }

  destroy(): void {
    clearInterval(this.flushInterval);
    this.flush();
  }
}

// ============================================================================
// HTTP 传输器
// ============================================================================

export class HttpTransport implements LogTransport {
  private buffer: LogEntry[] = [];
  private flushInterval: NodeJS.Timeout;

  constructor(
    private endpoint: string,
    private options: {
      bufferSize?: number;
      flushIntervalMs?: number;
      headers?: Record<string, string>;
    } = {},
  ) {
    this.options = {
      bufferSize: 50,
      flushIntervalMs: 10000,
      ...options,
    };

    this.flushInterval = setInterval(() => this.flush(), this.options.flushIntervalMs);
  }

  log(entry: LogEntry): void {
    this.buffer.push(entry);

    if (this.buffer.length >= (this.options.bufferSize || 50)) {
      this.flush();
    }
  }

  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers,
        },
        body: JSON.stringify({ logs: entries }),
        keepalive: true,
      });
    } catch (error) {
      baseLogger.error('Failed to send logs to HTTP endpoint', { error });
    }
  }

  destroy(): void {
    clearInterval(this.flushInterval);
    this.flush();
  }
}

// ============================================================================
// 结构化日志记录器
// ============================================================================

export class StructuredLogger {
  private transports: LogTransport[] = [];
  private minLevel: LogLevel;
  private defaultContext: LogContext = {};

  constructor(minLevel: LogLevel = 'info') {
    this.minLevel = minLevel;
  }

  addTransport(transport: LogTransport): void {
    this.transports.push(transport);
  }

  setDefaultContext(context: LogContext): void {
    this.defaultContext = { ...this.defaultContext, ...context };
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
  }

  private createEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
    metadata?: Record<string, unknown>,
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: { ...this.defaultContext, ...context },
      error,
      metadata,
      source: this.getSource(),
    };
  }

  private getSource(): LogEntry['source'] {
    const stack = new Error().stack;
    if (!stack) return undefined;

    const lines = stack.split('\n');
    // 找到调用者的行
    const callerLine = lines[4] || lines[3];
    if (!callerLine) return undefined;

    // eslint-disable-next-line security/detect-unsafe-regex
    const match = callerLine.match(/at\s+(?:(.+?)\s+\()?(.+?):(\d+):(\d+)\)?/);
    if (!match) return undefined;

    return {
      function: match[1] ?? 'unknown',
      file: match[2] ?? 'unknown',
      line: parseInt(match[3] ?? '0', 10),
    };
  }

  private async log(entry: LogEntry): Promise<void> {
    for (const transport of this.transports) {
      try {
        await transport.log(entry);
      } catch (error) {
        console.error('Transport failed:', error);
      }
    }
  }

  debug(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('debug')) return;
    this.log(this.createEntry('debug', message, context, undefined, metadata));
  }

  info(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;
    this.log(this.createEntry('info', message, context, undefined, metadata));
  }

  warn(message: string, context?: LogContext, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return;
    this.log(this.createEntry('warn', message, context, undefined, metadata));
  }

  error(
    message: string,
    error?: Error,
    context?: LogContext,
    metadata?: Record<string, unknown>,
  ): void {
    if (!this.shouldLog('error')) return;
    this.log(this.createEntry('error', message, context, error, metadata));
  }

  fatal(
    message: string,
    error?: Error,
    context?: LogContext,
    metadata?: Record<string, unknown>,
  ): void {
    if (!this.shouldLog('fatal')) return;
    this.log(this.createEntry('fatal', message, context, error, metadata));
  }

  async flush(): Promise<void> {
    for (const transport of this.transports) {
      if (transport.flush) {
        await transport.flush();
      }
    }
  }

  child(context: LogContext): StructuredLogger {
    const childLogger = new StructuredLogger(this.minLevel);
    childLogger.transports = this.transports;
    childLogger.defaultContext = { ...this.defaultContext, ...context };
    return childLogger;
  }
}

// ============================================================================
// 默认实例
// ============================================================================

export const structuredLogger = new StructuredLogger((process.env.LOG_LEVEL as LogLevel) || 'info');

// 添加控制台传输器
structuredLogger.addTransport(new ConsoleTransport());

// 如果配置了 HTTP 端点，添加 HTTP 传输器
if (process.env.LOG_HTTP_ENDPOINT) {
  structuredLogger.addTransport(
    new HttpTransport(process.env.LOG_HTTP_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${process.env.LOG_API_KEY || ''}`,
      },
    }),
  );
}

// ============================================================================
// 请求上下文日志
// ============================================================================

export function createRequestLogger(requestId: string, userId?: string): StructuredLogger {
  return structuredLogger.child({
    requestId,
    userId,
    timestamp: new Date().toISOString(),
  });
}
