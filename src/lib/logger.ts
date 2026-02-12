import { env } from './config/env';

import type * as SentryModule from '@sentry/nextjs';

const isProd = env.NODE_ENV === 'production';
const isServer = typeof window === 'undefined';

let sentry: typeof SentryModule | null = null;

async function loadSentry() {
  if (sentry !== null) return sentry;
  if (!isServer) return null;
  try {
    sentry = await import('@sentry/nextjs');
    return sentry;
  } catch {
    return null;
  }
}

const LOG_LEVELS = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 3,
  error: 4,
  fatal: 5,
} as const;

export type LogLevel = keyof typeof LOG_LEVELS;

const LOG_SAMPLE_RATE = isProd ? env.LOG_SAMPLE_RATE : 1;

let logSampleCounter = 0;

function shouldSample(): boolean {
  if (LOG_SAMPLE_RATE >= 1) return true;
  logSampleCounter++;
  return logSampleCounter % Math.ceil(1 / LOG_SAMPLE_RATE) === 0;
}

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

interface RedactionRule {
  field: string;
  pattern?: RegExp;
  replace?: string;
  exactMatch?: boolean;
}

const REDACTION_RULES: RedactionRule[] = [
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
  { field: 'authorization', exactMatch: false },
  { field: 'cookie', exactMatch: false },
  { field: 'csrf', exactMatch: false },
  { field: 'xsrf', exactMatch: false },
  { field: 'credential', exactMatch: false },
  { field: 'wallet', exactMatch: false },
  {
    field: 'authorization',
    pattern: /^Bearer\s+(.+)$/i,
    replace: 'Bearer <REDACTED>',
  },
];

const SENSITIVE_PATTERNS = [
  { pattern: /\b0x[a-f0-9]{64}\b/gi, name: 'eth_private_key' },
  { pattern: /\b[1-9A-HJ-NP-Za-km-z]{88,96}\b/g, name: 'solana_private_key' },
  { pattern: /\b[a-z]+(?:\s+[a-z]+){11,23}\b/gi, name: 'mnemonic' },
  { pattern: /(https?:\/\/)[^@\s]+@/gi, name: 'url_auth', replace: '$1<REDACTED>@' },
  { pattern: /\b(sk|pk)_(live|test)_[a-zA-Z0-9]{24,}\b/gi, name: 'stripe_key' },
  { pattern: /\beyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\b/g, name: 'jwt_token' },
  { pattern: /\bBasic\s+[a-zA-Z0-9+/=]{20,}\b/gi, name: 'basic_auth' },
  { pattern: /\bAKIA[0-9A-Z]{16}\b/g, name: 'aws_access_key' },
  { pattern: /\bghp_[a-zA-Z0-9]{36}\b/g, name: 'github_token' },
] as const;

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
  for (const { pattern } of SENSITIVE_PATTERNS) {
    redacted = redacted.replace(pattern, '<REDACTED>');
  }
  return redacted;
}

function isSensitiveField(fieldName: string): boolean {
  const lowerName = fieldName.toLowerCase();
  return SENSITIVE_FIELD_PATTERNS.some((pattern) => pattern.test(lowerName));
}

function applyRedactionRules(fieldName: string, value: string): string | null {
  const lowerName = fieldName.toLowerCase();

  for (const rule of REDACTION_RULES) {
    const fieldMatch = rule.exactMatch
      ? lowerName === rule.field.toLowerCase()
      : lowerName.includes(rule.field.toLowerCase());

    if (fieldMatch) {
      if (rule.pattern && rule.replace) {
        if (rule.pattern.test(value)) {
          return value.replace(rule.pattern, rule.replace);
        }
      }
      return '<REDACTED>';
    }
  }

  return null;
}

function redactSensitiveFields(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      const redacted = applyRedactionRules(key, value);
      if (redacted !== null) {
        result[key] = redacted;
        continue;
      }
    }

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

let asyncLocalStorage: AsyncLocalStorageLike<LogContext> | null = null;
let asyncStorageInitialized = false;

function initAsyncLocalStorage(): void {
  if (!isServer || asyncStorageInitialized) return;

  const runtime = typeof process !== 'undefined' && process.env ? process.env.NEXT_RUNTIME : '';
  if (runtime && runtime !== 'nodejs') {
    asyncStorageInitialized = true;
    return;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-implied-eval
    const asyncHooks = eval('require')('node:async_hooks');
    if (asyncHooks.AsyncLocalStorage) {
      asyncLocalStorage = new asyncHooks.AsyncLocalStorage();
    }
  } catch {
    // async_hooks not available
  }
  asyncStorageInitialized = true;
}

function getAsyncLocalStorage(): AsyncLocalStorageLike<LogContext> | null {
  if (!isServer) return null;
  if (!asyncStorageInitialized) {
    initAsyncLocalStorage();
  }
  return asyncLocalStorage;
}

function getLogContext(): LogContext | undefined {
  const storage = getAsyncLocalStorage();
  return storage?.getStore();
}

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel];
}

function sanitizeLogMessage(message: string): string {
  // eslint-disable-next-line no-control-regex
  const controlCharsRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
  return (
    message
      .replace(controlCharsRegex, '')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
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

function formatLogEntry(logEntry: ReturnType<typeof createLogEntry>): string {
  if (isProd) {
    return JSON.stringify(logEntry);
  }
  const { level, timestamp, message, ...metadata } = logEntry;
  const metadataStr =
    Object.keys(metadata).length > 0 ? ` ${JSON.stringify(metadata, null, 2)}` : '';
  return `${level} [${timestamp}] ${message}${metadataStr}`;
}

const sentryQueue: Array<{
  message: string;
  metadata?: Record<string, unknown>;
  level: 'error' | 'fatal';
}> = [];

let isProcessingQueue = false;

async function processSentryQueue(): Promise<void> {
  if (!isServer) return;
  if (isProcessingQueue) return;
  isProcessingQueue = true;

  while (sentryQueue.length > 0) {
    const item = sentryQueue.shift();
    if (!item) break;

    try {
      const sentryModule = await loadSentry();
      if (sentryModule) {
        const errorObj =
          item.metadata?.error instanceof Error ? item.metadata.error : new Error(item.message);
        sentryModule.captureException(errorObj, {
          level: item.level,
          extra: { ...item.metadata, message: item.message },
        });
      }
    } catch {
      // Sentry 上报失败，静默处理
    }
  }

  isProcessingQueue = false;
}

function queueSentryReport(message: string, metadata: Record<string, unknown> | undefined, level: 'error' | 'fatal'): void {
  if (!isServer) return;
  sentryQueue.push({ message, metadata, level });
  if (typeof setImmediate !== 'undefined') {
    setImmediate(processSentryQueue);
  } else {
    setTimeout(processSentryQueue, 0);
  }
}

export const logger = {
  trace: (message: string, metadata?: Record<string, unknown>) => {
    if (shouldLog('trace')) {
      const logEntry = createLogEntry('trace', message, metadata);
      console.trace(formatLogEntry(logEntry));
    }
  },

  debug: (message: string, metadata?: Record<string, unknown>) => {
    if (shouldLog('debug') && shouldSample()) {
      const logEntry = createLogEntry('debug', message, metadata);
      console.debug(formatLogEntry(logEntry));
    }
  },

  info: (message: string, metadata?: Record<string, unknown>) => {
    if (shouldLog('info') && shouldSample()) {
      const logEntry = createLogEntry('info', message, metadata);
      console.info(formatLogEntry(logEntry));
    }
  },

  warn: (message: string, metadata?: Record<string, unknown>) => {
    if (shouldLog('warn')) {
      const logEntry = createLogEntry('warn', message, metadata);
      console.warn(formatLogEntry(logEntry));
    }
  },

  error: (message: string, metadata?: Record<string, unknown>) => {
    if (shouldLog('error')) {
      const logEntry = createLogEntry('error', message, metadata);
      console.error(formatLogEntry(logEntry));
      queueSentryReport(message, metadata, 'error');
    }
  },

  fatal: (message: string, metadata?: Record<string, unknown>) => {
    if (shouldLog('fatal')) {
      const logEntry = createLogEntry('fatal', message, metadata);
      console.error(formatLogEntry(logEntry));
      queueSentryReport(message, metadata, 'fatal');
    }
  },
};

if (isServer && !asyncStorageInitialized) {
  initAsyncLocalStorage();
}
