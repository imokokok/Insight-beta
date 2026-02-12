/**
 * Shared Modules - 共享模块统一导出
 *
 * 提供项目级别的代码复用：
 * - 数据库工具
 * - 区块链抽象
 * - 同步管理
 * - 错误处理（已迁移到 lib/errors）
 * - 日志工具
 */

// 数据库工具
export { BatchInserter, createBatchInserter } from './database/BatchInserter';
export type { BatchInserterConfig } from './database/BatchInserter';

// 区块链抽象
export { EvmOracleClient } from './blockchain/EvmOracleClient';
export type { EvmOracleClientConfig } from './blockchain/EvmOracleClient';
export { SolanaOracleClient } from './blockchain/SolanaOracleClient';
export type { SolanaOracleClientConfig } from './blockchain/SolanaOracleClient';

// 同步管理
export {
  SyncManagerFactory,
  createSyncManager,
  createSingletonSyncManager,
} from './sync/SyncManagerFactory';
export type {
  SyncManagerFactoryConfig,
  ClientFactory,
  SymbolProvider,
  SyncManagerExports,
} from './sync/SyncManagerFactory';

// 错误处理 - 从 lib/errors 导入
export {
  ErrorHandler,
  normalizeError,
  getErrorMessage,
  withRetry,
  normalizeWalletError,
} from '@/lib/errors';
export type { WalletErrorDetail, NormalizedWalletErrorKind } from '@/lib/errors';

// 日志工具
export { LoggerFactory, createLogger, createOracleLogger } from './logger/LoggerFactory';
export type { Logger, PrefixedLogger } from './logger/LoggerFactory';
