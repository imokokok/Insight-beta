const isProd =
  typeof process !== 'undefined' && process.env ? process.env.NODE_ENV === 'production' : false;

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
  if (typeof value === 'string') return redactUrlsInText(value);
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
  return out;
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

function getAsyncLocalStorage(): AsyncLocalStorageLike<LogContext> | null {
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
    const req = (0, eval)('require') as ((id: string) => unknown) | undefined;
    if (!req) {
      asyncLocalStorage = null;
      return null;
    }
    const mod = req('node:async_hooks') as {
      AsyncLocalStorage?: new () => AsyncLocalStorageLike<LogContext>;
    };
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

function getLogContext(): LogContext | undefined {
  const storage = getAsyncLocalStorage();
  return storage?.getStore();
}

export function withLogContext<R>(context: LogContext, fn: () => R): R {
  const storage = getAsyncLocalStorage();
  if (!storage) return fn();
  const parent = storage.getStore() || {};
  return storage.run({ ...parent, ...context }, fn);
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
function createLogEntry(level: LogLevel, message: string, metadata?: Record<string, unknown>) {
  const timestamp = new Date().toISOString();
  const context = normalizeMetadata(getLogContext());
  const normalizedMetadata = normalizeMetadata(metadata);
  const logEntry = {
    level: level.toUpperCase(),
    timestamp,
    message: redactUrlsInText(message),
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
    if (shouldLog('debug')) {
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
    if (shouldLog('info')) {
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
  error: (message: string, metadata?: Record<string, unknown>) => {
    if (shouldLog('error')) {
      const logEntry = createLogEntry('error', message, metadata);
      console.error(formatLogEntry(logEntry));
    }
  },

  /**
   * Fatal level logging - for critical errors that cause application failure
   * @param message - Log message
   * @param metadata - Additional context metadata, should include error object if available
   */
  fatal: (message: string, metadata?: Record<string, unknown>) => {
    if (shouldLog('fatal')) {
      const logEntry = createLogEntry('fatal', message, metadata);
      console.error(formatLogEntry(logEntry));
    }
  },
};
