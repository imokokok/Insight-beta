/**
 * Blockchain Module - 区块链模块统一入口
 *
 * 提供统一的预言机客户端访问接口
 */

// ============================================================================
// 核心模块
// ============================================================================

export {
  // 基类
  BaseOracleClient,
  // 工厂
  OracleClientFactory,
  oracleClientFactory,
} from './core';

// 错误类重新导出
export { OracleClientError, PriceFetchError, HealthCheckError } from './core/types';

export type {
  // 接口
  IOracleClient,
  // 配置类型
  OracleClientConfig,
  RequiredOracleClientConfig,
  // 状态类型
  OracleHealthStatus,
  HealthStatus,
  OracleClientCapabilities,
  // 选项类型
  PriceFetchOptions,
  BatchPriceResult,
  // 日志类型
  OracleClientLogger,
} from './core';

// ============================================================================
// 传统协议客户端（被同步服务使用）
// ============================================================================

// Chainlink
export { createChainlinkClient, getAvailableFeedsForChain } from './chainlinkDataFeeds';

// Pyth
export { createPythClient, getAvailablePythSymbols } from './pythOracle';

// Band
export { createBandClient } from './bandOracle';

// DIA
export { createDIAClient, getAvailableDIASymbols } from './diaOracle';

// API3
export { createAPI3Client, getAvailableAPI3Dapis } from './api3Oracle';

// RedStone
export { createRedStoneClient, getAvailableRedStoneSymbols } from './redstoneOracle';

// Flux
export { createFluxClient, getSupportedFluxSymbols } from './protocols/flux';

// UMA - No exports currently used
