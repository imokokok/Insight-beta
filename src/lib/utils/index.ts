/**
 * Utilities Index
 *
 * 工具函数统一导出
 */

// UI 工具
export { cn, getAssertionStatusColor } from './ui';

// 格式化工具
export {
  formatNumber,
  formatPrice,
  formatTimeAgo,
  truncateAddress,
  formatUsdCompact,
  formatTime,
  calculatePercentage,
  formatDurationMinutes,
  copyToClipboard,
} from './format';

// 百分比格式化工具
export {
  formatPercent,
  formatPercentValue,
  formatChangePercent,
  formatConfidence,
  formatDeviation,
  type FormatPercentOptions,
} from './percentage';

// API 工具
export {
  ApiClientError,
  getErrorCode,
  fetchApiData,
  getErrorMessage,
  normalizeListResponse,
} from './api';

// API Handler 工具
export {
  apiSuccess,
  apiError,
  withErrorHandler,
  getQueryParam,
  getRequiredQueryParam,
  type ApiResponse,
  type ApiRouteHandler,
} from './api-handler';

// 区块链工具
export { getExplorerUrl, parseRpcUrls } from './blockchain';

// 数学工具
export { calculateMedian, calculateMean, calculateStdDev } from './math';

// 通用工具
export { sleep } from './common';

// Storage 工具
export {
  getStorageItem,
  setStorageItem,
  removeStorageItem,
  getOracleFilters,
  getOracleInstanceId,
  setOracleInstanceId,
  clearOracleFilters,
  isDefaultOracleInstance,
  mergeOracleFilters,
  type OracleFilters,
} from './storage';

// URL 工具
export {
  buildApiUrl,
} from './url';



// Result 类型和函数式错误处理
export {
  type Result,
  type Option,
  ok,
  err,
  tryCatch,
  tryCatchAsync,
} from './result';
