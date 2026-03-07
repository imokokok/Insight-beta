/**
 * Shared Utils - 工具函数统一导出
 */

export * from './blockchain';
export * from './common';
export * from './export';
export * from './format/index';
export * from './math';
export * from './result';
export * from './robustTrendAnalysis';
export * from './storage';
export * from './typeGuards';
export * from './ui';
export * from './url';
export * from './chart.tsx';

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

// 注意：不在这里重新导出 lib/api/apiResponse 中的服务器端工具
// 这些工具只应该在 API 路由（服务器端）中使用
