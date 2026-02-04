/**
 * Solana Connection Manager
 *
 * Solana RPC 连接管理
 */

import { logger } from '@/lib/logger';

// Simple mock implementation for now
export class SolanaConnectionManager {
  async initialize(): Promise<void> {
    logger.info('Solana connection manager initialized (mock)');
  }

  getAdapter() {
    return {
      getAccountInfo: async () => null,
      getMultipleAccounts: async () => [],
      getSlot: async () => 0,
      getBlockTime: async () => null,
    };
  }

  async healthCheck(): Promise<boolean> {
    return true;
  }
}

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
