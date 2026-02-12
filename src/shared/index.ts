/**
 * Shared - 共享代码统一导出
 */

export * from './logger';
export * from './auth';

// 从 utils 导出，排除 getErrorMessage（已在 errors 中定义）
export {
  ApiClientError,
  fetchApiData,
  getErrorCode,
  normalizeListResponse,
  HttpError,
  TimeoutError,
  safeFetch,
  safeFetchWithAuth,
  isHttpError,
  isTimeoutError,
  getHttpErrorMessage,
  type SafeFetchOptions,
} from './utils';

// 错误处理已统一到 @/lib/errors
// 如需使用错误相关功能，请从 @/lib/errors 导入
