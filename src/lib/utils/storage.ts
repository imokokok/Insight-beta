/**
 * Storage Manager - 统一存储管理器
 *
 * 提供 localStorage/sessionStorage 的安全封装
 * - 存储配额检查
 * - 自动清理过期数据
 * - 错误处理
 * - 敏感数据加密建议
 */

import { logger } from '@/lib/logger';

export interface StorageOptions {
  /** 过期时间（毫秒） */
  expires?: number;
  /** 是否使用 sessionStorage */
  session?: boolean;
  /** 存储前缀 */
  prefix?: string;
}

export interface StorageItem<T> {
  value: T;
  timestamp: number;
  expires?: number;
}

const DEFAULT_PREFIX = 'oracle_';
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // 5MB 限制
const CLEANUP_THRESHOLD = 0.8; // 80% 时触发清理

class StorageManager {
  private prefix: string;
  private maxSize: number;

  constructor(prefix: string = DEFAULT_PREFIX, maxSize: number = MAX_STORAGE_SIZE) {
    this.prefix = prefix;
    this.maxSize = maxSize;
  }

  /**
   * 获取存储实例
   */
  private getStorage(session: boolean = false): Storage {
    return session ? sessionStorage : localStorage;
  }

  /**
   * 生成完整 key
   */
  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * 计算当前存储大小
   */
  private getSize(session: boolean = false): number {
    const storage = this.getStorage(session);
    let size = 0;
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(this.prefix)) {
        size += storage.getItem(key)?.length || 0;
      }
    }
    return size * 2; // UTF-16 编码，每个字符 2 字节
  }

  /**
   * 检查存储是否即将满
   */
  private isNearFull(session: boolean = false): boolean {
    return this.getSize(session) > this.maxSize * CLEANUP_THRESHOLD;
  }

  /**
   * 清理过期数据
   */
  private cleanup(session: boolean = false): void {
    const storage = this.getStorage(session);
    const now = Date.now();
    const keysToRemove: string[] = [];

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key?.startsWith(this.prefix)) continue;

      try {
        const item = JSON.parse(storage.getItem(key) || '{}') as StorageItem<unknown>;
        if (item.expires && item.expires < now) {
          keysToRemove.push(key);
        }
      } catch {
        // 解析失败，标记为待删除
        keysToRemove.push(key);
      }
    }

    // 删除过期数据
    keysToRemove.forEach((key) => {
      storage.removeItem(key);
    });

    if (keysToRemove.length > 0) {
      logger.debug('Storage cleanup completed', { removed: keysToRemove.length });
    }
  }

  /**
   * 设置存储项
   */
  set<T>(key: string, value: T, options: StorageOptions = {}): boolean {
    const { expires, session = false } = options;
    const fullKey = this.getKey(key);
    const storage = this.getStorage(session);

    try {
      // 检查并清理
      if (this.isNearFull(session)) {
        this.cleanup(session);
      }

      const item: StorageItem<T> = {
        value,
        timestamp: Date.now(),
        expires: expires ? Date.now() + expires : undefined,
      };

      const serialized = JSON.stringify(item);

      // 检查单个项大小
      if (serialized.length * 2 > this.maxSize * 0.1) {
        logger.warn('Storage item too large', { key, size: serialized.length });
        return false;
      }

      storage.setItem(fullKey, serialized);
      return true;
    } catch (error) {
      logger.error('Storage set failed', { key, error });
      return false;
    }
  }

  /**
   * 获取存储项
   */
  get<T>(key: string, options: StorageOptions = {}): T | null {
    const { session = false } = options;
    const fullKey = this.getKey(key);
    const storage = this.getStorage(session);

    try {
      const data = storage.getItem(fullKey);
      if (!data) return null;

      const item = JSON.parse(data) as StorageItem<T>;

      // 检查是否过期
      if (item.expires && item.expires < Date.now()) {
        storage.removeItem(fullKey);
        return null;
      }

      return item.value;
    } catch (error) {
      logger.error('Storage get failed', { key, error });
      return null;
    }
  }

  /**
   * 移除存储项
   */
  remove(key: string, options: StorageOptions = {}): void {
    const { session = false } = options;
    const fullKey = this.getKey(key);
    const storage = this.getStorage(session);

    try {
      storage.removeItem(fullKey);
    } catch (error) {
      logger.error('Storage remove failed', { key, error });
    }
  }

  /**
   * 清空所有带前缀的存储项
   */
  clear(session: boolean = false): void {
    const storage = this.getStorage(session);
    const keysToRemove: string[] = [];

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key?.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      storage.removeItem(key);
    });

    logger.debug('Storage cleared', { count: keysToRemove.length, session });
  }

  /**
   * 获取存储信息
   */
  getInfo(session: boolean = false): { size: number; maxSize: number; usage: number } {
    const size = this.getSize(session);
    return {
      size,
      maxSize: this.maxSize,
      usage: size / this.maxSize,
    };
  }

  /**
   * 检查是否存在
   */
  has(key: string, options: StorageOptions = {}): boolean {
    return this.get(key, options) !== null;
  }
}

// 默认实例
export const storage = new StorageManager();

// 特定用途的存储实例
export const appStorage = new StorageManager('oracle_app_');
export const userStorage = new StorageManager('oracle_user_');
export const cacheStorage = new StorageManager('oracle_cache_', 2 * 1024 * 1024); // 2MB for cache

/**
 * React Hook: 使用存储
 */
export function useStorage<T>(
  key: string,
  defaultValue: T,
  options: StorageOptions = {},
): [T, (value: T) => void, () => void] {
  const { session = false } = options;
  const storageInstance = session ? cacheStorage : appStorage;

  const getValue = (): T => {
    const stored = storageInstance.get<T>(key, options);
    return stored !== null ? stored : defaultValue;
  };

  const setValue = (value: T): void => {
    storageInstance.set(key, value, options);
  };

  const removeValue = (): void => {
    storageInstance.remove(key, options);
  };

  return [getValue(), setValue, removeValue];
}

export default StorageManager;
