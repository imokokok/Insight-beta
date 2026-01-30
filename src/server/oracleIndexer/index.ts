/**
 * Oracle Indexer 模块
 *
 * 提供 Oracle 数据索引和同步功能，包括：
 * - RPC 客户端管理
 * - 同步状态管理
 * - 事件处理和数据同步
 * - 性能监控和告警
 *
 * @example
 * ```typescript
 * import { syncOracleOnce, ensureOracleSynced, isOracleSyncing } from '@/server/oracleIndexer';
 *
 * // 执行一次同步
 * const result = await syncOracleOnce('default');
 *
 * // 确保同步完成（避免并发）
 * const result = await ensureOracleSynced(syncOracleOnce, 'default');
 *
 * // 检查是否正在同步
 * const syncing = isOracleSyncing('default');
 * ```
 */

// ==================== 类型导出 ====================
export type { RpcStatsItem, RpcStats, SyncErrorCode, OracleEnv, SyncResult } from './types';

// ==================== 常量导出 ====================
export {
  DEFAULT_RPC_TIMEOUT_MS,
  MIN_BLOCK_WINDOW,
  MAX_BLOCK_WINDOW,
  ADAPTIVE_GROWTH_FACTOR,
  ADAPTIVE_SHRINK_FACTOR,
  MAX_CONSECUTIVE_EMPTY_RANGES,
  MAX_RETRY_BACKOFF_MS,
  MAX_RETRIES,
  CACHE_TTL_MS,
} from './constants';

// ==================== RPC 客户端导出 ====================
export {
  getRpcTimeoutMs,
  getCachedClient,
  cleanupClientCache,
  redactRpcUrl,
  pickNextRpcUrl,
} from './rpcClient';

// ==================== RPC 统计导出 ====================
export {
  readRpcStats,
  recordRpcOk,
  recordRpcFail,
  calculateBackoff,
  toSyncErrorCode,
} from './rpcStats';

// ==================== 环境配置导出 ====================
export { getOracleEnv, isDegradedMode, isVoteTrackingEnabled } from './env';

// ==================== 同步状态导出 ====================
export {
  ensureOracleSynced,
  isOracleSyncing,
  getSyncingInstances,
  cancelSync,
  cancelAllSyncs,
} from './syncState';

// ==================== 同步核心导出 ====================
export { syncOracleOnce } from './syncCore';
