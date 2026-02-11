/**
 * Database Module - 统一导出
 *
 * 所有数据库相关功能的集中导出
 */

export {
  dbInitializer,
  ensureDb,
  isDbInitialized,
  resetDbInitialization,
  withDbInitialization,
} from './DbInitializer';

export type { QueryResult } from 'pg';
export { query, getClient, hasDatabase, getDatabaseUrl } from '../db';
