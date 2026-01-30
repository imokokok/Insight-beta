/**
 * Oracle Indexer 常量定义
 */

/** RPC 默认超时时间（毫秒） */
export const DEFAULT_RPC_TIMEOUT_MS = 30_000;

/** 最小区块窗口 */
export const MIN_BLOCK_WINDOW = 500n;

/** 最大区块窗口 */
export const MAX_BLOCK_WINDOW = 50_000n;

/** 自适应增长因子 */
export const ADAPTIVE_GROWTH_FACTOR = 1.5;

/** 自适应收缩因子 */
export const ADAPTIVE_SHRINK_FACTOR = 0.5;

/** 最大连续空范围次数 */
export const MAX_CONSECUTIVE_EMPTY_RANGES = 3;

/** 最大重试退避时间（毫秒） */
export const MAX_RETRY_BACKOFF_MS = 10_000;

/** 客户端缓存 TTL（毫秒） */
export const CACHE_TTL_MS = 60_000;

/** 最大重试次数 */
export const MAX_RETRIES = 3;

/** 熔断器配置 */
export const CIRCUIT_BREAKER_CONFIG = {
  /** 失败阈值，超过此值打开熔断器 */
  FAILURE_THRESHOLD: 5,
  /** 熔断器打开后的冷却时间（毫秒） */
  COOLING_PERIOD_MS: 30_000,
  /** 半开状态下的测试请求数 */
  HALF_OPEN_REQUESTS: 3,
} as const;

/** 统一超时配置 */
export const TIMEOUTS = {
  /** RPC 调用超时 */
  RPC: 30_000,
  /** Webhook 通知超时 */
  WEBHOOK: 10_000,
  /** 数据库查询超时 */
  DATABASE: 30_000,
  /** 同步任务超时 */
  SYNC: 60_000,
  /** 价格获取超时 */
  PRICE_FETCH: 10_000,
} as const;
