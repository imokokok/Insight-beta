/**
 * API Cache - API 响应缓存
 *
 * 提供内存缓存支持，使用 O(1) LRU 实现
 */

// ============================================================================
// 缓存接口
// ============================================================================

export interface CacheProvider {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs?: number): Promise<void>;
  delete(key: string): Promise<void>;
  clear(pattern?: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  keys(pattern: string): Promise<string[]>;
}

// ============================================================================
// LRU 双向链表节点
// ============================================================================

interface LRUNode {
  key: string;
  prev: LRUNode | null;
  next: LRUNode | null;
}

// ============================================================================
// 内存缓存实现 - O(1) LRU
// ============================================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  node: LRUNode;
}

const MAX_REGEX_CACHE_SIZE = 100;

export class MemoryCache implements CacheProvider {
  private store = new Map<string, CacheEntry<unknown>>();
  private maxSize: number;
  private regexCache = new Map<string, RegExp>();
  private prefixIndex = new Map<string, Set<string>>();

  private head: LRUNode | null = null;
  private tail: LRUNode | null = null;
  private nodeMap = new Map<string, LRUNode>();

  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
    this.startCleanup();
  }

  private extractPrefix(key: string): string | null {
    const colonIndex = key.indexOf(':');
    return colonIndex > 0 ? key.slice(0, colonIndex) : null;
  }

  private addToPrefixIndex(key: string): void {
    const prefix = this.extractPrefix(key);
    if (prefix) {
      let keys = this.prefixIndex.get(prefix);
      if (!keys) {
        keys = new Set();
        this.prefixIndex.set(prefix, keys);
      }
      keys.add(key);
    }
  }

  private removeFromPrefixIndex(key: string): void {
    const prefix = this.extractPrefix(key);
    if (prefix) {
      const keys = this.prefixIndex.get(prefix);
      if (keys) {
        keys.delete(key);
        if (keys.size === 0) {
          this.prefixIndex.delete(prefix);
        }
      }
    }
  }

  private getRegex(pattern: string): RegExp {
    const cached = this.regexCache.get(pattern);
    if (cached) {
      return cached;
    }

    if (this.regexCache.size >= MAX_REGEX_CACHE_SIZE) {
      const firstKey = this.regexCache.keys().next().value;
      if (firstKey) {
        this.regexCache.delete(firstKey);
      }
    }

    const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    this.regexCache.set(pattern, regex);
    return regex;
  }

  private moveToTail(node: LRUNode): void {
    if (node === this.tail) {
      return;
    }

    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    }

    node.prev = this.tail;
    node.next = null;

    if (this.tail) {
      this.tail.next = node;
    }
    this.tail = node;

    if (!this.head) {
      this.head = node;
    }
  }

  private removeNode(node: LRUNode): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    this.nodeMap.delete(node.key);
  }

  private addToTail(key: string): LRUNode {
    const node: LRUNode = { key, prev: null, next: null };

    if (this.tail) {
      this.tail.next = node;
      node.prev = this.tail;
    } else {
      this.head = node;
    }

    this.tail = node;
    this.nodeMap.set(key, node);
    return node;
  }

  private evictLRU(count: number): void {
    for (let i = 0; i < count && this.head; i++) {
      const oldestKey = this.head.key;
      this.store.delete(oldestKey);
      this.removeFromPrefixIndex(oldestKey);
      this.removeNode(this.head);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.removeFromPrefixIndex(key);
      this.removeNode(entry.node);
      return null;
    }

    this.moveToTail(entry.node);

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number = 60000): Promise<void> {
    const existing = this.store.get(key);

    if (existing) {
      existing.value = value;
      existing.expiresAt = Date.now() + ttlMs;
      this.moveToTail(existing.node);
      return;
    }

    if (this.store.size >= this.maxSize) {
      const removeCount = Math.max(1, Math.ceil(this.maxSize * 0.1));
      this.evictLRU(removeCount);
    }

    const node = this.addToTail(key);

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
      node,
    });

    this.addToPrefixIndex(key);
  }

  async delete(key: string): Promise<void> {
    const entry = this.store.get(key);
    if (entry) {
      this.store.delete(key);
      this.removeFromPrefixIndex(key);
      this.removeNode(entry.node);
    }
  }

  async clear(pattern?: string): Promise<void> {
    if (!pattern) {
      this.store.clear();
      this.prefixIndex.clear();
      this.nodeMap.clear();
      this.head = null;
      this.tail = null;
      return;
    }

    if (pattern.endsWith('*') && !pattern.slice(0, -1).includes('*')) {
      const prefix = pattern.slice(0, -1);
      const keys = this.prefixIndex.get(prefix);
      if (keys) {
        for (const key of keys) {
          const entry = this.store.get(key);
          if (entry) {
            this.store.delete(key);
            this.removeNode(entry.node);
          }
        }
        this.prefixIndex.delete(prefix);
        return;
      }
    }

    const regex = this.getRegex(pattern);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        const entry = this.store.get(key);
        if (entry) {
          this.store.delete(key);
          this.removeFromPrefixIndex(key);
          this.removeNode(entry.node);
        }
      }
    }
  }

  async exists(key: string): Promise<boolean> {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.removeFromPrefixIndex(key);
      this.removeNode(entry.node);
      return false;
    }
    return true;
  }

  async keys(pattern: string): Promise<string[]> {
    const result: string[] = [];
    const regex = this.getRegex(pattern);

    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        result.push(key);
      }
    }
    return result;
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.expiresAt) {
          this.store.delete(key);
          this.removeFromPrefixIndex(key);
          this.removeNode(entry.node);
        }
      }
    }, 60000);
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  get size(): number {
    return this.store.size;
  }
}

// ============================================================================
// 缓存管理器
// ============================================================================

export class CacheManager {
  private cache: CacheProvider;

  constructor(cache: CacheProvider) {
    this.cache = cache;
  }

  async get<T>(key: string): Promise<T | null> {
    return this.cache.get<T>(key);
  }

  async set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
    return this.cache.set(key, value, ttlMs);
  }

  async delete(key: string): Promise<void> {
    return this.cache.delete(key);
  }

  async clear(pattern?: string): Promise<void> {
    return this.cache.clear(pattern);
  }
}

// ============================================================================
// 默认缓存实例
// ============================================================================

export const defaultCache = new MemoryCache();
export const cacheManager = new CacheManager(defaultCache);

// ============================================================================
// 辅助函数
// ============================================================================

export function generateCacheKey(prefix: string, ...parts: unknown[]): string {
  const serialized = parts
    .map((part) => {
      if (typeof part === 'object') {
        return JSON.stringify(part);
      }
      return String(part);
    })
    .join(':');

  return `${prefix}:${serialized}`;
}
