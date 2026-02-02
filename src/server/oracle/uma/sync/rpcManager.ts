/**
 * UMA RPC Manager
 *
 * 管理 RPC 连接、重试逻辑和统计
 */

import { createPublicClient, http, type PublicClient } from 'viem';
import { logger } from '@/lib/logger';
import { redactRpcUrl } from '@/server/oracleIndexer/rpcClient';
import { getRpcTimeoutMs } from '@/server/oracleIndexer/rpcClient';
// parseRpcUrls is imported but not used in this file - removed to avoid TS error

const MAX_RETRY_BACKOFF_MS = 30000;
const RPC_CLIENT_CACHE = new Map<string, PublicClient>();

export interface RpcStats {
  [url: string]: {
    successCount: number;
    failCount: number;
    avgLatencyMs: number;
    lastUsedAt: string;
  };
}

export interface RpcManagerConfig {
  rpcUrls: string[];
  chainId: number;
  initialActiveUrl?: string;
  initialStats?: RpcStats;
}

export interface RpcManagerState {
  activeUrl: string;
  stats: RpcStats;
}

export class RpcManager {
  private urls: string[];
  private chainId: number;
  private state: RpcManagerState;

  constructor(config: RpcManagerConfig) {
    this.urls = config.rpcUrls.length > 0 ? config.rpcUrls : [config.initialActiveUrl || ''];
    this.chainId = config.chainId;
    this.state = {
      activeUrl: config.initialActiveUrl || this.urls[0] || '',
      stats: config.initialStats || {},
    };
  }

  getActiveUrl(): string {
    return this.state.activeUrl;
  }

  getStats(): RpcStats {
    return this.state.stats;
  }

  getState(): RpcManagerState {
    return { ...this.state };
  }

  private getClient(url: string): PublicClient {
    const cacheKey = `${url}-${this.chainId}`;
    if (!RPC_CLIENT_CACHE.has(cacheKey)) {
      RPC_CLIENT_CACHE.set(
        cacheKey,
        createPublicClient({
          transport: http(url, { timeout: getRpcTimeoutMs() }),
        }),
      );
    }
    const client = RPC_CLIENT_CACHE.get(cacheKey);
    if (!client) {
      throw new Error(`Failed to get or create RPC client for ${cacheKey}`);
    }
    return client;
  }

  private pickNextUrl(): string {
    const currentIndex = this.urls.indexOf(this.state.activeUrl);
    const nextIndex = (currentIndex + 1) % this.urls.length;
    return this.urls[nextIndex] || this.state.activeUrl;
  }

  private recordSuccess(url: string, latencyMs: number): void {
    const stats = this.state.stats[url] || {
      successCount: 0,
      failCount: 0,
      avgLatencyMs: 0,
      lastUsedAt: new Date().toISOString(),
    };
    stats.successCount++;
    stats.avgLatencyMs =
      (stats.avgLatencyMs * (stats.successCount - 1) + latencyMs) / stats.successCount;
    stats.lastUsedAt = new Date().toISOString();
    this.state.stats[url] = stats;
  }

  private recordFailure(url: string): void {
    const stats = this.state.stats[url] || {
      successCount: 0,
      failCount: 0,
      avgLatencyMs: 0,
      lastUsedAt: new Date().toISOString(),
    };
    stats.failCount++;
    stats.lastUsedAt = new Date().toISOString();
    this.state.stats[url] = stats;
  }

  private getBaseBackoff(url: string): number {
    const urlStats = this.state.stats[url];
    return urlStats?.avgLatencyMs
      ? Math.min(urlStats.avgLatencyMs * 2, MAX_RETRY_BACKOFF_MS)
      : 1000;
  }

  async execute<T>(operation: (client: PublicClient) => Promise<T>): Promise<T> {
    const urlsToTry = this.urls;
    let lastError: unknown = null;
    const MAX_RETRIES = Math.min(3, Math.max(2, Math.floor(getRpcTimeoutMs() / 5000)));

    for (let i = 0; i < urlsToTry.length; i++) {
      const url = i === 0 ? this.state.activeUrl : this.pickNextUrl();
      this.state.activeUrl = url;
      const client = this.getClient(url);
      const baseBackoff = this.getBaseBackoff(url);

      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        const startTime = Date.now();
        try {
          const result = await operation(client);
          this.recordSuccess(url, Date.now() - startTime);
          return result;
        } catch (error) {
          lastError = error;
          const errorCode = this.classifyError(error);

          if (errorCode === 'rpc_unreachable') {
            this.recordFailure(url);
            if (attempt < MAX_RETRIES - 1) {
              const backoff = Math.min(baseBackoff * Math.pow(2, attempt), MAX_RETRY_BACKOFF_MS);
              const jitter = Math.random() * 0.3 * backoff;
              const totalBackoff = backoff + jitter;
              logger.warn(
                `UMA RPC ${redactRpcUrl(url)} unreachable (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${Math.round(totalBackoff)}ms...`,
              );
              await new Promise((r) => setTimeout(r, totalBackoff));
              continue;
            }
          } else if (errorCode === 'contract_not_found') {
            throw error;
          } else {
            if (attempt < MAX_RETRIES - 1) {
              const backoff = Math.min(baseBackoff * Math.pow(2, attempt), MAX_RETRY_BACKOFF_MS);
              const jitter = Math.random() * 0.2 * backoff;
              const totalBackoff = backoff + jitter;
              logger.warn(
                `UMA RPC ${redactRpcUrl(url)} error: ${(error as Error).message} (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${Math.round(totalBackoff)}ms...`,
              );
              await new Promise((r) => setTimeout(r, totalBackoff));
              continue;
            }
          }
        }
      }

      const errorCode = this.classifyError(lastError);
      if (errorCode !== 'rpc_unreachable') break;
    }

    throw lastError instanceof Error ? lastError : new Error('rpc_unreachable');
  }

  private classifyError(error: unknown): string {
    if (!error) return 'unknown';
    const message = (error as Error).message?.toLowerCase() || '';

    if (
      message.includes('fetch failed') ||
      message.includes('connection refused') ||
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('unreachable')
    ) {
      return 'rpc_unreachable';
    }

    if (message.includes('contract') && message.includes('not found')) {
      return 'contract_not_found';
    }

    return 'unknown';
  }
}

export function readRpcStats(statsJson?: string | null): RpcStats {
  if (!statsJson) return {};
  try {
    return JSON.parse(statsJson) as RpcStats;
  } catch {
    return {};
  }
}
