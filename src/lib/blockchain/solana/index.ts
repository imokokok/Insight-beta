/**
 * Solana Blockchain Module
 *
 * Solana 区块链模块导出
 */

// Types
export * from './types';

// Config
export {
  SOLANA_RPC_ENDPOINTS,
  SOLANA_COMMITMENT,
  SOLANA_PROGRAM_IDS,
  SOLANA_PRICE_FEEDS,
  SOLANA_CONNECTION_CONFIG,
  SOLANA_RETRY_CONFIG,
  SOLANA_CACHE_CONFIG,
} from './config';

// Connection
export {
  solanaConnectionManager,
  withRetry,
  fetchAccountInfo,
  fetchMultipleAccounts,
  getLatestSlot,
  getLatestBlockhash,
  getBlockTime,
} from './connection';

// Clients
export { SwitchboardSolanaClient, createSwitchboardClient } from './switchboard';
export { PythSolanaClient, createPythClient } from './pyth';

// Sync
export { SolanaSyncService, solanaSyncService } from './sync';
