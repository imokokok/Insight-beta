/**
 * Solana Data Sync Service
 *
 * Solana 数据同步服务
 */

import { EventEmitter } from 'events';
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

  constructor() {
    super();
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

    // Stop existing sync
    this.stopSync(instanceId);

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
      // FIXME: Implement actual price feed fetching
      // This is currently a mock implementation.
      // To implement properly, integrate with Solana price feed programs
      // such as Pyth Network or Chainlink on Solana.
      // Issue: Need to add @solana/web3.js and implement RPC calls.
      const priceFeed: SolanaPriceFeed = {
        symbol: instance.config.symbol,
        price: 0,
        confidence: 0,
        timestamp: Date.now(),
        slot: 0,
        source: instance.protocol,
        decimals: 8,
      };

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
