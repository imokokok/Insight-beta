/**
 * Shared Modules - 共享模块统一导出
 *
 * 提供项目级别的代码复用：
 * - 数据库工具
 * - 区块链抽象
 * - 同步管理
 * - 错误处理
 * - 日志工具
 * - 服务网格
 */

// 数据库工具
export { BatchInserter, createBatchInserter } from './database/BatchInserter';
export type { BatchInserterConfig } from './database/BatchInserter';

// 区块链抽象
export { EvmOracleClient } from './blockchain/EvmOracleClient';
export type { EvmOracleClientConfig } from './blockchain/EvmOracleClient';
export { SolanaOracleClient } from './blockchain/SolanaOracleClient';
export type { SolanaOracleClientConfig } from './blockchain/SolanaOracleClient';
export { ContractRegistry, createContractRegistry } from './blockchain/ContractRegistry';

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

// 错误处理
export {
  ErrorHandler,
  normalizeError,
  getErrorMessage,
  withRetry,
  withErrorHandling,
} from './errors/ErrorHandler';

// 日志工具
export { LoggerFactory, createLogger, createOracleLogger } from './logger/LoggerFactory';
export type { Logger, PrefixedLogger } from './logger/LoggerFactory';

// 服务网格
export {
  ServiceRegistry,
  serviceRegistry,
  registerService,
  unregisterService,
  discoverServices,
  getServiceInstance,
  serviceHeartbeat,
  getServiceStats,
} from './mesh/ServiceRegistry';
export type {
  ServiceInstance,
  ServiceMetadata,
  ServiceQuery,
  HealthStatus,
  LoadBalanceStrategy,
  LoadBalancerConfig,
} from './mesh/ServiceRegistry';
