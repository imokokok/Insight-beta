/**
 * Blockchain Module - 区块链模块统一入口
 *
 * 提供统一的预言机客户端访问接口
 */

// ============================================================================
// 核心模块
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
// 链配置
// ============================================================================

export {
  VIEM_CHAIN_MAP,
  DEFAULT_RPC_URLS,
  CHAIN_METADATA,
  getChainSymbol,
  getViemChain,
  getDefaultRpcUrl,
  getChainMetadata,
  isEvmChain,
  getExplorerTxUrl,
  getExplorerAddressUrl,
  type ChainMetadata,
} from './chainConfig';

// ============================================================================
// 预言机客户端
// ============================================================================

// Chainlink
export { ChainlinkClient, createChainlinkClient } from './chainlinkDataFeeds';

// Pyth
export { PythClient, createPythClient, getAvailablePythSymbols } from './pythOracle';

// RedStone
export {
  RedStoneClient,
  createRedStoneClient,
  getAvailableRedStoneSymbols,
} from './redstoneOracle';

// UMA
export {
  UMAClient,
  createUMAClient,
  isChainSupportedByUMA,
  getSupportedUMAChains,
  getUMAContractAddresses,
  UMA_CONTRACT_ADDRESSES,
  type UMAAssertion,
  type UMADispute,
  type DisputeStatus,
  type UMAHealthStatus,
  type UMAProtocolConfig,
} from './umaOracle';

export {
  UMATransactionClient,
  createUMATransactionClient,
  encodeAssertTruthCall,
  encodeDisputeAssertionCall,
  encodeSettleAssertionCall,
  calculateRequiredBond,
  type AssertTruthParams,
  type DisputeAssertionParams,
  type SettleAssertionParams,
  type UMATransactionResult,
} from './umaTransaction';

// ============================================================================
// 钱包连接
// ============================================================================

export {
  WalletConnectProvider,
  WALLET_CONNECT_PROJECT_ID,
  SUPPORTED_CHAINS,
  isMobile,
  isWalletBrowser,
  getRecommendedConnectionType,
  getWalletName,
  type WalletProvider,
  type WalletConnectionType,
} from './walletConnect';

// ============================================================================
// 安全模块
// ============================================================================

export {
  // 输入验证
  validateAddress,
  validateAddressArray,
  validateBytes32,
  validateSymbol,
  validateBondAmount,
  validateClaim,
  validateTimestamp,
  validateChainId,
  validateBatch,
  validateExtraData,
  validateUMAAssertionParams,
  VALIDATION_LIMITS,
  type ValidationResult,
  // Gas 优化
  QueryCache,
  SmartRetry,
  GasEstimator,
  BatchCallOptimizer,
  createQueryCache,
  createGasEstimator,
  createBatchCallOptimizer,
  createSmartRetry,
  GAS_CONSTANTS,
  type GasEstimate,
  type BatchCallItem,
  type BatchCallResult,
  // 速率限制
  SlidingWindowRateLimiter,
  TokenBucketRateLimiter,
  MultiTierRateLimiter,
  createRateLimiter,
  createTokenBucketLimiter,
  createMultiTierRateLimiter,
  RATE_LIMIT_DEFAULTS,
  type RateLimitConfig,
  type RateLimitResult,
  // 重入防护
  ReentrancyGuard,
  CrossContractReentrancyDetector,
  CallbackAttackProtector,
  createReentrancyGuard,
  createCrossContractDetector,
  createCallbackProtector,
  getGlobalReentrancyGuard,
  protectedOperation,
  REENTRANCY_DEFAULTS,
  type ReentrancyState,
  type ReentrancyConfig,
  // 交易验证
  TransactionValidator,
  UMATransactionValidator,
  TransactionMonitor,
  createTransactionValidator,
  createUMATransactionValidator,
  createTransactionMonitor,
  TX_VALIDATION_DEFAULTS,
  type TransactionParams,
  type TransactionValidationResult,
  type TransactionStatus,
} from './security';
