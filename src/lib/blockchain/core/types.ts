/**
 * Core Oracle Client Types - 核心预言机客户端类型定义
 *
 * 提供统一的类型系统，支持所有预言机协议
 */

import type {
  OracleProtocol,
  SupportedChain,
  UnifiedPriceFeed,
} from '@/lib/types/unifiedOracleTypes';

import type { Address } from 'viem';

// ============================================================================
// 客户端配置类型
// ============================================================================

export interface OracleClientConfig {
  /** 目标链 */
  chain: SupportedChain;
  /** 协议类型 */
  protocol: OracleProtocol;
  /** RPC URL */
  rpcUrl?: string;
  /** 多 RPC 故障转移 */
  rpcUrls?: string[];
  /** 超时时间 (毫秒) */
  timeoutMs?: number;
  /** 重试次数 */
  retryAttempts?: number;
  /** 并发限制 */
  concurrencyLimit?: number;
  /** 陈旧阈值 (秒) */
  stalenessThreshold?: number;
  /** 置信度阈值 */
  confidenceThreshold?: number;
  /** 自定义合约地址 */
  contractAddress?: Address;
  /** API Key */
  apiKey?: string;
  /** API 端点 */
  apiEndpoint?: string;
  /** Band: 最小数据源数量 */
  minCount?: number;
  /** Band: 请求数据源数量 */
  askCount?: number;
}

export interface RequiredOracleClientConfig {
  chain: SupportedChain;
  protocol: OracleProtocol;
  rpcUrl: string;
  rpcUrls: string[];
  timeoutMs: number;
  retryAttempts: number;
  concurrencyLimit: number;
  stalenessThreshold: number;
  confidenceThreshold: number;
  contractAddress: Address | undefined;
  apiKey: string | undefined;
}

// ============================================================================
// 健康状态类型
// ============================================================================

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface OracleHealthStatus {
  status: HealthStatus;
  lastUpdate: number;
  latency?: number;
  issues?: string[];
  metadata?: Record<string, unknown>;
}

// ============================================================================
// 客户端能力类型
// ============================================================================

export interface OracleClientCapabilities {
  /** 支持价格喂送 */
  priceFeeds: boolean;
  /** 支持断言机制 */
  assertions: boolean;
  /** 支持争议机制 */
  disputes: boolean;
  /** 支持随机数生成 */
  vrf: boolean;
  /** 支持自定义数据 */
  customData: boolean;
  /** 支持质押 */
  staking?: boolean;
  /** 支持治理 */
  governance?: boolean;
  /** 支持批量查询 */
  batchQueries?: boolean;
  /** 支持 WebSocket */
  websocket?: boolean;
}

// ============================================================================
// 价格数据类型扩展
// ============================================================================

export interface PriceFetchOptions {
  /** 包含历史数据 */
  includeHistory?: boolean;
  /** 最大历史记录数 */
  historyLimit?: number;
  /** 强制刷新缓存 */
  forceRefresh?: boolean;
  /** 超时时间 */
  timeoutMs?: number;
}

export interface BatchPriceResult {
  /** 成功获取的价格 */
  prices: UnifiedPriceFeed[];
  /** 失败的符号 */
  failed: Array<{
    symbol: string;
    error: string;
  }>;
  /** 总耗时 */
  durationMs: number;
}

// ============================================================================
// 错误类型
// ============================================================================

export class OracleClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly protocol: OracleProtocol,
    public readonly chain: SupportedChain,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'OracleClientError';
  }
}

export class PriceFetchError extends OracleClientError {
  constructor(
    message: string,
    protocol: OracleProtocol,
    chain: SupportedChain,
    public readonly symbol: string,
    cause?: unknown,
  ) {
    super(message, 'PRICE_FETCH_ERROR', protocol, chain, cause);
    this.name = 'PriceFetchError';
  }
}

export class HealthCheckError extends OracleClientError {
  constructor(message: string, protocol: OracleProtocol, chain: SupportedChain, cause?: unknown) {
    super(message, 'HEALTH_CHECK_ERROR', protocol, chain, cause);
    this.name = 'HealthCheckError';
  }
}

// ============================================================================
// 日志类型
// ============================================================================

export interface OracleClientLogger {
  debug: (message: string, meta?: Record<string, unknown>) => void;
  info: (message: string, meta?: Record<string, unknown>) => void;
  warn: (message: string, meta?: Record<string, unknown>) => void;
  error: (message: string, meta?: Record<string, unknown>) => void;
}

// ============================================================================
// 客户端接口定义
// ============================================================================

export interface IOracleClient {
  /** 协议类型 */
  readonly protocol: OracleProtocol;
  /** 目标链 */
  readonly chain: SupportedChain;
  /** 客户端配置 */
  readonly config: RequiredOracleClientConfig;

  /**
   * 获取单个价格
   */
  getPrice(symbol: string, options?: PriceFetchOptions): Promise<UnifiedPriceFeed | null>;

  /**
   * 批量获取价格
   */
  getPrices(symbols: string[], options?: PriceFetchOptions): Promise<BatchPriceResult>;

  /**
   * 获取所有可用价格源
   */
  getAllFeeds(): Promise<UnifiedPriceFeed[]>;

  /**
   * 健康检查
   */
  healthCheck(): Promise<OracleHealthStatus>;

  /**
   * 获取客户端能力
   */
  getCapabilities(): OracleClientCapabilities;

  /**
   * 销毁客户端资源
   */
  destroy?(): Promise<void>;
}

// ============================================================================
// 工具函数
// ============================================================================

/**
 * 标准化交易对符号
 * @param symbol - 原始符号
 * @returns 标准化后的符号
 */
export function normalizeSymbol(symbol: string): string {
  return symbol.toUpperCase().replace(/-/g, '/');
}

/**
 * 计算数据新鲜度状态
 * @param timestamp - 数据时间戳 (Date 或毫秒时间戳)
 * @param thresholdSeconds - 陈旧阈值 (秒)，默认 300 (5分钟)
 * @returns 包含 isStale 和 stalenessSeconds 的对象
 */
export function calculateDataFreshness(
  timestamp: Date | number,
  thresholdSeconds: number = 300,
): { isStale: boolean; stalenessSeconds: number } {
  const timestampMs = timestamp instanceof Date ? timestamp.getTime() : timestamp;
  const now = Date.now();
  const stalenessSeconds = Math.floor((now - timestampMs) / 1000);
  const isStale = stalenessSeconds > thresholdSeconds;
  return { isStale, stalenessSeconds: isStale ? stalenessSeconds : 0 };
}

/**
 * 检查价格是否过期
 * @param timestamp - 价格时间戳 (秒)
 * @param threshold - 陈旧阈值 (秒)
 * @returns 是否过期
 */
export function isPriceStale(timestamp: number, threshold: number): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now - timestamp > threshold;
}
