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
  formatUsd,
  formatNumberCompact,
  formatTime,
  calculatePercentage,
  formatDurationMinutes,
  toIsoFromSeconds,
  copyToClipboard,
} from './format';

// API 工具
export {
  ApiClientError,
  getErrorCode,
  getErrorDetails,
  fetchApiData,
  fetchWithErrorHandling,
  fetchWithTimeout,
  getErrorMessage,
} from './api';

// 区块链工具
export { isZeroBytes32, getExplorerUrl, parseRpcUrls } from './blockchain';

// 数学工具
export {
  calculateMedian,
  calculatePercentile,
  calculateMean,
  calculateMeanSafe,
  calculateStdDev,
  calculateCV,
  calculateDeviation,
  roundTo,
} from './math';
