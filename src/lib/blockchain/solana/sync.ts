/**
 * Solana Data Sync Service
 *
 * Solana 数据同步服务
 */

import { EventEmitter } from 'events';

import { logger } from '@/lib/logger';

import { getChainlinkClient } from './chainlink-client';
import { getPythClient } from './pyth-client';

import type { ChainlinkSolanaClient } from './chainlink-client';
import type { PythSolanaClient } from './pyth-client';
import type {
  SolanaOracleInstance,
  SolanaSyncState,
  SolanaPriceUpdate,
  SolanaPriceFeed,
} from './types';

// ============================================================================
// Sync Configuration
// ============================================================================

const SYNC_CONFIG = {
  defaultInterval: 5000, // 5 seconds
  minInterval: 1000, // 1 second
  maxInterval: 60000, // 1 minute
  staleThreshold: 300000, // 5 minutes
  batchSize: 10,
};

// ============================================================================
// Sync Service
// ============================================================================

export class SolanaSyncService extends EventEmitter {
  private instances: Map<string, SolanaOracleInstance> = new Map();
  private syncStates: Map<string, SolanaSyncState> = new Map();
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map();
  private pythClients: Map<string, PythSolanaClient> = new Map();
  private chainlinkClients: Map<string, ChainlinkSolanaClient> = new Map();
  private syncLocks = new Map<string, Promise<void>>();

  constructor() {
    super();
    // 设置最大监听器数量防止内存泄漏
    this.setMaxListeners(100);
  }

  /**
   * 销毁服务，清理所有资源
   */
  destroy(): void {
    this.stopAll();
    this.instances.clear();
    this.syncStates.clear();
    this.pythClients.clear();
    this.chainlinkClients.clear();
    this.syncLocks.clear();
    this.removeAllListeners();
  }

  /**
   * Register a new oracle instance
   */
  registerInstance(
    instance: Omit<SolanaOracleInstance, 'id' | 'createdAt' | 'updatedAt'>,
  ): SolanaOracleInstance {
    const id = `${instance.protocol}:${instance.chain}:${instance.config.feedAddress}`;
    const now = new Date();

    const fullInstance: SolanaOracleInstance = {
      ...instance,
      id,
      createdAt: now,
      updatedAt: now,
    };

    this.instances.set(id, fullInstance);

    // Initialize sync state
    this.syncStates.set(id, {
      instanceId: id,
      chain: instance.chain,
      status: 'stopped',
      errorCount: 0,
      updatedAt: now,
    });

    this.emit('instanceRegistered', fullInstance);

    return fullInstance;
  }

  /**
   * Start syncing an instance
   */
  async startSync(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      throw new Error(`Instance not found: ${instanceId}`);
    }

    // 等待之前的同步操作完成（防止竞态条件）
    while (this.syncLocks.has(instanceId)) {
      await this.syncLocks.get(instanceId);
    }

    // 再次检查状态
    if (this.intervals.has(instanceId)) {
      return; // 已经在同步中
    }

    // 创建锁
    let lockResolve: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      lockResolve = resolve;
    });
    this.syncLocks.set(instanceId, lockPromise);

    try {
      const state = this.syncStates.get(instanceId);
      if (!state) {
        throw new Error(`Sync state not found for instance: ${instanceId}`);
      }
      state.status = 'active';
      state.errorCount = 0;
      state.updatedAt = new Date();

      // Start sync loop
      const interval = setInterval(
        () => this.syncInstance(instanceId),
        instance.config.updateInterval || SYNC_CONFIG.defaultInterval,
      );

      this.intervals.set(instanceId, interval);

      // Initial sync
      await this.syncInstance(instanceId);

      this.emit('syncStarted', instanceId);
    } finally {
      this.syncLocks.delete(instanceId);
      lockResolve!();
    }
  }

  /**
   * Stop syncing an instance
   */
  stopSync(instanceId: string): void {
    const interval = this.intervals.get(instanceId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(instanceId);
    }

    const state = this.syncStates.get(instanceId);
    if (state) {
      state.status = 'stopped';
      state.updatedAt = new Date();
    }

    this.emit('syncStopped', instanceId);
  }

  /**
   * Sync a single instance
   */
  private async syncInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    const state = this.syncStates.get(instanceId);

    if (!instance || !state || state.status !== 'active') {
      return;
    }

    try {
      // 实现 Solana 价格获取逻辑
      // 支持 Pyth Network 和 Chainlink 两种预言机源
      const priceFeed = await this.fetchPriceFromSource(instance);

      const update: SolanaPriceUpdate = {
        id: `${instanceId}:${Date.now()}`,
        instanceId,
        protocol: instance.protocol,
        chain: instance.chain,
        symbol: instance.config.symbol,
        price: priceFeed.price,
        confidence: priceFeed.confidence,
        timestamp: new Date(),
        slot: priceFeed.slot,
        isStale: this.isStale(priceFeed.timestamp),
      };

      // Update state
      state.lastSyncAt = new Date();
      state.lastProcessedSlot = priceFeed.slot;
      state.errorCount = 0;
      state.updatedAt = new Date();

      this.emit('priceUpdate', update);
    } catch (error) {
      state.errorCount++;
      state.lastError = error instanceof Error ? error.message : String(error);
      state.updatedAt = new Date();

      if (state.errorCount > 5) {
        state.status = 'error';
        this.stopSync(instanceId);
        this.emit('syncError', instanceId, error);
      }
    }
  }

  /**
   * Check if price is stale
   */
  private isStale(timestamp: number): boolean {
    return Date.now() - timestamp > SYNC_CONFIG.staleThreshold;
  }

  /**
   * Fetch price from the appropriate source based on protocol
   */
  private async fetchPriceFromSource(instance: SolanaOracleInstance): Promise<SolanaPriceFeed> {
    switch (instance.protocol) {
      case 'pyth':
        return this.fetchFromPyth(instance);
      case 'chainlink':
        return this.fetchFromChainlink(instance);
      default:
        throw new Error(`Unsupported protocol: ${instance.protocol}`);
    }
  }

  /**
   * Get or create Pyth client for instance
   */
  private getPythClient(instance: SolanaOracleInstance): PythSolanaClient {
    const clientKey = `${instance.chain}:${instance.config.rpcUrl || 'default'}`;

    if (!this.pythClients.has(clientKey)) {
      const cluster = instance.chain === 'solanaDevnet' ? 'devnet' : 'mainnet-beta';
      const rpcUrl = instance.config.rpcUrl || this.getDefaultRpcUrl(cluster);
      const client = getPythClient(rpcUrl, cluster);
      this.pythClients.set(clientKey, client);
    }

    return this.pythClients.get(clientKey)!;
  }

  /**
   * Get or create Chainlink client for instance
   */
  private getChainlinkClient(instance: SolanaOracleInstance): ChainlinkSolanaClient {
    const clientKey = `${instance.chain}:${instance.config.rpcUrl || 'default'}`;

    if (!this.chainlinkClients.has(clientKey)) {
      const cluster = instance.chain === 'solanaDevnet' ? 'devnet' : 'mainnet-beta';
      const rpcUrl = instance.config.rpcUrl || this.getDefaultRpcUrl(cluster);
      const client = getChainlinkClient(rpcUrl, cluster);
      this.chainlinkClients.set(clientKey, client);
    }

    return this.chainlinkClients.get(clientKey)!;
  }

  /**
   * Get default RPC URL for cluster
   */
  private getDefaultRpcUrl(cluster: 'mainnet-beta' | 'devnet'): string {
    if (cluster === 'devnet') {
      return 'https://api.devnet.solana.com';
    }
    return process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
  }

  /**
   * Fetch price from Pyth Network
   * Uses @pythnetwork/client to fetch real price data from Solana
   */
  private async fetchFromPyth(instance: SolanaOracleInstance): Promise<SolanaPriceFeed> {
    try {
      const client = this.getPythClient(instance);
      const priceFeed = await client.fetchPrice(
        instance.config.feedAddress,
        instance.config.symbol,
      );

      logger.debug('Fetched Pyth price from Solana', {
        symbol: instance.config.symbol,
        price: priceFeed.price,
        slot: priceFeed.slot,
      });

      return priceFeed;
    } catch (error) {
      logger.error('Failed to fetch Pyth price from Solana', {
        error: error instanceof Error ? error.message : String(error),
        symbol: instance.config.symbol,
        feedAddress: instance.config.feedAddress,
      });

      throw error;
    }
  }

  /**
   * Fetch price from Chainlink on Solana
   * Uses Chainlink Solana SDK to fetch real price data
   */
  private async fetchFromChainlink(instance: SolanaOracleInstance): Promise<SolanaPriceFeed> {
    try {
      const client = this.getChainlinkClient(instance);
      const priceFeed = await client.fetchPrice(
        instance.config.feedAddress,
        instance.config.symbol,
      );

      logger.debug('Fetched Chainlink price from Solana', {
        symbol: instance.config.symbol,
        price: priceFeed.price,
        slot: priceFeed.slot,
      });

      return priceFeed;
    } catch (error) {
      logger.error('Failed to fetch Chainlink price from Solana', {
        error: error instanceof Error ? error.message : String(error),
        symbol: instance.config.symbol,
        feedAddress: instance.config.feedAddress,
      });

      throw error;
    }
  }

  /**
   * Get sync state
   */
  getSyncState(instanceId: string): SolanaSyncState | undefined {
    return this.syncStates.get(instanceId);
  }

  /**
   * Get all sync states
   */
  getAllSyncStates(): SolanaSyncState[] {
    return Array.from(this.syncStates.values());
  }

  /**
   * Get instance
   */
  getInstance(instanceId: string): SolanaOracleInstance | undefined {
    return this.instances.get(instanceId);
  }

  /**
   * Get all instances
   */
  getAllInstances(): SolanaOracleInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Unregister an instance
   */
  unregisterInstance(instanceId: string): void {
    this.stopSync(instanceId);
    this.instances.delete(instanceId);
    this.syncStates.delete(instanceId);
    this.emit('instanceUnregistered', instanceId);
  }

  /**
   * Stop all syncs
   */
  stopAll(): void {
    for (const [instanceId] of this.intervals) {
      this.stopSync(instanceId);
    }
  }

  /**
   * Get health status
   */
  getHealth(): {
    totalInstances: number;
    activeSyncs: number;
    errorSyncs: number;
    stoppedSyncs: number;
  } {
    const states = this.getAllSyncStates();
    return {
      totalInstances: states.length,
      activeSyncs: states.filter((s) => s.status === 'active').length,
      errorSyncs: states.filter((s) => s.status === 'error').length,
      stoppedSyncs: states.filter((s) => s.status === 'stopped').length,
    };
  }
}

// ============================================================================
// Export Singleton
// ============================================================================

export const solanaSyncService = new SolanaSyncService();
