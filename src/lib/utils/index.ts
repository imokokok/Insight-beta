/**
 * Utilities Index
 *
 * 工具函数统一导出
 */

// UI 工具
export { cn, getAssertionStatusColor } from './ui';

// 格式化工具
export {
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
  parsePercent,
  parsePercentValue,
  calculateAndFormatPercent,
  calculateChangePercent,
  formatConfidence,
  formatSuccessRate,
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
  normalizePaginatedResponse,
} from './api';

// API Handler 工具
export {
  apiSuccess,
  apiError,
  withErrorHandler,
  validateRequiredParam,
  getQueryParam,
  getRequiredQueryParam,
  type ApiResponse,
  type ApiRouteHandler,
} from './api-handler';

// 区块链工具
export { getExplorerUrl, parseRpcUrls } from './blockchain';

// 数学工具
export { calculateMedian, calculateMean, calculateStdDev, calculateDeviation } from './math';

// 通用工具
export { sleep } from './common';

// Storage 工具
export {
  STORAGE_KEYS,
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
  buildQueryParams,
  buildApiUrl,
} from './url';

// 类型守卫
export {
  isDashboardStats,
  isStatsUpdateMessage,
  isNonEmptyString,
  isPositiveNumber,
  isNonNegativeNumber,
  isValidDateString,
  isValidDate,
  isPlainObject,
  isArray,
  isBoolean,
  isApiErrorResponse,
  isOracleProtocol,
  isSupportedChain,
  isPriceData,
  isPriceDataArray,
  isPriceUpdateMessage,
  isEthereumAddress,
  isTransactionHash,
  isValidSymbol,
  isValidPrice,
  isValidPercentage,
  isValidBlockNumber,
  safeJsonParse,
  safeToNumber,
  safeToDate,
  assertDefined,
  assertType,
} from './typeGuards';

// Result 类型和函数式错误处理
export {
  type Result,
  type Option,
  ok,
  err,
  tryCatch,
  tryCatchAsync,
  unwrapOr,
  unwrap,
  map,
  mapErr,
  andThen,
  isSome,
  isNone,
  getOrElse,
  getProperty,
  getNestedProperty,
  validateAll,
  combine,
  combineAll,
} from './result';
