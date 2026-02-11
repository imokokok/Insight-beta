/**
 * Type Guards - 类型守卫函数
 *
 * 用于运行时类型检查，替代不安全的 `as` 类型断言
 */

import type { DashboardStats } from '@/app/oracle/dashboard/page';
import type { CrossChainPriceData } from '@/lib/types/crossChainAnalysisTypes';
import type { OracleProtocol, SupportedChain } from '@/lib/types/unifiedOracleTypes';

// ============================================================================
// WebSocket Message Type Guards
// ============================================================================

interface StatsUpdateMessage {
  type: 'stats_update';
  data: DashboardStats;
}

/**
 * 检查值是否为有效的 DashboardStats 对象
 */
export function isDashboardStats(value: unknown): value is DashboardStats {
  if (typeof value !== 'object' || value === null) return false;
  const stats = value as Record<string, unknown>;

  return (
    typeof stats.totalProtocols === 'number' &&
    typeof stats.totalPriceFeeds === 'number' &&
    typeof stats.activeAlerts === 'number' &&
    typeof stats.avgLatency === 'number'
  );
}

/**
 * 检查值是否为 StatsUpdateMessage 类型
 */
export function isStatsUpdateMessage(value: unknown): value is StatsUpdateMessage {
  if (typeof value !== 'object' || value === null) return false;
  const message = value as Record<string, unknown>;

  return (
    message.type === 'stats_update' &&
    isDashboardStats(message.data)
  );
}

// ============================================================================
// General Type Guards
// ============================================================================

/**
 * 检查值是否为非空字符串
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

/**
 * 检查值是否为正数
 */
export function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

/**
 * 检查值是否为非负数
 */
export function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

/**
 * 检查值是否为有效的日期字符串
 */
export function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const date = new Date(value);
  return !isNaN(date.getTime());
}

/**
 * 检查值是否为有效的 Date 对象
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * 检查值是否为普通对象（非数组、非null）
 */
export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * 检查值是否为数组
 */
export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

/**
 * 检查值是否为布尔值
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

// ============================================================================
// API Response Type Guards
// ============================================================================

interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: unknown;
}

/**
 * 检查值是否为 API 错误响应
 */
export function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (!isPlainObject(value)) return false;
  return typeof value.error === 'string';
}

/**
 * 安全地获取错误消息
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (isApiErrorResponse(error)) return error.error;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
}

// ============================================================================
// Price Data Type Guards
// ============================================================================

const VALID_PROTOCOLS: OracleProtocol[] = [
  'pyth', 'chainlink', 'band', 'api3', 'redstone',
  'switchboard', 'flux', 'dia', 'uma'
];

const VALID_CHAINS: SupportedChain[] = [
  'ethereum', 'polygon', 'arbitrum', 'optimism',
  'base', 'avalanche', 'bsc', 'fantom', 'celo',
  'gnosis', 'linea', 'scroll', 'mantle', 'mode',
  'blast', 'solana', 'near', 'aptos', 'sui',
  'polygonAmoy', 'sepolia', 'goerli', 'mumbai', 'local'
];

/**
 * 检查值是否为有效的 OracleProtocol
 */
export function isOracleProtocol(value: unknown): value is OracleProtocol {
  return typeof value === 'string' && VALID_PROTOCOLS.includes(value as OracleProtocol);
}

/**
 * 检查值是否为有效的 SupportedChain
 */
export function isSupportedChain(value: unknown): value is SupportedChain {
  return typeof value === 'string' && VALID_CHAINS.includes(value as SupportedChain);
}

/**
 * 检查值是否为有效的价格数据对象
 */
export function isPriceData(value: unknown): value is CrossChainPriceData {
  if (!isPlainObject(value)) return false;
  
  const data = value as Record<string, unknown>;
  
  // 必需字段检查
  if (!isSupportedChain(data.chain)) return false;
  if (!isOracleProtocol(data.protocol)) return false;
  if (!isNonEmptyString(data.symbol)) return false;
  if (!isNonEmptyString(data.base_asset)) return false;
  if (!isNonEmptyString(data.quote_asset)) return false;
  if (!isPositiveNumber(data.price)) return false;
  if (!isNonEmptyString(data.priceRaw)) return false;
  if (!isNonNegativeNumber(data.decimals)) return false;
  if (!isValidDate(data.timestamp) && !isValidDateString(data.timestamp)) return false;
  
  // 可选字段类型检查
  if (data.confidence !== undefined && !isNonNegativeNumber(data.confidence)) return false;
  if (data.blockNumber !== undefined && !isNonNegativeNumber(data.blockNumber)) return false;
  if (data.txHash !== undefined && typeof data.txHash !== 'string') return false;
  if (data.isStale !== undefined && !isBoolean(data.isStale)) return false;
  if (data.stalenessSeconds !== undefined && !isNonNegativeNumber(data.stalenessSeconds)) return false;
  
  return true;
}

/**
 * 检查值是否为有效的价格数据数组
 */
export function isPriceDataArray(value: unknown): value is CrossChainPriceData[] {
  if (!isArray(value)) return false;
  return value.every(isPriceData);
}

/**
 * 检查值是否为有效的价格更新消息
 */
interface PriceUpdateMessage {
  type: 'price_update';
  data: CrossChainPriceData[];
  timestamp: number;
}

export function isPriceUpdateMessage(value: unknown): value is PriceUpdateMessage {
  if (!isPlainObject(value)) return false;
  
  const message = value as Record<string, unknown>;
  
  return (
    message.type === 'price_update' &&
    isPriceDataArray(message.data) &&
    typeof message.timestamp === 'number'
  );
}

// ============================================================================
// String Validation Type Guards
// ============================================================================

/**
 * 检查值是否为有效的以太坊地址
 */
export function isEthereumAddress(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

/**
 * 检查值是否为有效的交易哈希
 */
export function isTransactionHash(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}

/**
 * 检查值是否为有效的 Symbol 格式（如 ETH/USD）
 */
export function isValidSymbol(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return /^[A-Z0-9]+\/[A-Z0-9]+$/.test(value);
}

// ============================================================================
// Number Validation Type Guards
// ============================================================================

/**
 * 检查值是否为有效的价格（正数且在一定范围内）
 */
export function isValidPrice(value: unknown): value is number {
  if (!isPositiveNumber(value)) return false;
  // 价格应该在合理范围内（0.00000001 到 1万亿）
  return value >= 1e-8 && value <= 1e12;
}

/**
 * 检查值是否为有效的百分比（0-100）
 */
export function isValidPercentage(value: unknown): value is number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return false;
  return value >= 0 && value <= 100;
}

/**
 * 检查值是否为有效的区块号
 */
export function isValidBlockNumber(value: unknown): value is number {
  return isNonNegativeNumber(value) && Number.isInteger(value);
}

// ============================================================================
// Safe Parsing Functions
// ============================================================================

/**
 * 安全地解析 JSON，返回 Result 类型
 */
export function safeJsonParse<T>(json: string): { success: true; data: T } | { success: false; error: Error } {
  try {
    return { success: true, data: JSON.parse(json) as T };
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error : new Error('JSON parse failed') 
    };
  }
}

/**
 * 安全地将值转换为数字
 */
export function safeToNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  if (typeof value === 'bigint') {
    return Number(value);
  }
  return null;
}

/**
 * 安全地将值转换为日期
 */
export function safeToDate(value: unknown): Date | null {
  if (value instanceof Date) return isValidDate(value) ? value : null;
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return isValidDate(date) ? date : null;
  }
  return null;
}

// ============================================================================
// Assertion Functions (for development/debugging)
// ============================================================================

/**
 * 断言值不为 null/undefined，否则抛出错误
 */
export function assertDefined<T>(value: T, message = 'Value is not defined'): asserts value is NonNullable<T> {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
}

/**
 * 断言值为特定类型，否则抛出错误
 */
export function assertType<T>(
  value: unknown, 
  guard: (v: unknown) => v is T, 
  message = 'Value is not of expected type'
): asserts value is T {
  if (!guard(value)) {
    throw new Error(message);
  }
}
