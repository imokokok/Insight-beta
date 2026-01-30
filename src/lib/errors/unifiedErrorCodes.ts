/**
 * 统一错误码系统
 *
 * 整合所有错误码定义，提供一致的错误处理体验
 * 错误码格式：CATEGORY_NUMBER (如 AUTH_001, DB_002)
 */

import { logger } from '@/lib/logger';

/**
 * 错误类别前缀
 */
export type ErrorCategory =
  | 'AUTH' // 认证授权
  | 'DB' // 数据库
  | 'NET' // 网络
  | 'VAL' // 验证
  | 'ORACLE' // Oracle 相关
  | 'CONFIG' // 配置
  | 'SYS' // 系统
  | 'API'; // API 相关

/**
 * 统一错误码定义
 */
export const UnifiedErrorCodes = {
  // 认证授权错误 (AUTH_xxx)
  AUTH: {
    UNAUTHORIZED: { code: 'AUTH_001', message: 'Unauthorized', statusCode: 401 },
    FORBIDDEN: { code: 'AUTH_002', message: 'Forbidden', statusCode: 403 },
    TOKEN_EXPIRED: { code: 'AUTH_003', message: 'Token expired', statusCode: 401 },
    INVALID_TOKEN: { code: 'AUTH_004', message: 'Invalid token', statusCode: 401 },
    INSUFFICIENT_PERMISSIONS: {
      code: 'AUTH_005',
      message: 'Insufficient permissions',
      statusCode: 403,
    },
  },

  // 数据库错误 (DB_xxx)
  DB: {
    CONNECTION_ERROR: { code: 'DB_001', message: 'Database connection error', statusCode: 500 },
    QUERY_ERROR: { code: 'DB_002', message: 'Database query error', statusCode: 500 },
    CONSTRAINT_ERROR: { code: 'DB_003', message: 'Database constraint violation', statusCode: 409 },
    NOT_FOUND: { code: 'DB_004', message: 'Record not found', statusCode: 404 },
    TIMEOUT: { code: 'DB_005', message: 'Database timeout', statusCode: 504 },
  },

  // 网络错误 (NET_xxx)
  NET: {
    TIMEOUT: { code: 'NET_001', message: 'Network timeout', statusCode: 504 },
    CONNECTION_ERROR: { code: 'NET_002', message: 'Network connection error', statusCode: 502 },
    RPC_ERROR: { code: 'NET_003', message: 'RPC error', statusCode: 502 },
    RATE_LIMIT: { code: 'NET_004', message: 'Rate limit exceeded', statusCode: 429 },
  },

  // 验证错误 (VAL_xxx)
  VAL: {
    INVALID_INPUT: { code: 'VAL_001', message: 'Invalid input', statusCode: 400 },
    MISSING_FIELD: { code: 'VAL_002', message: 'Missing required field', statusCode: 400 },
    INVALID_FORMAT: { code: 'VAL_003', message: 'Invalid format', statusCode: 400 },
    OUT_OF_RANGE: { code: 'VAL_004', message: 'Value out of range', statusCode: 400 },
  },

  // Oracle 相关错误 (ORACLE_xxx)
  ORACLE: {
    NOT_FOUND: { code: 'ORACLE_001', message: 'Oracle instance not found', statusCode: 404 },
    SYNC_ERROR: { code: 'ORACLE_002', message: 'Oracle sync error', statusCode: 500 },
    INVALID_STATE: { code: 'ORACLE_003', message: 'Invalid oracle state', statusCode: 400 },
    CONTRACT_ERROR: { code: 'ORACLE_004', message: 'Contract interaction error', statusCode: 502 },
    CONFIG_ERROR: { code: 'ORACLE_005', message: 'Oracle configuration error', statusCode: 400 },
  },

  // 配置错误 (CONFIG_xxx)
  CONFIG: {
    MISSING: { code: 'CONFIG_001', message: 'Configuration missing', statusCode: 500 },
    INVALID: { code: 'CONFIG_002', message: 'Invalid configuration', statusCode: 500 },
    ENV_MISSING: { code: 'CONFIG_003', message: 'Environment variable missing', statusCode: 500 },
  },

  // 系统错误 (SYS_xxx)
  SYS: {
    INTERNAL_ERROR: { code: 'SYS_001', message: 'Internal server error', statusCode: 500 },
    NOT_IMPLEMENTED: { code: 'SYS_002', message: 'Not implemented', statusCode: 501 },
    SERVICE_UNAVAILABLE: { code: 'SYS_003', message: 'Service unavailable', statusCode: 503 },
  },

  // API 相关错误 (API_xxx)
  API: {
    VERSION_UNSUPPORTED: { code: 'API_001', message: 'API version unsupported', statusCode: 400 },
    VERSION_DEPRECATED: { code: 'API_002', message: 'API version deprecated', statusCode: 400 },
    ENDPOINT_NOT_FOUND: { code: 'API_003', message: 'Endpoint not found', statusCode: 404 },
    METHOD_NOT_ALLOWED: { code: 'API_004', message: 'Method not allowed', statusCode: 405 },
  },
} as const;

/**
 * 错误码类型
 */
export type ErrorCode = {
  [K in keyof typeof UnifiedErrorCodes]: keyof (typeof UnifiedErrorCodes)[K];
}[keyof typeof UnifiedErrorCodes];

/**
 * 错误详情类型
 */
export interface ErrorDetails {
  code: string;
  message: string;
  statusCode: number;
}

/**
 * 获取错误详情
 */
export function getErrorDetails(category: ErrorCategory, code: string): ErrorDetails {
  const categoryErrors = UnifiedErrorCodes[category];
  if (!categoryErrors) {
    return UnifiedErrorCodes.SYS.INTERNAL_ERROR;
  }

  const errorDetails = categoryErrors[code as keyof typeof categoryErrors];
  if (!errorDetails) {
    return UnifiedErrorCodes.SYS.INTERNAL_ERROR;
  }

  return errorDetails as ErrorDetails;
}

/**
 * 统一应用错误类
 */
export class UnifiedAppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly category: ErrorCategory;
  readonly metadata: Record<string, unknown>;
  readonly timestamp: string;
  private logged = false;

  constructor(
    category: ErrorCategory,
    code: string,
    message?: string,
    metadata: Record<string, unknown> = {},
  ) {
    const details = getErrorDetails(category, code);
    super(message || details.message);

    this.code = `${category}_${code}`;
    this.statusCode = details.statusCode;
    this.category = category;
    this.metadata = metadata;
    this.timestamp = new Date().toISOString();

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * 记录错误日志
   */
  log(): this {
    if (!this.logged) {
      logger.error(this.message, {
        code: this.code,
        category: this.category,
        statusCode: this.statusCode,
        metadata: this.metadata,
        stack: this.stack,
        timestamp: this.timestamp,
      });
      this.logged = true;
    }
    return this;
  }

  /**
   * 转换为 JSON 格式
   */
  toJSON() {
    const isDev = process.env.NODE_ENV === 'development';
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        ...(isDev && {
          stack: this.stack,
          metadata: this.metadata,
        }),
      },
    };
  }

  /**
   * 创建认证错误
   */
  static auth(
    code: keyof (typeof UnifiedErrorCodes)['AUTH'],
    message?: string,
    metadata?: Record<string, unknown>,
  ) {
    return new UnifiedAppError('AUTH', code, message, metadata);
  }

  /**
   * 创建数据库错误
   */
  static db(
    code: keyof (typeof UnifiedErrorCodes)['DB'],
    message?: string,
    metadata?: Record<string, unknown>,
  ) {
    return new UnifiedAppError('DB', code, message, metadata);
  }

  /**
   * 创建网络错误
   */
  static net(
    code: keyof (typeof UnifiedErrorCodes)['NET'],
    message?: string,
    metadata?: Record<string, unknown>,
  ) {
    return new UnifiedAppError('NET', code, message, metadata);
  }

  /**
   * 创建验证错误
   */
  static val(
    code: keyof (typeof UnifiedErrorCodes)['VAL'],
    message?: string,
    metadata?: Record<string, unknown>,
  ) {
    return new UnifiedAppError('VAL', code, message, metadata);
  }

  /**
   * 创建 Oracle 错误
   */
  static oracle(
    code: keyof (typeof UnifiedErrorCodes)['ORACLE'],
    message?: string,
    metadata?: Record<string, unknown>,
  ) {
    return new UnifiedAppError('ORACLE', code, message, metadata);
  }

  /**
   * 创建配置错误
   */
  static config(
    code: keyof (typeof UnifiedErrorCodes)['CONFIG'],
    message?: string,
    metadata?: Record<string, unknown>,
  ) {
    return new UnifiedAppError('CONFIG', code, message, metadata);
  }

  /**
   * 创建系统错误
   */
  static sys(
    code: keyof (typeof UnifiedErrorCodes)['SYS'],
    message?: string,
    metadata?: Record<string, unknown>,
  ) {
    return new UnifiedAppError('SYS', code, message, metadata);
  }

  /**
   * 创建 API 错误
   */
  static api(
    code: keyof (typeof UnifiedErrorCodes)['API'],
    message?: string,
    metadata?: Record<string, unknown>,
  ) {
    return new UnifiedAppError('API', code, message, metadata);
  }
}

/**
 * 错误恢复建议
 */
export const ErrorRecoverySuggestions: Record<string, string[]> = {
  AUTH_001: ['请检查您的登录状态', '尝试重新登录'],
  AUTH_002: ['您没有权限执行此操作', '请联系管理员申请权限'],
  AUTH_003: ['您的登录已过期', '请重新登录'],
  DB_001: ['数据库连接失败', '请稍后重试', '如果问题持续，请联系技术支持'],
  DB_004: ['找不到请求的数据', '请检查参数是否正确'],
  NET_001: ['网络请求超时', '请检查网络连接', '稍后重试'],
  NET_003: ['区块链节点连接失败', '正在自动切换到备用节点'],
  ORACLE_001: ['Oracle 实例不存在', '请检查实例 ID 是否正确'],
  ORACLE_002: ['数据同步失败', '系统将在稍后自动重试'],
  VAL_001: ['输入参数有误', '请检查并修正输入'],
  SYS_001: ['系统内部错误', '请稍后重试', '如果问题持续，请联系技术支持'],
  API_001: ['不支持的 API 版本', '请使用支持的版本: v1, v2'],
  API_002: ['API 版本已弃用', '请迁移到最新版本'],
};

/**
 * 获取错误恢复建议
 */
export function getRecoverySuggestions(errorCode: string): string[] {
  return ErrorRecoverySuggestions[errorCode] || ['请稍后重试', '如果问题持续，请联系技术支持'];
}
