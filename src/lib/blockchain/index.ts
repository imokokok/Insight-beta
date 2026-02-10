/**
 * Blockchain Module - 区块链模块统一入口
 *
 * 提供统一的预言机客户端访问接口
 */

// ============================================================================
// 核心模块 (被 FluxOracleClient 使用)
// ============================================================================

export { BaseOracleClient } from './core';

export { OracleClientError, PriceFetchError, HealthCheckError } from './core/types';

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
export { createFluxClient } from './fluxOracle';
