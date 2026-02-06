import { createPublicClient, http, parseAbi, type Address } from 'viem';

import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';
import type { Assertion } from '@/lib/types/oracleTypes';
import { parseRpcUrls, toIsoFromSeconds } from '@/lib/utils';

import { DEFAULT_ORACLE_INSTANCE_ID, readOracleConfig } from './oracleConfig';
import { getSyncState, fetchAssertion, upsertAssertion, updateSyncState } from './oracleState';

const abi = parseAbi([
  'event AssertionCreated(bytes32 indexed assertionId,address indexed asserter,string protocol,string market,string assertion,uint256 bondUsd,uint256 assertedAt,uint256 livenessEndsAt,bytes32 txHash)',
  'event AssertionDisputed(bytes32 indexed assertionId,address indexed disputer,string reason,uint256 disputedAt)',
  'event AssertionResolved(bytes32 indexed assertionId,bool outcome,uint256 resolvedAt)',
  'event VoteCast(bytes32 indexed assertionId, address indexed voter, bool support, uint256 weight)',
]);

// RPC Node with weight and health tracking
interface RpcNode {
  url: string;
  weight: number;
  healthy: boolean;
  lastLatency: number;
  failureCount: number;
  successCount: number;
  lastUsed: number;
}

// Concurrency control
class ConcurrencyLimiter {
  private maxConcurrency: number;
  private current: number = 0;
  private queue: Array<() => void> = [];

  constructor(maxConcurrency: number) {
    this.maxConcurrency = maxConcurrency;
  }

  async acquire(): Promise<() => void> {
    if (this.current < this.maxConcurrency) {
      this.current++;
      return () => this.release();
    }

    return new Promise((resolve) => {
      this.queue.push(() => {
        this.current++;
        resolve(() => this.release());
      });
    });
  }

  private release() {
    this.current--;
    const next = this.queue.shift();
    if (next) next();
  }
}

// RPC Manager with weighted selection
class RpcManager {
  private nodes: RpcNode[] = [];
  private clientCache = new Map<string, ReturnType<typeof createPublicClient>>();
  private readonly CACHE_TTL_MS = 60000;

  constructor(urls: string[]) {
    this.nodes = urls.map((url, index) => ({
      url,
      weight: 100 - index * 10, // Default descending weights
      healthy: true,
      lastLatency: 0,
      failureCount: 0,
      successCount: 0,
      lastUsed: 0,
    }));
  }

  private getCachedClient(url: string): ReturnType<typeof createPublicClient> {
    const cached = this.clientCache.get(url);
    if (cached) {
      const timestamp = (cached as unknown as { _cacheTimestamp?: number })._cacheTimestamp;
      if (timestamp && Date.now() - timestamp < this.CACHE_TTL_MS) {
        return cached;
      }
      this.clientCache.delete(url);
    }

    const client = createPublicClient({
      transport: http(url, {
        timeout: this.getRpcTimeoutMs(),
        retryCount: 0,
      }),
    });
    (client as unknown as { _cacheTimestamp?: number })._cacheTimestamp = Date.now();
    this.clientCache.set(url, client);
    return client;
  }

  private getRpcTimeoutMs(): number {
    const raw = Number(env.INSIGHT_RPC_TIMEOUT_MS || env.INSIGHT_DEPENDENCY_TIMEOUT_MS || 30000);
    return Number.isFinite(raw) && raw > 0 ? raw : 30000;
  }

  // Weighted random selection
  selectNode(): RpcNode | null {
    const healthyNodes = this.nodes.filter((n) => n.healthy);
    if (healthyNodes.length === 0) return null;

    const totalWeight = healthyNodes.reduce((sum, n) => sum + n.weight, 0);
    let random = Math.random() * totalWeight;

    for (const node of healthyNodes) {
      random -= node.weight;
      if (random <= 0) {
        node.lastUsed = Date.now();
        return node;
      }
    }

    return healthyNodes[0] ?? null;
  }

  recordSuccess(url: string, latency: number) {
    const node = this.nodes.find((n) => n.url === url);
    if (node) {
      node.successCount++;
      node.lastLatency = latency;
      node.failureCount = 0;
      node.healthy = true;
      // Increase weight slightly on success
      node.weight = Math.min(100, node.weight + 1);
    }
  }

  recordFailure(url: string) {
    const node = this.nodes.find((n) => n.url === url);
    if (node) {
      node.failureCount++;
      // Decrease weight on failure
      node.weight = Math.max(10, node.weight - 10);
      if (node.failureCount >= 3) {
        node.healthy = false;
        // Schedule health check
        setTimeout(() => this.healthCheck(url), 30000);
      }
    }
  }

  async healthCheck(url: string): Promise<boolean> {
    try {
      const client = this.getCachedClient(url);
      const start = Date.now();
      await client.getBlockNumber();
      const latency = Date.now() - start;

      const node = this.nodes.find((n) => n.url === url);
      if (node) {
        node.healthy = true;
        node.failureCount = 0;
        node.lastLatency = latency;
      }
      return true;
    } catch {
      return false;
    }
  }

  getNodes(): RpcNode[] {
    return [...this.nodes];
  }

  getClient(url: string): ReturnType<typeof createPublicClient> {
    return this.getCachedClient(url);
  }
}

// Checkpoint manager for resumable sync
class CheckpointManager {
  private checkpoints = new Map<string, bigint>();
  private readonly SAVE_INTERVAL = 100n; // Save every 100 blocks

  getCheckpoint(instanceId: string): bigint {
    return this.checkpoints.get(instanceId) || 0n;
  }

  shouldSave(currentBlock: bigint): boolean {
    return currentBlock % this.SAVE_INTERVAL === 0n;
  }

  save(instanceId: string, blockNumber: bigint) {
    this.checkpoints.set(instanceId, blockNumber);
  }

  async persist(instanceId: string, blockNumber: bigint): Promise<void> {
    this.save(instanceId, blockNumber);
    // Persist to database
    try {
      await updateSyncState(
        blockNumber,
        new Date().toISOString(),
        new Date().toISOString(),
        0,
        null,
        {},
        instanceId,
      );
    } catch (error) {
      logger.warn('Failed to persist checkpoint', { instanceId, blockNumber, error });
    }
  }
}

// Adaptive block window calculator
class AdaptiveBlockWindow {
  private currentWindow: bigint;
  private readonly minWindow: bigint;
  private readonly maxWindow: bigint;
  private readonly growthFactor: number;
  private readonly shrinkFactor: number;
  private consecutiveSuccesses: number = 0;
  private consecutiveFailures: number = 0;

  constructor(
    initialWindow: bigint = 10000n,
    minWindow: bigint = 500n,
    maxWindow: bigint = 50000n,
  ) {
    this.currentWindow = initialWindow;
    this.minWindow = minWindow;
    this.maxWindow = maxWindow;
    this.growthFactor = 1.5;
    this.shrinkFactor = 0.5;
  }

  getWindow(): bigint {
    return this.currentWindow;
  }

  recordSuccess(logCount: number, durationMs: number) {
    this.consecutiveSuccesses++;
    this.consecutiveFailures = 0;

    // Grow window if we're processing many logs quickly
    if (logCount > 10 && durationMs < 5000 && this.consecutiveSuccesses >= 3) {
      this.currentWindow = BigInt(
        Math.min(Number(this.currentWindow) * this.growthFactor, Number(this.maxWindow)),
      );
      this.consecutiveSuccesses = 0;
    }
  }

  recordFailure() {
    this.consecutiveFailures++;
    this.consecutiveSuccesses = 0;

    // Shrink window on failure
    this.currentWindow = BigInt(
      Math.max(Number(this.currentWindow) * this.shrinkFactor, Number(this.minWindow)),
    );
  }

  recordEmpty() {
    // Slightly shrink window if no logs found
    if (this.currentWindow > this.minWindow * 2n) {
      this.currentWindow = (this.currentWindow * 9n) / 10n;
    }
  }
}

// Main sync optimizer
export class OracleSyncOptimizer {
  private rpcManager: RpcManager | null = null;
  private checkpointManager = new CheckpointManager();
  private concurrencyLimiter = new ConcurrencyLimiter(5);
  private adaptiveWindow: AdaptiveBlockWindow;
  private instanceId: string;

  constructor(instanceId: string = DEFAULT_ORACLE_INSTANCE_ID) {
    this.instanceId = instanceId;
    this.adaptiveWindow = new AdaptiveBlockWindow();
  }

  async initialize(): Promise<void> {
    const config = await readOracleConfig(this.instanceId);
    const rpcUrls = parseRpcUrls(config.rpcUrl);

    if (rpcUrls.length === 0) {
      throw new Error('No RPC URLs configured');
    }

    this.rpcManager = new RpcManager(rpcUrls);

    // Load last checkpoint
    const syncState = await getSyncState(this.instanceId);
    if (syncState.lastProcessedBlock > 0n) {
      this.checkpointManager.save(this.instanceId, syncState.lastProcessedBlock);
    }
  }

  async syncRange(
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<{
    processed: number;
    lastBlock: bigint;
  }> {
    if (!this.rpcManager) {
      throw new Error('Sync optimizer not initialized');
    }

    let processed = 0;
    let currentBlock = fromBlock;

    while (currentBlock <= toBlock) {
      const window = this.adaptiveWindow.getWindow();
      const rangeEnd = currentBlock + window - 1n <= toBlock ? currentBlock + window - 1n : toBlock;

      try {
        const result = await this.syncBlockRange(currentBlock, rangeEnd);
        processed += result.logsProcessed;

        // Save checkpoint periodically
        if (this.checkpointManager.shouldSave(rangeEnd)) {
          await this.checkpointManager.persist(this.instanceId, rangeEnd);
        }

        // Update adaptive window
        if (result.logsProcessed > 0) {
          this.adaptiveWindow.recordSuccess(result.logsProcessed, result.durationMs);
        } else {
          this.adaptiveWindow.recordEmpty();
        }

        currentBlock = rangeEnd + 1n;
      } catch (error) {
        this.adaptiveWindow.recordFailure();
        logger.warn('Sync range failed, will retry with smaller window', {
          from: currentBlock,
          to: rangeEnd,
          error: error instanceof Error ? error.message : String(error),
        });

        // If window is already at minimum, throw error
        if (this.adaptiveWindow.getWindow() <= 500n) {
          throw error;
        }
      }
    }

    return { processed, lastBlock: currentBlock - 1n };
  }

  private async syncBlockRange(
    fromBlock: bigint,
    toBlock: bigint,
  ): Promise<{
    logsProcessed: number;
    durationMs: number;
  }> {
    if (!this.rpcManager) throw new Error('Not initialized');

    const release = await this.concurrencyLimiter.acquire();
    const startTime = Date.now();

    try {
      const node = this.rpcManager.selectNode();
      if (!node) {
        throw new Error('No healthy RPC nodes available');
      }

      const client = this.rpcManager.getClient(node.url);

      // Fetch all event types in parallel
      const [createdLogs, disputedLogs, resolvedLogs] = await Promise.all([
        client.getLogs({
          address: await this.getContractAddress(),
          event: abi[0],
          fromBlock,
          toBlock,
        }),
        client.getLogs({
          address: await this.getContractAddress(),
          event: abi[1],
          fromBlock,
          toBlock,
        }),
        client.getLogs({
          address: await this.getContractAddress(),
          event: abi[2],
          fromBlock,
          toBlock,
        }),
      ]);

      const durationMs = Date.now() - startTime;
      this.rpcManager.recordSuccess(node.url, durationMs);

      // Process logs
      await this.processLogs(createdLogs, disputedLogs, resolvedLogs);

      return {
        logsProcessed: createdLogs.length + disputedLogs.length + resolvedLogs.length,
        durationMs,
      };
    } catch (error) {
      const node = this.rpcManager?.selectNode();
      if (node) {
        this.rpcManager?.recordFailure(node.url);
      }
      throw error;
    } finally {
      release();
    }
  }

  private async processLogs(
    createdLogs: unknown[],
    disputedLogs: unknown[],
    resolvedLogs: unknown[],
  ): Promise<void> {
    // Process in batches for better performance
    const batchSize = 100;

    // Process assertion created events
    for (let i = 0; i < createdLogs.length; i += batchSize) {
      const batch = createdLogs.slice(i, i + batchSize);
      await Promise.all(batch.map((log) => this.processAssertionCreated(log)));
    }

    // Process dispute events
    for (let i = 0; i < disputedLogs.length; i += batchSize) {
      const batch = disputedLogs.slice(i, i + batchSize);
      await Promise.all(batch.map((log) => this.processAssertionDisputed(log)));
    }

    // Process resolution events
    for (let i = 0; i < resolvedLogs.length; i += batchSize) {
      const batch = resolvedLogs.slice(i, i + batchSize);
      await Promise.all(batch.map((log) => this.processAssertionResolved(log)));
    }
  }

  private async processAssertionCreated(log: unknown): Promise<void> {
    // Implementation from original oracleIndexer
    const args = (log as { args?: Record<string, unknown> }).args;
    if (!args) return;

    const id = args.assertionId as `0x${string}`;
    const assertion: Assertion = {
      id,
      chain: 'Local', // Will be set from config
      asserter: args.asserter as `0x${string}`,
      protocol: args.protocol as string,
      market: args.market as string,
      assertion: args.assertion as string,
      assertedAt: toIsoFromSeconds(args.assertedAt as bigint),
      livenessEndsAt: toIsoFromSeconds(args.livenessEndsAt as bigint),
      blockNumber: String((log as { blockNumber?: bigint }).blockNumber || 0n),
      logIndex: Number((log as { logIndex?: number }).logIndex || 0),
      resolvedAt: undefined,
      status: 'Pending',
      bondUsd: Number(args.bondUsd as bigint),
      txHash: (log as { transactionHash?: `0x${string}` }).transactionHash || '0x0',
    };

    await upsertAssertion(assertion, this.instanceId);
  }

  private async processAssertionDisputed(log: unknown): Promise<void> {
    const args = (log as { args?: Record<string, unknown> }).args;
    if (!args) return;

    const id = args.assertionId as `0x${string}`;
    const assertion = await fetchAssertion(id, this.instanceId);

    if (assertion) {
      assertion.status = 'Disputed';
      assertion.disputer = args.disputer as `0x${string}`;
      await upsertAssertion(assertion, this.instanceId);
    }
  }

  private async processAssertionResolved(log: unknown): Promise<void> {
    const args = (log as { args?: Record<string, unknown> }).args;
    if (!args) return;

    const id = args.assertionId as `0x${string}`;
    const assertion = await fetchAssertion(id, this.instanceId);

    if (assertion) {
      assertion.status = (args.outcome as boolean) ? 'Resolved' : 'Disputed';
      assertion.resolvedAt = toIsoFromSeconds(args.resolvedAt as bigint);
      await upsertAssertion(assertion, this.instanceId);
    }
  }

  private async getContractAddress(): Promise<Address> {
    const config = await readOracleConfig(this.instanceId);
    return config.contractAddress as Address;
  }

  getStats(): {
    checkpoint: bigint;
    window: bigint;
    rpcNodes: RpcNode[];
  } {
    return {
      checkpoint: this.checkpointManager.getCheckpoint(this.instanceId),
      window: this.adaptiveWindow.getWindow(),
      rpcNodes: this.rpcManager?.getNodes() || [],
    };
  }
}

// Export singleton instance
export const syncOptimizer = new OracleSyncOptimizer();

// Helper functions for external use
export async function initializeSyncOptimizer(instanceId?: string): Promise<void> {
  const optimizer = instanceId ? new OracleSyncOptimizer(instanceId) : syncOptimizer;
  await optimizer.initialize();
}

export async function optimizedSync(
  fromBlock: bigint,
  toBlock: bigint,
  instanceId?: string,
): Promise<{ processed: number; lastBlock: bigint }> {
  const optimizer = instanceId ? new OracleSyncOptimizer(instanceId) : syncOptimizer;
  await optimizer.initialize();
  return optimizer.syncRange(fromBlock, toBlock);
}

export function getSyncStats(instanceId?: string): ReturnType<OracleSyncOptimizer['getStats']> {
  const optimizer = instanceId ? new OracleSyncOptimizer(instanceId) : syncOptimizer;
  return optimizer.getStats();
}
