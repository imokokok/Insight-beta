/**
 * Shared Utils - 工具函数统一导出
 */

export * from './apiHandler';
export * from './blockchain';
export * from './common';
export * from './export';
export * from './format';
export * from './math';
export * from './percentage';
export * from './pwa';
export * from './result';
export * from './robustTrendAnalysis';
export * from './storage';
export * from './typeGuards';
export * from './ui';
export * from './url';
export * from './alertsUtils';

// HTTP 工具（排除重复的 getErrorMessage）
export {
  HttpError,
  TimeoutError,
  safeFetch,
  safeFetchWithAuth,
  isHttpError,
  isTimeoutError,
  getHttpErrorMessage,
  type SafeFetchOptions,
} from './http';

// 从 api.ts 导出特定函数，避免重复
export { ApiClientError, fetchApiData, getErrorCode, normalizeListResponse } from './api';
