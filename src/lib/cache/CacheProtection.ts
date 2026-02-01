import { logger } from '@/lib/logger';

/**
 * Bloom Filter implementation for cache penetration protection
 * Uses a simple bit array with multiple hash functions
 */
export class BloomFilter {
  private bitArray: Uint8Array;
  private size: number;
  private hashCount: number;
  private itemCount: number = 0;

  constructor(expectedItems: number = 100000, falsePositiveRate: number = 0.01) {
    // Calculate optimal size and hash count
    this.size = Math.ceil(-(expectedItems * Math.log(falsePositiveRate)) / (Math.log(2) ** 2));
    this.hashCount = Math.ceil((this.size / expectedItems) * Math.log(2));
    this.bitArray = new Uint8Array(Math.ceil(this.size / 8));
  }

  /**
   * Add an item to the filter
   */
  add(item: string): void {
    const positions = this.getHashPositions(item);
    for (const pos of positions) {
      const byteIndex = Math.floor(pos / 8);
      const bitIndex = pos % 8;
      if (this.bitArray[byteIndex] !== undefined) {
        this.bitArray[byteIndex] |= 1 << bitIndex;
      }
    }
    this.itemCount++;
  }

  /**
   * Check if an item might exist in the filter
   * Returns true if the item might exist, false if it definitely doesn't
   */
  mightContain(item: string): boolean {
    const positions = this.getHashPositions(item);
    for (const pos of positions) {
      const byteIndex = Math.floor(pos / 8);
      const bitIndex = pos % 8;
      if (this.bitArray[byteIndex] === undefined || (this.bitArray[byteIndex] & (1 << bitIndex)) === 0) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get hash positions for an item using multiple hash functions
   */
  private getHashPositions(item: string): number[] {
    const positions: number[] = [];
    const hash1 = this.hash(item, 0);
    const hash2 = this.hash(item, 1);

    for (let i = 0; i < this.hashCount; i++) {
      const pos = Math.abs((hash1 + i * hash2) % this.size);
      positions.push(pos);
    }

    return positions;
  }

  /**
   * Simple hash function (FNV-1a inspired)
   */
  private hash(item: string, seed: number): number {
    let hash = 2166136261 + seed;
    for (let i = 0; i < item.length; i++) {
      hash ^= item.charCodeAt(i);
      hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0;
  }

  /**
   * Get filter statistics
   */
  getStats(): { size: number; hashCount: number; itemCount: number; memoryUsage: string } {
    return {
      size: this.size,
      hashCount: this.hashCount,
      itemCount: this.itemCount,
      memoryUsage: `${(this.bitArray.length / 1024).toFixed(2)} KB`,
    };
  }

  /**
   * Clear the filter
   */
  clear(): void {
    this.bitArray.fill(0);
    this.itemCount = 0;
  }
}

/**
 * Cache penetration protection using null value caching and bloom filter
 */
export class CachePenetrationProtection {
  private bloomFilter: BloomFilter;
  private nullValueTtl: number;
  private stats = {
    bloomFilterHits: 0,
    bloomFilterMisses: 0,
    nullValueCached: 0,
    nullValueHit: 0,
  };

  constructor(options: { expectedItems?: number; falsePositiveRate?: number; nullValueTtl?: number } = {}) {
    this.bloomFilter = new BloomFilter(options.expectedItems ?? 100000, options.falsePositiveRate ?? 0.01);
    this.nullValueTtl = options.nullValueTtl ?? 60; // 60 seconds default
  }

  /**
   * Check if a key might exist (using bloom filter)
   */
  mightExist(key: string): boolean {
    const exists = this.bloomFilter.mightContain(key);
    if (exists) {
      this.stats.bloomFilterHits++;
    } else {
      this.stats.bloomFilterMisses++;
    }
    return exists;
  }

  /**
   * Record that a key exists (add to bloom filter)
   */
  recordExists(key: string): void {
    this.bloomFilter.add(key);
  }

  /**
   * Get null value TTL for cache
   */
  getNullValueTtl(): number {
    return this.nullValueTtl;
  }

  /**
   * Record null value cached
   */
  recordNullValueCached(): void {
    this.stats.nullValueCached++;
  }

  /**
   * Record null value hit
   */
  recordNullValueHit(): void {
    this.stats.nullValueHit++;
  }

  /**
   * Get protection statistics
   */
  getStats() {
    return {
      ...this.stats,
      bloomFilter: this.bloomFilter.getStats(),
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      bloomFilterHits: 0,
      bloomFilterMisses: 0,
      nullValueCached: 0,
      nullValueHit: 0,
    };
  }
}

// Global cache penetration protection instance
export const cacheProtection = new CachePenetrationProtection({
  expectedItems: 100000,
  falsePositiveRate: 0.01,
  nullValueTtl: 60,
});

/**
 * Decorator for cache get operations with penetration protection
 */
export async function protectedCacheGet<T>(
  key: string,
  cacheGet: (key: string) => Promise<T | null>,
  cacheSet: (key: string, value: T | null, ttl: number) => Promise<boolean>,
  dataFetcher: () => Promise<T | null>,
  defaultTtl: number
): Promise<T | null> {
  // 1. Check bloom filter first
  if (!cacheProtection.mightExist(key)) {
    // Key definitely doesn't exist, fetch from source
    const value = await dataFetcher();
    if (value !== null) {
      // Cache the value and record in bloom filter
      await cacheSet(key, value, defaultTtl);
      cacheProtection.recordExists(key);
    } else {
      // Cache null value to prevent penetration
      await cacheSet(key, null, cacheProtection.getNullValueTtl());
      cacheProtection.recordNullValueCached();
    }
    return value;
  }

  // 2. Try to get from cache
  const cached = await cacheGet(key);

  // 3. If null value cached, return null immediately
  if (cached === null) {
    cacheProtection.recordNullValueHit();
    return null;
  }

  // 4. If cache hit with value, return it
  if (cached !== undefined) {
    return cached;
  }

  // 5. Cache miss, fetch from source
  const value = await dataFetcher();
  if (value !== null) {
    await cacheSet(key, value, defaultTtl);
    cacheProtection.recordExists(key);
  } else {
    // Cache null value to prevent penetration
    await cacheSet(key, null, cacheProtection.getNullValueTtl());
    cacheProtection.recordNullValueCached();
  }

  return value;
}

/**
 * Hot key detection for cache warming
 */
export class HotKeyDetector {
  private accessCounts = new Map<string, number>();
  private hotKeys = new Set<string>();
  private readonly hotThreshold: number;
  private readonly windowSize: number;
  private lastReset = Date.now();

  constructor(hotThreshold: number = 100, windowSize: number = 60000) {
    this.hotThreshold = hotThreshold;
    this.windowSize = windowSize;
  }

  /**
   * Record key access
   */
  recordAccess(key: string): void {
    this.checkReset();
    const count = (this.accessCounts.get(key) ?? 0) + 1;
    this.accessCounts.set(key, count);

    if (count >= this.hotThreshold && !this.hotKeys.has(key)) {
      this.hotKeys.add(key);
      logger.info('Hot key detected', { key, accessCount: count });
    }
  }

  /**
   * Check if a key is hot
   */
  isHotKey(key: string): boolean {
    this.checkReset();
    return this.hotKeys.has(key);
  }

  /**
   * Get all hot keys
   */
  getHotKeys(): string[] {
    this.checkReset();
    return Array.from(this.hotKeys);
  }

  /**
   * Get hot key statistics
   */
  getStats(): { hotKeys: number; totalAccesses: number; topKeys: Array<{ key: string; count: number }> } {
    this.checkReset();
    const sorted = Array.from(this.accessCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    return {
      hotKeys: this.hotKeys.size,
      totalAccesses: Array.from(this.accessCounts.values()).reduce((a, b) => a + b, 0),
      topKeys: sorted.map(([key, count]) => ({ key, count })),
    };
  }

  /**
   * Reset counters if window has passed
   */
  private checkReset(): void {
    if (Date.now() - this.lastReset > this.windowSize) {
      this.accessCounts.clear();
      this.hotKeys.clear();
      this.lastReset = Date.now();
    }
  }
}

// Global hot key detector
export const hotKeyDetector = new HotKeyDetector(100, 60000);
