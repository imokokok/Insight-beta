import { bench, describe } from 'vitest';

// Simple in-memory cache implementation for benchmarking
class SimpleCache<T> {
  private cache = new Map<string, { value: T; expiry: number }>();

  set(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, { value, expiry: Date.now() + ttlMs });
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }
}

describe('Cache Operations Benchmarks', () => {
  const cache = new SimpleCache<{ price: number; timestamp: number }>();
  const testData = { price: 1234.56, timestamp: Date.now() };

  bench('cache set operation', () => {
    cache.set('test-key', testData, 60000);
  });

  bench('cache get operation', () => {
    cache.get('test-key');
  });

  bench('cache set and get', () => {
    cache.set('test-key', testData, 60000);
    cache.get('test-key');
  });

  bench('cache with 1000 entries', () => {
    const largeCache = new SimpleCache<number>();
    for (let i = 0; i < 1000; i++) {
      largeCache.set(`key-${i}`, i, 60000);
    }
    for (let i = 0; i < 1000; i++) {
      largeCache.get(`key-${i}`);
    }
  });

  bench('cache eviction on expiry', () => {
    const expiringCache = new SimpleCache<number>();
    expiringCache.set('expired', 123, 0); // Already expired
    expiringCache.get('expired'); // Should trigger eviction
  });
});

describe('Price Cache Benchmarks', () => {
  interface PriceData {
    pair: string;
    price: number;
    timestamp: number;
    confidence: number;
  }

  const priceCache = new SimpleCache<PriceData>();

  bench('cache price update', () => {
    const price: PriceData = {
      pair: 'ETH/USD',
      price: 2500 + Math.random() * 100,
      timestamp: Date.now(),
      confidence: 0.95,
    };
    priceCache.set('ETH/USD', price, 30000);
  });

  bench('retrieve cached price', () => {
    priceCache.get('ETH/USD');
  });

  bench('batch price cache operations', () => {
    const pairs = ['ETH/USD', 'BTC/USD', 'LINK/USD', 'UNI/USD', 'AAVE/USD'];
    pairs.forEach((pair) => {
      priceCache.set(
        pair,
        {
          pair,
          price: Math.random() * 5000,
          timestamp: Date.now(),
          confidence: 0.9 + Math.random() * 0.1,
        },
        30000,
      );
    });

    pairs.forEach((pair) => {
      priceCache.get(pair);
    });
  });
});
