/**
 * Solana Configuration
 *
 * Solana 区块链配置
 */

// ============================================================================
// RPC Endpoints
// ============================================================================

export const SOLANA_RPC_ENDPOINTS = {
  mainnet: [
    process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana',
  ],
  devnet: ['https://api.devnet.solana.com'],
};

// ============================================================================
// Commitment Levels
// ============================================================================

export const SOLANA_COMMITMENT = {
  processed: 'processed',
  confirmed: 'confirmed',
  finalized: 'finalized',
} as const;

export type SolanaCommitment = (typeof SOLANA_COMMITMENT)[keyof typeof SOLANA_COMMITMENT];

// ============================================================================
// Program IDs
// ============================================================================

export const SOLANA_PROGRAM_IDS = {
  // Switchboard
  SWITCHBOARD_AGGREGATOR: 'SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f',
  SWITCHBOARD_QUEUE: 'SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f',

  // Pyth
  PYTH_MAINNET: 'FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH',
  PYTH_DEVNET: 'gSbePebfvPy7tRqimHcVecSvn4Gy3nhiXJm6b9i4J8j',

  // System
  SYSTEM_PROGRAM: '11111111111111111111111111111111',
  TOKEN_PROGRAM: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  ASSOCIATED_TOKEN_PROGRAM: 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
};

// ============================================================================
// Price Feed Mappings
// ============================================================================

export const SOLANA_PRICE_FEEDS: Record<
  string,
  {
    switchboard?: string;
    pyth?: string;
    decimals: number;
  }
> = {
  'SOL/USD': {
    switchboard: 'GvDMxPzN1sCj7L26YDK2HnMRXEQmQ2aemov8YBtPS7vR',
    pyth: 'H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG',
    decimals: 8,
  },
  'BTC/USD': {
    switchboard: '8SXvChNYFhRq4EZuZvnhjrB3jJRQCuv4BJ3kvAHa93rE',
    pyth: 'GVXRSBjFk6e6J3NbVPXohDJetcTjaeeuykUpbQF8UoMU',
    decimals: 8,
  },
  'ETH/USD': {
    switchboard: 'QJc2HgGhdtW4e7zjvLBmvD4cNDeJ4k2bC7t1Jg1ZY4',
    pyth: 'JBu1AL4obBcCMqKBBxhpWCNUt136ijcuMZLFvTP7iWdB',
    decimals: 8,
  },
  'USDC/USD': {
    switchboard: 'CZx29wKMUxaJDqMx2GQsJ7nSq9jJzZvRT93QK3S4K6y',
    pyth: 'Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7hJ2L',
    decimals: 8,
  },
  'USDT/USD': {
    switchboard: '5mp8kbkTYwWWCsKSte8rURjTuyinsqBpJ9xAQsewPDG',
    pyth: '3vxLXJqLqF8JGx31TcU3D84ZBLxB8KrfLaFz3K27eA7t',
    decimals: 8,
  },
  'LINK/USD': {
    switchboard: '9cPyqQfJ4ue1Z8U9Jq1s5K8jYvQjZ7Kq3hQjZ7Kq3hQ',
    pyth: 'CqFJLrT4rSpA46RQkVYWn8sfBNK3Kv2rX6wpf3RrX6wp',
    decimals: 8,
  },
  'AVAX/USD': {
    switchboard: '7Dp9DJD7QX6Pd3YY1QK8fQ8z1QK8fQ8z1QK8fQ8z1QK8',
    pyth: 'FVb5h1VmHPfVb1HPfVb1HPfVb1HPfVb1HPfVb1HPfVb1',
    decimals: 8,
  },
  'ARB/USD': {
    switchboard: '8SXvChNYFhRq4EZuZvnhjrB3jJRQCuv4BJ3kvAHa93rE',
    pyth: '5rdp9YpSK6zKDWy7jXz1Q7z1Q7z1Q7z1Q7z1Q7z1Q7z1',
    decimals: 8,
  },
};

// ============================================================================
// Connection Config
// ============================================================================

export const SOLANA_CONNECTION_CONFIG = {
  commitment: 'confirmed' as SolanaCommitment,
  confirmTransactionInitialTimeout: 60000,
  disableRetryOnRateLimit: false,
  httpHeaders: {
    'Content-Type': 'application/json',
  },
};

// ============================================================================
// Retry Config
// ============================================================================

export const SOLANA_RETRY_CONFIG = {
  maxRetries: 3,
  retryDelayMs: 1000,
  backoffMultiplier: 2,
};

// ============================================================================
// Cache Config
// ============================================================================

export const SOLANA_CACHE_CONFIG = {
  accountTTL: 30, // seconds
  priceTTL: 10, // seconds
  blockhashTTL: 60, // seconds
};
