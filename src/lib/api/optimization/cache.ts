/**
 * Simple Cache - 简化的内存缓存
 *
 * 仅提供基本的缓存功能，用于服务器端数据缓存
 */

export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(pattern?: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  keys(pattern: string): Promise<string[]>;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class SimpleCache implements CacheProvider {
  private store = new Map<string, CacheEntry<unknown>>();

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number = 60000): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(pattern?: string): Promise<void> {
    if (!pattern) {
      this.store.clear();
      return;
    }

    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return [...this.store.keys()].filter((key) => regex.test(key));
  }

  get size(): number {
    return this.store.size;
  }
}

export const defaultCache = new SimpleCache();

export function generateCacheKey(prefix: string, ...parts: unknown[]): string {
  return `${prefix}:${parts
    .map((part) => (typeof part === 'object' ? JSON.stringify(part) : String(part)))
    .join(':')}`;
}
