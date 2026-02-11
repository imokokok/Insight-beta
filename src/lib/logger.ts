import { env } from './config/env';

import type * as SentryModule from '@sentry/nextjs';

const isProd = env.NODE_ENV === 'production';

let sentry: typeof SentryModule | null = null;

async function loadSentry() {
  if (sentry !== null) return sentry;
  try {
    sentry = await import('@sentry/nextjs');
    return sentry;
  } catch {
    return null;
  }
}

/**
 * Supported log levels with severity ordering
 */
const LOG_LEVELS = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
} as const;

/**
 * Log level type
 */
export type LogLevel = keyof typeof LOG_LEVELS;

/**
 * 采样配置 - 用于生产环境日志采样
 */
const LOG_SAMPLE_RATE = isProd
  ? env.LOG_SAMPLE_RATE // 生产环境默认 10% 采样（通过 env 配置）
  : 1; // 开发环境 100%

/**
 * 采样计数器
 */
let logSampleCounter = 0;

/**
 * 检查是否应该采样当前日志
 */
function shouldSample(): boolean {
  if (LOG_SAMPLE_RATE >= 1) return true;
  logSampleCounter++;
  return logSampleCounter % Math.ceil(1 / LOG_SAMPLE_RATE) === 0;
}

/**
 * Extracts log level from environment or defaults based on environment
 * @returns Log level to use for logging
 */
function getLogLevel(): LogLevel {
  const envLevel =
    typeof process !== 'undefined' && process.env
      ? (process.env.LOG_LEVEL || '').toLowerCase()
      : '';
  if (envLevel in LOG_LEVELS) {
    return envLevel as LogLevel;
  }
  return isProd ? 'info' : 'debug';
}

const currentLevel = getLogLevel();

type LogContext = Record<string, unknown>;

type AsyncLocalStorageLike<T> = {
  getStore(): T | undefined;
  run<R>(store: T, callback: () => R): R;
};

const urlSubstringRe = /\b(?:https?|wss?|postgres(?:ql)?):\/\/[^\s"'<>]+/gi;

// ============================================================================
// 敏感字段配置
// ============================================================================

interface RedactionRule {
  field: string;
  pattern?: RegExp;
  replace?: string;
  exactMatch?: boolean;
}

// 结构化脱敏规则 - 更精确的匹配
const REDACTION_RULES: RedactionRule[] = [
  // 精确字段匹配
  { field: 'password', exactMatch: true },
  { field: 'token', exactMatch: true },
  { field: 'secret', exactMatch: true },
  { field: 'privateKey', exactMatch: true },
  { field: 'mnemonic', exactMatch: true },
  { field: 'apiKey', exactMatch: true },
  { field: 'apiSecret', exactMatch: true },
  { field: 'passphrase', exactMatch: true },
  { field: 'seed', exactMatch: true },
  { field: 'signature', exactMatch: true },
  { field: 'accessToken', exactMatch: true },
  { field: 'refreshToken', exactMatch: true },
  { field: 'idToken', exactMatch: true },

  // 包含匹配的字段
  { field: 'authorization', exactMatch: false },
  { field: 'cookie', exactMatch: false },
  { field: 'csrf', exactMatch: false },
  { field: 'xsrf', exactMatch: false },
  { field: 'credential', exactMatch: false },
  { field: 'wallet', exactMatch: false },

  // 特定模式匹配
  {
    field: 'authorization',
    pattern: /^Bearer\s+(.+)$/i,
    replace: 'Bearer <REDACTED>',
  },
];

// 敏感数据正则模式 - 更精确的匹配
const SENSITIVE_PATTERNS = [
  // 以太坊私钥 (64位 hex)
  { pattern: /\b0x[a-f0-9]{64}\b/gi, name: 'eth_private_key' },
  // Solana 私钥 (Base58, 88-96 字符)
  { pattern: /\b[1-9A-HJ-NP-Za-km-z]{88,96}\b/g, name: 'solana_private_key' },
  // BIP39 助记词 (12/24个单词)
  { pattern: /\b(?:[a-z]+[ \t]+){11,23}[a-z]+\b/gi, name: 'mnemonic' },
  // RPC URL 中的认证信息
  { pattern: /(https?:\/\/)[^@\s]+@/gi, name: 'url_auth', replace: '$1<REDACTED>@' },
  // API Keys - Stripe 格式
  { pattern: /\b(sk|pk)_(live|test)_[a-zA-Z0-9]{24,}\b/gi, name: 'stripe_key' },
  // JWT Token
  { pattern: /\beyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\b/g, name: 'jwt_token' },
  // 基础认证头
  { pattern: /\bBasic\s+[a-zA-Z0-9+/=]{20,}\b/gi, name: 'basic_auth' },
  // AWS Access Key ID
  { pattern: /\bAKIA[0-9A-Z]{16}\b/g, name: 'aws_access_key' },
  // GitHub Token
  { pattern: /\bghp_[a-zA-Z0-9]{36}\b/g, name: 'github_token' },
] as const;

// 字段名模式（用于检测敏感字段）
const SENSITIVE_FIELD_PATTERNS = [
  /^password$/i,
  /^token$/i,
  /^secret$/i,
  /key$/i,
  /secret$/i,
  /token$/i,
  /password$/i,
  /auth$/i,
  /credential/i,
];

function redactUrlString(raw: string) {
  try {
    const u = new URL(raw);
    u.username = '';
    u.password = '';
    u.search = '';
    u.hash = '';
    const segments = u.pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      for (let i = 0; i < segments.length; i += 1) {
        const seg = segments[i] ?? '';
        const looksLikeToken =
          seg.length >= 16 && /^[a-zA-Z0-9_-]+$/.test(seg) && !seg.includes('.');
        if (looksLikeToken) segments[i] = '<redacted>';
      }
      if (segments.length > 6) {
        segments.splice(6, segments.length - 6, '…');
      }
      u.pathname = '/' + segments.join('/');
    }
    return u.toString();
  } catch {
    const trimmed = raw.trim();
    if (trimmed.length <= 140) return trimmed;
    return trimmed.slice(0, 140) + '…';
  }
}

function redactSensitiveData(value: string): string {
  let redacted = value;

  // 使用新的结构化模式
  for (const { pattern } of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, '<REDACTED>');
  }

  return redacted;
}

/**
 * 检查字段名是否敏感
 */
function isSensitiveField(fieldName: string): boolean {
  const lowerName = fieldName.toLowerCase();
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(lowerName));
}

/**
 * 应用结构化脱敏规则
 */
function applyRedactionRules(fieldName: string, value: string): string | null {
  const lowerName = fieldName.toLowerCase();

  for (const rule of REDACTION_RULES) {
    const fieldMatch = rule.exactMatch
      ? lowerName === rule.field.toLowerCase()
      : lowerName.includes(rule.field.toLowerCase());

    if (fieldMatch) {
      // 如果有特定模式，尝试匹配
      if (rule.pattern && rule.replace) {
        if (rule.pattern.test(value)) {
          return value.replace(rule.pattern, rule.replace);
        }
      }
      // 完全脱敏
      return '<REDACTED>';
    }
  }

  return null; // 没有匹配的规则
}

function redactSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // 首先检查结构化规则
    if (typeof value === 'string') {
      const redacted = applyRedactionRules(key, value);
      if (redacted !== null) {
        result[key] = redacted;
        continue;
      }
    }

    // 使用字段名模式匹配
    const isSensitive = isSensitiveField(key);

    if (isSensitive) {
      result[key] = '<REDACTED>';
    } else if (typeof value === 'string') {
      result[key] = redactSensitiveData(value);
    } else if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        result[key] = value.map((item) =>
          typeof item === 'object' && item !== null
            ? redactSensitiveFields(item as Record<string, unknown>)
            : item,
        );
      } else {
        result[key] = redactSensitiveFields(value as Record<string, unknown>);
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

function redactUrlsInText(input: string) {
  if (!input.includes('://')) return input;
  return input.replace(urlSubstringRe, (match) => {
    let raw = match;
    let suffix = '';
    while (raw.length > 0 && /[),.;\]}]$/.test(raw)) {
      suffix = raw.slice(-1) + suffix;
      raw = raw.slice(0, -1);
    }
    return redactUrlString(raw) + suffix;
  });
}

function serializeError(error: Error): Record<string, unknown> {
  const cause = (error as { cause?: unknown }).cause;
  return {
    name: error.name,
    message: redactUrlsInText(error.message),
    stack: error.stack ? redactUrlsInText(error.stack) : undefined,
    cause:
      cause instanceof Error
        ? serializeError(cause)
        : typeof cause === 'string'
          ? redactUrlsInText(cause)
          : typeof cause === 'bigint'
            ? cause.toString(10)
            : cause,
  };
}

function normalizeForJson(value: unknown, seen: WeakSet<object>): unknown {
  if (value instanceof Error) return serializeError(value);
  if (typeof value === 'string') return redactUrlsInText(redactSensitiveData(value));
  if (typeof value === 'bigint') return value.toString(10);
  if (value instanceof Date) return value.toISOString();
  if (!value || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((v) => normalizeForJson(v, seen));
  }
  if (value instanceof Map) {
    return Array.from(value.entries()).map(([k, v]) => ({
      key: normalizeForJson(k, seen),
      value: normalizeForJson(v, seen),
    }));
  }
  if (value instanceof Set) {
    return Array.from(value.values()).map((v) => normalizeForJson(v, seen));
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = normalizeForJson(v, seen);
  }

  return redactSensitiveFields(out);
}

function normalizeMetadata(
  metadata?: Record<string, unknown>,
): Record<string, unknown> | undefined {
  if (metadata === undefined) return undefined;
  const normalized = normalizeForJson(metadata, new WeakSet());
  if (!normalized || typeof normalized !== 'object' || Array.isArray(normalized)) {
    return { metadata: normalized };
  }
  return normalized as Record<string, unknown>;
}

let asyncLocalStorage: AsyncLocalStorageLike<LogContext> | null | undefined;

async function initAsyncLocalStorage(): Promise<AsyncLocalStorageLike<LogContext> | null> {
  if (asyncLocalStorage !== undefined) return asyncLocalStorage;
  if (typeof window !== 'undefined') {
    asyncLocalStorage = null;
    return null;
  }

  const runtime = typeof process !== 'undefined' && process.env ? process.env.NEXT_RUNTIME : '';
  if (runtime && runtime !== 'nodejs') {
    asyncLocalStorage = null;
    return null;
  }

  try {
    // 使用动态导入替代 eval，更安全
    const mod = await import('node:async_hooks');
    if (!mod.AsyncLocalStorage) {
      asyncLocalStorage = null;
      return null;
    }
    asyncLocalStorage = new mod.AsyncLocalStorage();
    return asyncLocalStorage;
  } catch {
    asyncLocalStorage = null;
    return null;
  }
}

function getAsyncLocalStorage(): AsyncLocalStorageLike<LogContext> | null {
  // 同步获取，如果未初始化则返回 null
  // 异步初始化在模块加载时执行
  return asyncLocalStorage ?? null;
}

function getLogContext(): LogContext | undefined {
  const storage = getAsyncLocalStorage();
  return storage?.getStore();
}

/**
 * Checks if a log level should be logged based on current configuration
 * @param level - Log level to check
 * @returns True if the level should be logged, false otherwise
 */
function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

/**
 * Creates a structured log message with timestamp and metadata
 * @param level - Log level
 * @param message - Log message
 * @param metadata - Additional metadata for the log
 * @returns Structured log object
 */
/**
 * 清理日志消息，防止日志注入攻击
 * 移除控制字符和格式化字符
 */
function sanitizeLogMessage(message: string): string {
  return (
    message
      // 移除控制字符
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      // 转义换行符
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      // 转义制表符
      .replace(/\t/g, '\\t')
  );
}

function createLogEntry(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const context = normalizeMetadata(getLogContext());
  const normalizedMetadata = normalizeMetadata(metadata);
  const logEntry = {
    level: level.toUpperCase(),
    timestamp,
    message: sanitizeLogMessage(redactUrlsInText(message)),
    ...(context || {}),
    ...(normalizedMetadata || {}),
  };
  return logEntry;
}

/**
 * Formats log entry for console output
 * @param logEntry - Structured log entry
 * @returns Formatted string for console
 */
function formatLogEntry(logEntry: ReturnType<typeof createLogEntry>): string {
  if (isProd) {
    // JSON format for production
    return JSON.stringify(logEntry);
  }
  // Human-readable format for development
  const { level, timestamp, message, ...metadata } = logEntry;
  const metadataStr =
    Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata, null, 2)}` : '';
  return `${level} [${timestamp}] ${message}${metadataStr}`;
}

/**
 * Enhanced logger with structured logging, timestamps, and context support
 */
export const logger = {
  /**
   * Trace level logging - for very detailed debugging
   * @param message - Log message
   * @param metadata - Additional context metadata
   */
  trace: (message: string, metadata?: Record<string, unknown>) => {
    if (shouldLog('trace')) {
      const logEntry = createLogEntry('trace', message, metadata);
      console.trace(formatLogEntry(logEntry));
    }
  },

  /**
   * Debug level logging - for development debugging
   * @param message - Log message
   * @param metadata - Additional context metadata
   */
  debug: (message: string, metadata?: Record<string, unknown>) => {
    if (shouldLog('debug') && shouldSample()) {
      const logEntry = createLogEntry('debug', message, metadata);
      console.debug(formatLogEntry(logEntry));
    }
  },

  /**
   * Info level logging - for general information
   * @param message - Log message
   * @param metadata - Additional context metadata
   */
  info: (message: string, metadata?: Record<string, unknown>) => {
    if (shouldLog('info') && shouldSample()) {
      const logEntry = createLogEntry('info', message, metadata);
      console.info(formatLogEntry(logEntry));
    }
  },

  /**
   * Warn level logging - for warnings
   * @param message - Log message
   * @param metadata - Additional context metadata
   */
  warn: (message: string, metadata?: Record<string, unknown>) => {
    if (shouldLog('warn')) {
      const logEntry = createLogEntry('warn', message, metadata);
      console.warn(formatLogEntry(logEntry));
    }
  },

  /**
   * Error level logging - for errors
   * @param message - Log message
   * @param metadata - Additional context metadata, should include error object if available
   */
  error: async (message: string, metadata?: Record<string, unknown>) => {
    if (shouldLog('error')) {
      const logEntry = createLogEntry('error', message, metadata);
      console.error(formatLogEntry(logEntry));

      const sentryModule = await loadSentry();
      if (sentryModule) {
        const errorObj = metadata?.error instanceof Error ? metadata.error : new Error(message);
        sentryModule.captureException(errorObj, {
          level: 'error',
          extra: { ...metadata, message },
        });
      }
    }
  },

  /**
   * Fatal level logging - for critical errors that cause application failure
   * @param message - Log message
   * @param metadata - Additional context metadata, should include error object if available
   */
  fatal: async (message: string, metadata?: Record<string, unknown>) => {
    if (shouldLog('fatal')) {
      const logEntry = createLogEntry('fatal', message, metadata);
      console.error(formatLogEntry(logEntry));

      const sentryModule = await loadSentry();
      if (sentryModule) {
        const errorObj = metadata?.error instanceof Error ? metadata.error : new Error(message);
        sentryModule.captureException(errorObj, {
          level: 'fatal',
          extra: { ...metadata, message },
        });
      }
    }
  },
};

// 初始化 AsyncLocalStorage（在服务端环境）
if (typeof window === 'undefined') {
  void initAsyncLocalStorage();
}
