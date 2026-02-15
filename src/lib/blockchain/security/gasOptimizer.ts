/**
 * Utility Module
 *
 * 提供通用工具函数：缓存、重试机制等
 */

import { logger } from '@/shared/logger';

export const UTILITY_CONSTANTS = {
  DEFAULT_CACHE_TTL: 30000,
  MAX_CACHE_SIZE: 1000,
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
} as const;

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  blockNumber?: bigint;
}

export class QueryCache<T = unknown> {
  private cache: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private ttl: number;

  constructor(
    maxSize: number = UTILITY_CONSTANTS.MAX_CACHE_SIZE,
    ttl: number = UTILITY_CONSTANTS.DEFAULT_CACHE_TTL,
  ) {
    this.maxSize = maxSize;
    this.ttl = ttl;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: T, blockNumber?: bigint): void {
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      blockNumber,
    });
  }

  invalidate(key: string): boolean {
    return this.cache.delete(key);
  }

  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
        count++;
      }
    }
    return count;
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { size: number; maxSize: number; ttl: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      ttl: this.ttl,
    };
  }
}

export class SmartRetry {
  private maxRetries: number;
  private baseDelayMs: number;
  private maxDelayMs: number;

  constructor(
    maxRetries: number = UTILITY_CONSTANTS.MAX_RETRIES,
    baseDelayMs: number = UTILITY_CONSTANTS.RETRY_DELAY_MS,
    maxDelayMs: number = 10000,
  ) {
    this.maxRetries = maxRetries;
    this.baseDelayMs = baseDelayMs;
    this.maxDelayMs = maxDelayMs;
  }

  async execute<T>(
    operation: () => Promise<T>,
    shouldRetry: (error: unknown) => boolean = this.defaultShouldRetry,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;

        if (attempt < this.maxRetries && shouldRetry(error)) {
          const delay = this.calculateDelay(attempt);
          logger.warn(`Retrying operation (attempt ${attempt + 1}/${this.maxRetries})`, {
            delay,
            error: error instanceof Error ? error.message : String(error),
          });
          await this.sleep(delay);
        }
      }
    }

    throw lastError;
  }

  private calculateDelay(attempt: number): number {
    const exponentialDelay = this.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * this.baseDelayMs;
    return Math.min(exponentialDelay + jitter, this.maxDelayMs);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private defaultShouldRetry(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('timeout') ||
        message.includes('network') ||
        message.includes('rate limit') ||
        message.includes('429') ||
        message.includes('503') ||
        message.includes('502') ||
        message.includes('connection')
      );
    }
    return false;
  }
}

export function createQueryCache<T = unknown>(maxSize?: number, ttl?: number): QueryCache<T> {
  return new QueryCache<T>(maxSize, ttl);
}

export function createSmartRetry(maxRetries?: number, baseDelayMs?: number): SmartRetry {
  return new SmartRetry(maxRetries, baseDelayMs);
}
