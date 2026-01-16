const isProd =
  typeof process !== "undefined" && process.env
    ? process.env.NODE_ENV === "production"
    : false;

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
    typeof process !== "undefined" && process.env
      ? (process.env.LOG_LEVEL || "").toLowerCase()
      : "";
  if (envLevel in LOG_LEVELS) {
    return envLevel as LogLevel;
  }
  return isProd ? "info" : "debug";
}

const currentLevel = getLogLevel();

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
function createLogEntry(
  level: LogLevel,
  message: string,
  metadata?: Record<string, unknown>,
) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    level: level.toUpperCase(),
    timestamp,
    message,
    ...(metadata || {}),
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
    Object.keys(metadata).length > 0
      ? ` ${JSON.stringify(metadata, null, 2)}`
      : "";
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
    if (shouldLog("trace")) {
      const logEntry = createLogEntry("trace", message, metadata);
      console.trace(formatLogEntry(logEntry));
    }
  },

  /**
   * Debug level logging - for development debugging
   * @param message - Log message
   * @param metadata - Additional context metadata
   */
  debug: (message: string, metadata?: Record<string, unknown>) => {
    if (shouldLog("debug")) {
      const logEntry = createLogEntry("debug", message, metadata);
      console.debug(formatLogEntry(logEntry));
    }
  },

  /**
   * Info level logging - for general information
   * @param message - Log message
   * @param metadata - Additional context metadata
   */
  info: (message: string, metadata?: Record<string, unknown>) => {
    if (shouldLog("info")) {
      const logEntry = createLogEntry("info", message, metadata);
      console.info(formatLogEntry(logEntry));
    }
  },

  /**
   * Warn level logging - for warnings
   * @param message - Log message
   * @param metadata - Additional context metadata
   */
  warn: (message: string, metadata?: Record<string, unknown>) => {
    if (shouldLog("warn")) {
      const logEntry = createLogEntry("warn", message, metadata);
      console.warn(formatLogEntry(logEntry));
    }
  },

  /**
   * Error level logging - for errors
   * @param message - Log message
   * @param metadata - Additional context metadata, should include error object if available
   */
  error: (message: string, metadata?: Record<string, unknown>) => {
    if (shouldLog("error")) {
      const logEntry = createLogEntry("error", message, metadata);
      console.error(formatLogEntry(logEntry));
    }
  },

  /**
   * Fatal level logging - for critical errors that cause application failure
   * @param message - Log message
   * @param metadata - Additional context metadata, should include error object if available
   */
  fatal: (message: string, metadata?: Record<string, unknown>) => {
    if (shouldLog("fatal")) {
      const logEntry = createLogEntry("fatal", message, metadata);
      console.error(formatLogEntry(logEntry));
    }
  },
};
