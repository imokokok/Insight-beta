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
