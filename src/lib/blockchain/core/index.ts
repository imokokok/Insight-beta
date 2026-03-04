/**
 * Core Oracle Client Module - 核心预言机客户端模块
 *
 * 统一的区块链预言机客户端核心功能
 */

// 类型导出
export type {
  IOracleClient,
  OracleClientConfig,
  RequiredOracleClientConfig,
  OracleHealthStatus,
  OracleClientCapabilities,
  PriceFetchOptions,
  BatchPriceResult,
  OracleClientLogger,
} from './types';

// 从 types/common/status 重新导出 HealthStatus
export type { HealthStatus } from '@/types/common/status';

// 类导出
export { BaseOracleClient } from './BaseOracleClient';

// 错误类导出
export { OracleClientError, PriceFetchError, HealthCheckError } from './types';

// 工具函数导出
export { normalizeSymbol, calculateDataFreshness, isPriceStale } from './types';
