/**
 * Solana Types
 *
 * Solana 区块链类型定义
 */

// ============================================================================
// Base Types
// ============================================================================

export type SolanaAddress = string;
export type SolanaSignature = string;
export type SolanaPubkey = string;

// ============================================================================
// Connection Types (Mock for now to avoid dependency issues)
// ============================================================================

export interface Connection {
  getAccountInfo(pubkey: SolanaPubkey): Promise<AccountInfo<Buffer> | null>;
  getMultipleAccountsInfo(pubkeys: SolanaPubkey[]): Promise<(AccountInfo<Buffer> | null)[]>;
  getSlot(): Promise<number>;
  getLatestBlockhash(
    commitment?: string,
  ): Promise<{ blockhash: string; lastValidBlockHeight: number }>;
  getBlockTime(slot: number): Promise<number | null>;
}

export interface AccountInfo<T> {
  data: T;
  executable: boolean;
  lamports: number;
  owner: SolanaAddress;
  rentEpoch: number;
}

export interface PublicKey {
  toBase58(): string;
  toBuffer(): Buffer;
  equals(other: PublicKey): boolean;
}

// ============================================================================
// Price Feed Types
// ============================================================================

export interface SolanaPriceFeed {
  symbol: string;
  price: number;
  confidence: number;
  timestamp: number;
  slot: number;
  source: 'switchboard' | 'pyth' | 'aggregate';
  decimals: number;
}

export interface SwitchboardAggregator {
  address: SolanaAddress;
  name: string;
  latestRoundResult?: {
    result: number;
    roundOpenSlot: number;
    roundOpenTimestamp: number;
    minResponse: number;
    maxResponse: number;
    stdDeviation: number;
  };
  authority: SolanaAddress;
  queueAddress: SolanaAddress;
}

export interface PythPriceData {
  address: SolanaAddress;
  symbol: string;
  priceType: 'price' | 'ema';
  price: number;
  confidence: number;
  exponent: number;
  timestamp: number;
  status: 'trading' | 'halted' | 'auction' | 'ignored';
  corpAct: 'noCorpAct' | 'corpAct';
}

// ============================================================================
// Transaction Types
// ============================================================================

export interface SolanaTransaction {
  signature: SolanaSignature;
  slot: number;
  timestamp: number;
  fee: number;
  status: 'success' | 'failed';
  err?: unknown;
  logs?: string[];
  preBalance: number;
  postBalance: number;
}

// ============================================================================
// Oracle Types
// ============================================================================

export interface SolanaOracleConfig {
  chain: 'solana' | 'solanaDevnet';
  rpcUrl: string;
  commitment: 'processed' | 'confirmed' | 'finalized';
  wsEndpoint?: string;
}

export interface SolanaOracleInstance {
  id: string;
  protocol: 'switchboard' | 'pyth';
  chain: 'solana' | 'solanaDevnet';
  address: SolanaAddress;
  config: {
    feedAddress: SolanaAddress;
    symbol: string;
    decimals: number;
    updateInterval: number;
  };
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Sync Types
// ============================================================================

export interface SolanaSyncState {
  instanceId: string;
  chain: 'solana' | 'solanaDevnet';
  status: 'active' | 'stopped' | 'error';
  lastSyncAt?: Date;
  lastProcessedSlot?: number;
  lagSlots?: number;
  errorCount: number;
  lastError?: string;
  updatedAt: Date;
}

export interface SolanaPriceUpdate {
  id: string;
  instanceId: string;
  protocol: 'switchboard' | 'pyth';
  chain: 'solana' | 'solanaDevnet';
  symbol: string;
  price: number;
  confidence: number;
  timestamp: Date;
  slot: number;
  isStale: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Error Types
// ============================================================================

export class SolanaError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: unknown,
  ) {
    super(message);
    this.name = 'SolanaError';
  }
}

export enum SolanaErrorCode {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  INVALID_ADDRESS = 'INVALID_ADDRESS',
  RPC_ERROR = 'RPC_ERROR',
  TIMEOUT = 'TIMEOUT',
  RATE_LIMIT = 'RATE_LIMIT',
  PARSE_ERROR = 'PARSE_ERROR',
}
