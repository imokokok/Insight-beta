/**
 * Solana Blockchain Module
 *
 * Solana 区块链模块统一导出
 */

// Types
export type {
  SolanaAddress,
  SolanaSignature,
  SolanaPubkey,
  SolanaPriceFeed,
  SolanaOracleInstance,
  SolanaOracleConfig,
  SolanaSyncState,
  SolanaPriceUpdate,
  SolanaTransaction,
  SwitchboardAggregator,
  PythPriceData,
} from './types';

export { SolanaError, SolanaErrorCode } from './types';

// Sync Service
export { SolanaSyncService, solanaSyncService } from './sync';

// Pyth Client
export {
  PythSolanaClient,
  createPythClient,
  getPythClient,
  clearPythClientCache,
} from './pyth-client';

// Chainlink Client
export {
  ChainlinkSolanaClient,
  createChainlinkClient,
  getChainlinkClient,
  clearChainlinkClientCache,
  CHAINLINK_SOLANA_FEEDS,
  getChainlinkFeedAddress,
} from './chainlink-client';
