/**
 * Solana Connection Manager
 *
 * Solana RPC 连接管理
 */

import { SOLANA_RPC_ENDPOINTS, SOLANA_CONNECTION_CONFIG, SOLANA_RETRY_CONFIG } from './config';
import type { Connection, AccountInfo } from './types';
import { SolanaError, SolanaErrorCode } from './types';
import type { SolanaRpcClient } from './rpc';
import { createSolanaRpcClient } from './rpc';

// ============================================================================
// Connection Adapter
// ============================================================================

class RpcConnectionAdapter implements Connection {
  constructor(private rpcClient: SolanaRpcClient) {}

  async getAccountInfo(pubkey: string): Promise<AccountInfo<Buffer> | null> {
    const accountInfo = await this.rpcClient.getAccountInfo(pubkey);
    if (!accountInfo) return null;

    // Convert base64 data to Buffer
    let data: Buffer;
    if (Array.isArray(accountInfo.data)) {
      data = Buffer.from(accountInfo.data[0], 'base64');
    } else {
      data = Buffer.from(accountInfo.data, 'base64');
    }

    return {
      data,
      executable: accountInfo.executable,
      lamports: accountInfo.lamports,
      owner: accountInfo.owner,
      rentEpoch: accountInfo.rentEpoch,
    };
  }

  async getMultipleAccountsInfo(pubkeys: string[]): Promise<(AccountInfo<Buffer> | null)[]> {
    const accounts = await this.rpcClient.getMultipleAccounts(pubkeys);
    return accounts.map((accountInfo) => {
      if (!accountInfo) return null;

      let data: Buffer;
      if (Array.isArray(accountInfo.data)) {
        data = Buffer.from(accountInfo.data[0], 'base64');
      } else {
        data = Buffer.from(accountInfo.data, 'base64');
      }

      return {
        data,
        executable: accountInfo.executable,
        lamports: accountInfo.lamports,
        owner: accountInfo.owner,
        rentEpoch: accountInfo.rentEpoch,
      };
    });
  }

  async getSlot(): Promise<number> {
    return this.rpcClient.getSlot(SOLANA_CONNECTION_CONFIG.commitment);
  }

  async getLatestBlockhash(
    commitment?: string,
  ): Promise<{ blockhash: string; lastValidBlockHeight: number }> {
    return this.rpcClient.getLatestBlockhash(commitment);
  }

  async getBlockTime(slot: number): Promise<number | null> {
    return this.rpcClient.getBlockTime(slot);
  }
}

// ============================================================================
// Connection Manager
// ============================================================================

class SolanaConnectionManager {
  private connections: Map<string, RpcConnectionAdapter> = new Map();
  private rpcClients: Map<string, SolanaRpcClient> = new Map();
  private currentEndpointIndex: Map<string, number> = new Map();

  /**
   * Get or create connection
   */
  getConnection(
    chain: 'solana' | 'solanaDevnet' = 'solana',
    customRpcUrl?: string,
  ): RpcConnectionAdapter {
    const cacheKey = `${chain}:${customRpcUrl || 'default'}`;

    if (this.connections.has(cacheKey)) {
      return this.connections.get(cacheKey)!;
    }

    const rpcClient = createSolanaRpcClient(chain, customRpcUrl);
    const connection = new RpcConnectionAdapter(rpcClient);

    this.connections.set(cacheKey, connection);
    this.rpcClients.set(cacheKey, rpcClient);
    this.currentEndpointIndex.set(cacheKey, 0);

    return connection;
  }

  /**
   * Get RPC client
   */
  getRpcClient(
    chain: 'solana' | 'solanaDevnet' = 'solana',
    customRpcUrl?: string,
  ): SolanaRpcClient {
    const cacheKey = `${chain}:${customRpcUrl || 'default'}`;

    if (this.rpcClients.has(cacheKey)) {
      return this.rpcClients.get(cacheKey)!;
    }

    const rpcClient = createSolanaRpcClient(chain, customRpcUrl);
    this.rpcClients.set(cacheKey, rpcClient);

    return rpcClient;
  }

  /**
   * Rotate to next endpoint on failure
   */
  rotateEndpoint(chain: 'solana' | 'solanaDevnet', customRpcUrl?: string): RpcConnectionAdapter {
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
    const rpcClient = createSolanaRpcClient(chain, nextEndpoint);
    const connection = new RpcConnectionAdapter(rpcClient);

    this.connections.set(cacheKey, connection);
    this.rpcClients.set(cacheKey, rpcClient);

    console.log(`[Solana] Rotated to endpoint: ${nextEndpoint}`);

    return connection;
  }

  /**
   * Get multiple connections for load balancing
   */
  getAllConnections(chain: 'solana' | 'solanaDevnet' = 'solana'): RpcConnectionAdapter[] {
    const endpoints =
      chain === 'solanaDevnet' ? SOLANA_RPC_ENDPOINTS.devnet : SOLANA_RPC_ENDPOINTS.mainnet;

    return endpoints.map((endpoint) => {
      const rpcClient = createSolanaRpcClient(chain, endpoint);
      return new RpcConnectionAdapter(rpcClient);
    });
  }

  /**
   * Close all connections
   */
  closeAll(): void {
    this.connections.clear();
    this.rpcClients.clear();
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
