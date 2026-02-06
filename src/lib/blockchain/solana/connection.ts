/**
 * Solana Connection Manager
 *
 * Solana RPC 连接管理
 */

import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';

// ============================================================================
// Simple Account Info Interface
// ============================================================================

export interface SimpleAccountInfo {
  data: Buffer;
  executable: boolean;
  lamports: number;
  owner: string;
  rentEpoch: number;
}

// ============================================================================
// Types
// ============================================================================

type RpcResponse<T> = {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
};

type AccountInfoValue = {
  data: string[];
  executable: boolean;
  lamports: number;
  owner: string;
  rentEpoch: number;
};

type AccountInfoResponse = {
  value: AccountInfoValue | null;
};

// ============================================================================
// Connection Manager
// ============================================================================

class SolanaConnectionManager {
  private rpcUrl: string;
  private requestId: number = 0;
  private defaultTimeoutMs: number = 30000; // 默认30秒超时

  constructor() {
    this.rpcUrl = env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  }

  /**
   * 设置请求超时
   */
  setTimeout(timeoutMs: number): void {
    this.defaultTimeoutMs = timeoutMs;
  }

  async initialize(): Promise<void> {
    logger.info('Solana connection manager initialized', { rpcUrl: this.getRedactedRpcUrl() });
  }

  private getRedactedRpcUrl(): string {
    try {
      const url = new URL(this.rpcUrl);
      if (url.password) {
        url.password = '***';
      }
      return url.toString();
    } catch {
      return this.rpcUrl.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    }
  }

  private async makeRpcCall<T>(
    method: string,
    params: unknown[],
    timeoutMs?: number,
  ): Promise<T | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs || this.defaultTimeoutMs);

    try {
      this.requestId++;
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: this.requestId,
          method,
          params,
        }),
        signal: controller.signal,
      });

      // 清除超时
      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.error('Solana RPC error', { status: response.status, method });
        // 确保响应体被消耗，避免连接泄漏
        try {
          await response.text();
        } catch {
          // 忽略读取错误
        }
        return null;
      }

      const data: RpcResponse<T> = await response.json();

      if (data.error) {
        logger.error('Solana RPC error', { error: data.error, method });
        return null;
      }

      return data.result ?? null;
    } catch (error) {
      clearTimeout(timeoutId);

      // 检查是否是超时错误
      if (error instanceof Error && error.name === 'AbortError') {
        logger.error('Solana RPC call timed out', {
          method,
          timeoutMs: timeoutMs || this.defaultTimeoutMs,
        });
        return null;
      }

      logger.error('Solana RPC call failed', {
        error: error instanceof Error ? error.message : String(error),
        method,
      });
      return null;
    }
  }

  async getAccountInfo(address: string): Promise<SimpleAccountInfo | null> {
    const result = await this.makeRpcCall<AccountInfoResponse>('getAccountInfo', [
      address,
      { encoding: 'base64' },
    ]);

    if (!result?.value) {
      return null;
    }

    const value = result.value;
    if (!value.data || value.data.length === 0) {
      return null;
    }

    const dataStr = value.data[0];
    if (!dataStr) {
      return null;
    }

    return {
      data: Buffer.from(dataStr, 'base64'),
      executable: value.executable,
      lamports: value.lamports,
      owner: value.owner,
      rentEpoch: value.rentEpoch,
    };
  }

  async getMultipleAccounts(addresses: string[]): Promise<(SimpleAccountInfo | null)[]> {
    const result = await this.makeRpcCall<{ value: (AccountInfoValue | null)[] }>(
      'getMultipleAccounts',
      [addresses, { encoding: 'base64' }],
    );

    if (!result?.value) {
      return addresses.map(() => null);
    }

    return result.value.map((item) => {
      if (!item || !item.data || item.data.length === 0) return null;
      const dataStr = item.data[0];
      if (!dataStr) return null;
      return {
        data: Buffer.from(dataStr, 'base64'),
        executable: item.executable,
        lamports: item.lamports,
        owner: item.owner,
        rentEpoch: item.rentEpoch,
      };
    });
  }

  async getSlot(): Promise<number> {
    const result = await this.makeRpcCall<number>('getSlot', []);
    return result ?? 0;
  }

  async getBlockTime(slot: number): Promise<number | null> {
    return await this.makeRpcCall<number>('getBlockTime', [slot]);
  }

  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.makeRpcCall<string>('getHealth', []);
      return result === 'ok';
    } catch {
      return false;
    }
  }

  getAdapter() {
    return {
      getAccountInfo: (address: string) => this.getAccountInfo(address),
      getMultipleAccounts: (addresses: string[]) => this.getMultipleAccounts(addresses),
      getSlot: () => this.getSlot(),
      getBlockTime: (slot: number) => this.getBlockTime(slot),
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let connectionManager: SolanaConnectionManager | null = null;

export async function getSolanaConnectionManager(): Promise<SolanaConnectionManager> {
  if (!connectionManager) {
    connectionManager = new SolanaConnectionManager();
    await connectionManager.initialize();
  }
  return connectionManager;
}

export function resetSolanaConnectionManager(): void {
  connectionManager = null;
}

// ============================================================================
// Legacy Exports for Compatibility
// ============================================================================

/**
 * @deprecated Use getSolanaConnectionManager() instead
 */
export const solanaConnectionManager = {
  getAdapter: () => ({
    getAccountInfo: async () => null,
    getMultipleAccounts: async () => [],
    getSlot: async () => 0,
    getBlockTime: async () => null,
  }),
  healthCheck: async () => true,
};

/**
 * Fetch account info
 */
export async function fetchAccountInfo(address: string): Promise<SimpleAccountInfo | null> {
  const manager = await getSolanaConnectionManager();
  return manager.getAccountInfo(address);
}

export { SolanaConnectionManager };
