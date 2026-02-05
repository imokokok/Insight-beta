/**
 * Database Module - 统一导出
 *
 * 所有数据库相关功能的集中导出
 */

// ============================================================================
// 基础导出
// ============================================================================

export { query } from './connectionManager';

// ============================================================================
// 数据库初始化（新增）
// ============================================================================

export {
  dbInitializer,
  ensureDb,
  isDbInitialized,
  resetDbInitialization,
  withDbInitialization,
} from './DbInitializer';

// ============================================================================
// QueryBuilder（新增）
// ============================================================================

export {
  QueryBuilder,
  BaseRepository,
  createQueryBuilder,
  buildSelectQuery,
  buildCountQuery,
  type QueryCondition,
  type QueryOptions,
  type BuiltQuery,
  type PaginatedQueryResult,
} from './QueryBuilder';

// ============================================================================
// 类型导出
// ============================================================================

export type { QueryResult } from 'pg';
