/**
 * Solana Connection Manager
 *
 * Solana RPC 连接管理 (Mock Implementation)
 */

import { SOLANA_RPC_ENDPOINTS, SOLANA_CONNECTION_CONFIG, SOLANA_RETRY_CONFIG } from './config';
import type { Connection, AccountInfo, SolanaPubkey } from './types';
import { SolanaError, SolanaErrorCode } from './types';

// ============================================================================
// Mock Connection Implementation
// ============================================================================

class MockConnection implements Connection {
  constructor(_endpoint: string) {
    // Endpoint stored for future use
  }

  async getAccountInfo(_pubkey: SolanaPubkey): Promise<AccountInfo<Buffer> | null> {
    // Mock implementation - return null for now
    return null;
  }

  async getMultipleAccountsInfo(_pubkeys: SolanaPubkey[]): Promise<(AccountInfo<Buffer> | null)[]> {
    // Mock implementation - return array of nulls
    return _pubkeys.map(() => null);
  }

  async getSlot(): Promise<number> {
    // Mock implementation - return current timestamp as slot
    return Math.floor(Date.now() / 1000);
  }

  async getLatestBlockhash(
    _commitment?: string,
  ): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
    // Mock implementation
    return {
      blockhash: 'mock-blockhash-' + Date.now(),
      lastValidBlockHeight: Math.floor(Date.now() / 1000) + 100,
    };
  }

  async getBlockTime(slot: number): Promise<number | null> {
    // Mock implementation - return slot as timestamp
    return slot;
  }
}

// ============================================================================
// Connection Manager
// ============================================================================

class SolanaConnectionManager {
  private connections: Map<string, Connection> = new Map();
  private currentEndpointIndex: Map<string, number> = new Map();

  /**
   * Get or create connection
   */
  getConnection(chain: 'solana' | 'solanaDevnet' = 'solana', customRpcUrl?: string): Connection {
    const cacheKey = `${chain}:${customRpcUrl || 'default'}`;

    if (this.connections.has(cacheKey)) {
      return this.connections.get(cacheKey)!;
    }

    const endpoints = customRpcUrl
      ? [customRpcUrl]
      : chain === 'solanaDevnet'
        ? SOLANA_RPC_ENDPOINTS.devnet
        : SOLANA_RPC_ENDPOINTS.mainnet;

    const endpoint = endpoints[0] ?? 'https://api.mainnet-beta.solana.com';
    const connection = new MockConnection(endpoint);
    this.connections.set(cacheKey, connection);
    this.currentEndpointIndex.set(cacheKey, 0);

    return connection;
  }

  /**
   * Rotate to next endpoint on failure
   */
  rotateEndpoint(chain: 'solana' | 'solanaDevnet', customRpcUrl?: string): Connection {
    const cacheKey = `${chain}:${customRpcUrl || 'default'}`;
    const endpoints = customRpcUrl
      ? [customRpcUrl]
      : chain === 'solanaDevnet'
        ? SOLANA_RPC_ENDPOINTS.devnet
        : SOLANA_RPC_ENDPOINTS.mainnet;

    if (endpoints.length <= 1) {
      throw new SolanaError('No alternative endpoints available', SolanaErrorCode.CONNECTION_ERROR);
    }

    const currentIndex = this.currentEndpointIndex.get(cacheKey) || 0;
    const nextIndex = (currentIndex + 1) % endpoints.length;

    this.currentEndpointIndex.set(cacheKey, nextIndex);

    // Create new connection with next endpoint
    const nextEndpoint = endpoints[nextIndex] ?? 'https://api.mainnet-beta.solana.com';
    const connection = new MockConnection(nextEndpoint);
    this.connections.set(cacheKey, connection);

    console.log(`[Solana] Rotated to endpoint: ${endpoints[nextIndex]}`);

    return connection;
  }

  /**
   * Get multiple connections for load balancing
   */
  getAllConnections(chain: 'solana' | 'solanaDevnet' = 'solana'): Connection[] {
    const endpoints =
      chain === 'solanaDevnet' ? SOLANA_RPC_ENDPOINTS.devnet : SOLANA_RPC_ENDPOINTS.mainnet;

    return endpoints.map((endpoint) => new MockConnection(endpoint));
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    this.connections.clear();
    this.currentEndpointIndex.clear();
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const solanaConnectionManager = new SolanaConnectionManager();

// ============================================================================
// Retry Wrapper
// ============================================================================

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    retryDelayMs?: number;
    backoffMultiplier?: number;
    onRetry?: (error: Error, attempt: number) => void;
  } = {},
): Promise<T> {
  const {
    maxRetries = SOLANA_RETRY_CONFIG.maxRetries,
    retryDelayMs = SOLANA_RETRY_CONFIG.retryDelayMs,
    backoffMultiplier = SOLANA_RETRY_CONFIG.backoffMultiplier,
    onRetry,
  } = options;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxRetries) {
        const delay = retryDelayMs * Math.pow(backoffMultiplier, attempt);

        if (onRetry) {
          onRetry(lastError, attempt + 1);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw new SolanaError(
    `Operation failed after ${maxRetries + 1} attempts: ${lastError?.message}`,
    SolanaErrorCode.RPC_ERROR,
    lastError,
  );
}

// ============================================================================
// Account Fetching Utilities
// ============================================================================

export async function fetchAccountInfo(
  connection: Connection,
  address: string,
): Promise<AccountInfo<Buffer> | null> {
  try {
    return await withRetry(() => connection.getAccountInfo(address));
  } catch (error) {
    if (error instanceof SolanaError) {
      throw error;
    }
    throw new SolanaError(
      `Failed to fetch account info for ${address}`,
      SolanaErrorCode.ACCOUNT_NOT_FOUND,
      error,
    );
  }
}

export async function fetchMultipleAccounts(
  connection: Connection,
  addresses: string[],
): Promise<(AccountInfo<Buffer> | null)[]> {
  try {
    return await withRetry(() => connection.getMultipleAccountsInfo(addresses));
  } catch (error) {
    if (error instanceof SolanaError) {
      throw error;
    }
    throw new SolanaError('Failed to fetch multiple accounts', SolanaErrorCode.RPC_ERROR, error);
  }
}

// ============================================================================
// Slot and Block Utilities
// ============================================================================

export async function getLatestSlot(connection: Connection): Promise<number> {
  return withRetry(() => connection.getSlot());
}

export async function getLatestBlockhash(connection: Connection): Promise<string> {
  const result = await withRetry(() =>
    connection.getLatestBlockhash(SOLANA_CONNECTION_CONFIG.commitment),
  );
  return result.blockhash;
}

export async function getBlockTime(connection: Connection, slot: number): Promise<number | null> {
  return withRetry(() => connection.getBlockTime(slot));
}
