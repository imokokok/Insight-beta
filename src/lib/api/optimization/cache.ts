/**
 * API Cache - API 响应缓存
 *
 * 提供内存缓存支持
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
// 内存缓存实现
// ============================================================================

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class MemoryCache implements CacheProvider {
  private store = new Map<string, CacheEntry<unknown>>();
  private accessOrder: string[] = []; // 访问顺序列表，用于 LRU
  private maxSize: number;
  private regexCache = new Map<string, RegExp>(); // 缓存编译后的正则表达式
  private prefixIndex = new Map<string, Set<string>>(); // 前缀索引，用于快速清除

  constructor(maxSize: number = 1000) {
    this.maxSize = maxSize;
    this.startCleanup();
  }

  /**
   * 提取 key 的前缀（冒号分隔的第一部分）
   */
  private extractPrefix(key: string): string | null {
    const colonIndex = key.indexOf(':');
    return colonIndex > 0 ? key.slice(0, colonIndex) : null;
  }

  /**
   * 更新前缀索引
   */
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

  /**
   * 从前缀索引中移除
   */
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

  /**
   * 获取或创建正则表达式（带缓存）
   */
  private getRegex(pattern: string): RegExp {
    const cached = this.regexCache.get(pattern);
    if (cached) {
      return cached;
    }
    // eslint-disable-next-line security/detect-non-literal-regexp
    const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    this.regexCache.set(pattern, regex);
    return regex;
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.store.get(key);

    if (!entry) {
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      this.removeFromAccessOrder(key);
      return null;
    }

    // 更新访问顺序（LRU）
    this.updateAccessOrder(key);

    return entry.value as T;
  }

  async set<T>(key: string, value: T, ttlMs: number = 60000): Promise<void> {
    // 如果 key 已存在，先更新访问顺序
    if (this.store.has(key)) {
      this.updateAccessOrder(key);
    } else if (this.store.size >= this.maxSize) {
      // 使用 LRU 策略清理最久未使用的条目
      const removeCount = Math.max(1, Math.ceil(this.maxSize * 0.1));
      for (let i = 0; i < removeCount; i++) {
        const oldestKey = this.accessOrder.shift(); // 从队列头部移除最旧的
        if (oldestKey) {
          this.store.delete(oldestKey);
          this.removeFromPrefixIndex(oldestKey);
        } else {
          break;
        }
      }
    }

    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });

    // 添加到访问顺序列表（新条目放在末尾）
    if (!this.accessOrder.includes(key)) {
      this.accessOrder.push(key);
    }

    // 更新前缀索引
    this.addToPrefixIndex(key);
  }

  /**
   * 更新访问顺序（将 key 移到列表末尾）
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * 从访问顺序列表中移除 key
   */
  private removeFromAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
    this.removeFromPrefixIndex(key);
  }

  async clear(pattern?: string): Promise<void> {
    if (!pattern) {
      this.store.clear();
      this.prefixIndex.clear();
      return;
    }

    // 如果 pattern 是简单的前缀（如 "price:"），使用索引快速清除
    if (pattern.endsWith('*') && !pattern.slice(0, -1).includes('*')) {
      const prefix = pattern.slice(0, -1);
      const keys = this.prefixIndex.get(prefix);
      if (keys) {
        keys.forEach((key) => this.store.delete(key));
        this.prefixIndex.delete(prefix);
        return;
      }
    }

    // 回退到正则匹配
    const regex = this.getRegex(pattern);
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        this.removeFromPrefixIndex(key);
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
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store.entries()) {
        if (now > entry.expiresAt) {
          this.store.delete(key);
          this.removeFromPrefixIndex(key);
        }
      }
    }, 60000); // 每分钟清理一次
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

/**
 * 生成缓存键
 */
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
