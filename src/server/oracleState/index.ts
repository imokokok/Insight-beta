/**
 * Oracle State 模块
 *
 * 提供 Oracle 数据状态的完整管理功能，包括：
 * - 断言（Assertion）的 CRUD 操作
 * - 争议（Dispute）的 CRUD 操作
 * - 投票（Vote）的记录和统计
 * - 同步状态的跟踪
 * - 事件回放功能
 *
 * 支持两种存储后端：
 * - 内存模式：适用于开发和测试环境
 * - PostgreSQL 模式：适用于生产环境
 *
 * @example
 * ```typescript
 * import { readOracleState, upsertAssertion, fetchAssertion } from '@/server/oracleState';
 *
 * // 读取完整状态
 * const state = await readOracleState('default');
 *
 * // 插入断言
 * await upsertAssertion(assertion, 'default');
 *
 * // 获取单个断言
 * const assertion = await fetchAssertion('assertion-id', 'default');
 * ```
 */

// ==================== 类型导出 ====================
export type {
  SyncMeta,
  StoredState,
  SyncState,
  VoteEventInput,
  OracleEventInput,
  SyncMetricInput,
  SyncMetricOutput,
  ReplayResult,
  VoteSums,
} from './types';

// ==================== 常量导出 ====================
export {
  DEFAULT_MEMORY_MAX_VOTE_KEYS,
  DEFAULT_MEMORY_VOTE_BLOCK_WINDOW,
  DEFAULT_MEMORY_MAX_ASSERTIONS,
  DEFAULT_MEMORY_MAX_DISPUTES,
  BATCH_SIZE,
  MAX_SYNC_METRICS,
  STATE_VERSION,
} from './constants';

// 从 oracleConfig 重新导出默认实例 ID
export { DEFAULT_ORACLE_INSTANCE_ID } from '../oracleConfig';

// ==================== 工具函数导出 ====================
export {
  toBigIntOr,
  toIsoOrNull,
  toNullableNumber,
  toNullableString,
  toTimeMs,
  bigintToSafeNumber,
  normalizeInstanceId,
  mapAssertionRow,
  mapDisputeRow,
} from './utils';

// ==================== 内存管理导出 ====================
export {
  memoryMaxVoteKeys,
  memoryMaxAssertions,
  memoryMaxDisputes,
  memoryVoteBlockWindow,
  deleteVotesForAssertion,
  pruneMemoryAssertions,
  pruneMemoryDisputes,
  applyVoteSumsDelta,
} from './memory';

// ==================== 核心操作导出 ====================
export {
  // 读取操作
  readOracleState,
  getSyncState,
  fetchAssertion,
  fetchDispute,
  // 写入操作
  upsertAssertion,
  upsertDispute,
  upsertAssertionsBatch,
  upsertDisputesBatch,
  // 同步和指标
  updateSyncState,
  insertSyncMetric,
  listSyncMetrics,
  // 投票操作
  insertVoteEvent,
  recomputeDisputeVotes,
  // 事件记录
  insertOracleEvent,
  // 兼容旧接口
  writeOracleState,
} from './operations';

// ==================== 事件回放导出 ====================
export { replayOracleEventsRange } from './eventReplay';
