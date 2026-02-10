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
  HealthStatus,
  OracleClientCapabilities,
  PriceFetchOptions,
  BatchPriceResult,
  OracleClientLogger,
} from './types';

// 类导出
export { BaseOracleClient } from './BaseOracleClient';

// 错误类导出
export { OracleClientError, PriceFetchError, HealthCheckError } from './types';
