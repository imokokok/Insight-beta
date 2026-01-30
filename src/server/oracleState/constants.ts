/**
 * Oracle State 模块常量定义
 *
 * 集中管理所有魔法数字和配置参数，便于维护和调整
 */

/** 默认内存存储限制 */
export const DEFAULT_MEMORY_MAX_VOTE_KEYS = 200_000;
export const DEFAULT_MEMORY_VOTE_BLOCK_WINDOW = 50_000n;
export const DEFAULT_MEMORY_MAX_ASSERTIONS = 10_000;
export const DEFAULT_MEMORY_MAX_DISPUTES = 10_000;

/** 数据库批量操作配置 */
export const BATCH_SIZE = 100;

/** 同步指标保留限制 */
export const MAX_SYNC_METRICS = 2000;

/** 状态版本号 */
export const STATE_VERSION = 2;

// DEFAULT_ORACLE_INSTANCE_ID 从 oracleConfig.ts 导入以保持统一
// 避免重复定义导致导出冲突
