/**
 * Application Constants
 *
 * 应用常量配置
 */

// ============================================================================
// Chain Constants
// ============================================================================

export const SUPPORTED_CHAINS = [
  'ethereum',
  'polygon',
  'polygonAmoy',
  'arbitrum',
  'optimism',
  'base',
  'avalanche',
  'bsc',
  'solana',
  'solanaDevnet',
  'local',
] as const;

export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

export const CHAIN_ID_MAP: Record<SupportedChain, number> = {
  ethereum: 1,
  polygon: 137,
  polygonAmoy: 80002,
  arbitrum: 42161,
  optimism: 10,
  base: 8453,
  avalanche: 43114,
  bsc: 56,
  solana: 101,
  solanaDevnet: 103,
  local: 31337,
};

export const CHAIN_NAME_MAP: Record<number, SupportedChain> = {
  1: 'ethereum',
  137: 'polygon',
  80002: 'polygonAmoy',
  42161: 'arbitrum',
  10: 'optimism',
  8453: 'base',
  43114: 'avalanche',
  56: 'bsc',
  101: 'solana',
  103: 'solanaDevnet',
  31337: 'local',
};

// ============================================================================
// Oracle Protocol Constants
// ============================================================================

export const ORACLE_PROTOCOLS = [
  'chainlink',
  'pyth',
  'uma',
  'api3',
  'band',
  'flux',
  'dia',
] as const;

export type OracleProtocol = (typeof ORACLE_PROTOCOLS)[number];

// ============================================================================
// Price Feed Constants
// ============================================================================

export const DEFAULT_SYMBOLS = [
  'ETH/USD',
  'BTC/USD',
  'LINK/USD',
  'MATIC/USD',
  'AVAX/USD',
  'BNB/USD',
  'SOL/USD',
  'ARB/USD',
  'OP/USD',
  'BASE/USD',
] as const;

export const SYMBOL_METADATA: Record<
  string,
  {
    baseAsset: string;
    quoteAsset: string;
    decimals: number;
    category: 'crypto' | 'forex' | 'commodity';
  }
> = {
  'ETH/USD': { baseAsset: 'ETH', quoteAsset: 'USD', decimals: 8, category: 'crypto' },
  'BTC/USD': { baseAsset: 'BTC', quoteAsset: 'USD', decimals: 8, category: 'crypto' },
  'LINK/USD': { baseAsset: 'LINK', quoteAsset: 'USD', decimals: 8, category: 'crypto' },
  'MATIC/USD': { baseAsset: 'MATIC', quoteAsset: 'USD', decimals: 8, category: 'crypto' },
  'AVAX/USD': { baseAsset: 'AVAX', quoteAsset: 'USD', decimals: 8, category: 'crypto' },
  'BNB/USD': { baseAsset: 'BNB', quoteAsset: 'USD', decimals: 8, category: 'crypto' },
  'SOL/USD': { baseAsset: 'SOL', quoteAsset: 'USD', decimals: 8, category: 'crypto' },
  'ARB/USD': { baseAsset: 'ARB', quoteAsset: 'USD', decimals: 8, category: 'crypto' },
  'OP/USD': { baseAsset: 'OP', quoteAsset: 'USD', decimals: 8, category: 'crypto' },
  'BASE/USD': { baseAsset: 'BASE', quoteAsset: 'USD', decimals: 8, category: 'crypto' },
};

// ============================================================================
// Sync Constants
// ============================================================================

export const SYNC_DEFAULTS = {
  intervalMs: 60000,
  maxRetries: 3,
  retryDelayMs: 5000,
  batchSize: 20,
  confirmationBlocks: 10,
  maxBlockRange: 2000n,
  minWindowSize: 100n,
  maxWindowSize: 10000n,
} as const;

// ============================================================================
// API Constants
// ============================================================================

export const API_TIMEOUTS = {
  default: 10000,
  long: 30000,
  upload: 60000,
} as const;

export const RATE_LIMITS = {
  default: 100,
  authenticated: 1000,
  admin: 10000,
} as const;

// ============================================================================
// Alert Constants
// ============================================================================

export const ALERT_SEVERITIES = ['critical', 'warning', 'info'] as const;
export type AlertSeverity = (typeof ALERT_SEVERITIES)[number];

export const ALERT_CHANNELS = [
  'email',
  'sms',
  'webhook',
  'slack',
  'discord',
  'telegram',
  'pagerduty',
] as const;
export type AlertChannel = (typeof ALERT_CHANNELS)[number];

// ============================================================================
// Cache Constants
// ============================================================================

export const CACHE_TTLS = {
  price: 60,
  config: 300,
  stats: 600,
  leaderboard: 300,
  user: 1800,
} as const;

// Legacy exports for backward compatibility
export const CACHE_CONFIG = {
  DEFAULT_TTL: 300,
  MAX_SIZE: 1000,
  DEFAULT_REFRESH_INTERVAL: 30000,
  DEFAULT_DEDUPING_INTERVAL: 2000,
  DEFAULT_LRU_CACHE_SIZE: 500,
  DEFAULT_CACHE_TTL: 300,
} as const;

// ============================================================================
// Database Config
// ============================================================================

export const DATABASE_CONFIG = {
  DEFAULT_POOL_SIZE: 10,
  DEFAULT_QUERY_TIMEOUT: 30000,
  DEFAULT_IDLE_TIMEOUT: 300000,
  DEFAULT_CONNECTION_TIMEOUT: 10000,
  DEFAULT_MAX_USES: 7500,
} as const;

// ============================================================================
// Price Config
// ============================================================================

export const DEFAULT_FALLBACK_PRICES: Record<string, number> = {
  'ETH/USD': 2000,
  'BTC/USD': 40000,
  'LINK/USD': 15,
  'MATIC/USD': 1,
  'AVAX/USD': 30,
  'BNB/USD': 300,
  'SOL/USD': 100,
  'ARB/USD': 1.5,
  'OP/USD': 2,
  'BASE/USD': 1,
} as const;

// ============================================================================
// Staleness Thresholds (seconds)
// ============================================================================

export const DEFAULT_STALENESS_THRESHOLDS = {
  PYTH: 60,
  CHAINLINK: 3600,
  BAND: 300,
  API3: 300,
  REDSTONE: 60,
  SWITCHBOARD: 300,
  FLUX: 300,
  DIA: 300,
  UMA: 600,
} as const;

// ============================================================================
// Rate Limit Config
// ============================================================================

export const RATE_LIMIT_CONFIG = {
  DEFAULT_REQUESTS_PER_MINUTE: 100,
  DEFAULT_WINDOW_MS: 60000,
  DEFAULT_MEMORY_LIMIT: 10000,
} as const;
