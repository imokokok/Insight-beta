/**
 * Errors Module - 错误处理模块
 *
 * 统一的应用错误处理和类型导出
 */

export {
  // 基础错误类
  AppError,
  // 具体错误类型
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  ExternalServiceError,
  TimeoutError,
  ServiceUnavailableError,
  DatabaseError,
  OracleError,
  // 工具函数
  isAppError,
  toAppError,
  getHttpStatusCode,
  createErrorResponse,
} from './AppError';

export type { ErrorCategory } from './AppError';
