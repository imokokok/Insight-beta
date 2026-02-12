/**
 * 离线数据同步管理器
 *
 * 管理离线状态下的数据操作队列，网络恢复后自动同步
 */

import { logger } from '@/shared/logger';

/**
 * 同步操作类型
 */
export type SyncOperationType = 'create' | 'update' | 'delete' | 'custom';

/**
 * 同步操作项
 */
export interface SyncOperation {
  /** 唯一标识 */
  id: string;
  /** 操作类型 */
  type: SyncOperationType;
  /** API 端点 */
  endpoint: string;
  /** 请求方法 */
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  /** 请求数据 */
  data?: unknown;
  /** 请求头 */
  headers?: Record<string, string>;
  /** 创建时间 */
  timestamp: number;
  /** 重试次数 */
  retryCount: number;
  /** 优先级 */
  priority: number;
  /** 自定义处理函数 */
  handler?: () => Promise<boolean>;
}

/**
 * 同步状态
 */
export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  queueLength: number;
  lastSyncTime: number | null;
  failedCount: number;
}

/**
 * 同步事件类型
 */
type SyncEventType = 'online' | 'offline' | 'syncStart' | 'syncComplete' | 'syncError';

/**
 * 同步事件监听器
 */
type SyncEventListener = (status: SyncStatus) => void;

const STORAGE_KEY = 'offline-sync-queue';
const MAX_RETRY_COUNT = 3;
const SYNC_INTERVAL = 30000; // 30秒

class OfflineSyncManager {
  private queue: SyncOperation[] = [];
  private isOnline = true;
  private isSyncing = false;
  private lastSyncTime: number | null = null;
  private listeners: Map<SyncEventType, SyncEventListener[]> = new Map();
  private syncInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.loadQueue();
    this.setupNetworkListeners();
    this.startPeriodicSync();
  }

  /**
   * 设置网络状态监听
   */
  private setupNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      this.isOnline = true;
      this.emit('online', this.getStatus());
      logger.info('Network is online, starting sync');
      this.sync();
    };

    const handleOffline = () => {
      this.isOnline = false;
      this.emit('offline', this.getStatus());
      logger.info('Network is offline, queueing operations');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 初始状态
    this.isOnline = navigator.onLine;
  }

  /**
   * 启动定期同步
   */
  private startPeriodicSync(): void {
    this.syncInterval = setInterval(() => {
      if (this.isOnline && this.queue.length > 0 && !this.isSyncing) {
        this.sync();
      }
    }, SYNC_INTERVAL);
  }

  /**
   * 停止定期同步
   */
  public stopPeriodicSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  /**
   * 添加同步操作到队列
   */
  public enqueue(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount'>): string {
    const timestamp = Date.now().toString(36);
    const randomPart =
      typeof crypto !== 'undefined' && crypto.getRandomValues
        ? Array.from(crypto.getRandomValues(new Uint8Array(5)))
            .map((b) => b.toString(36).padStart(2, '0'))
            .join('')
        : Math.random().toString(36).slice(2, 12);
    const id = `${timestamp}-${randomPart}`;
    const fullOperation: SyncOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retryCount: 0,
    };

    // 根据优先级插入队列
    const insertIndex = this.queue.findIndex((op) => op.priority < fullOperation.priority);
    if (insertIndex === -1) {
      this.queue.push(fullOperation);
    } else {
      this.queue.splice(insertIndex, 0, fullOperation);
    }

    this.saveQueue();
    logger.debug('Operation queued', { id, type: operation.type, endpoint: operation.endpoint });

    // 如果在线，立即尝试同步
    if (this.isOnline && !this.isSyncing) {
      this.sync().catch((error) => {
        logger.warn('Immediate sync failed after queue', { error });
      });
    }

    return id;
  }

  /**
   * 从队列中移除操作
   */
  public dequeue(id: string): boolean {
    const index = this.queue.findIndex((op) => op.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.saveQueue();
      return true;
    }
    return false;
  }

  /**
   * 执行同步
   */
  public async sync(): Promise<void> {
    if (!this.isOnline || this.isSyncing || this.queue.length === 0) {
      return;
    }

    this.isSyncing = true;
    this.emit('syncStart', this.getStatus());
    logger.info('Starting sync', { queueLength: this.queue.length });

    const failed: SyncOperation[] = [];

    // 按优先级处理队列
    while (this.queue.length > 0) {
      const operation = this.queue[0];
      if (!operation) break;

      try {
        const success = await this.executeOperation(operation);

        if (success) {
          this.queue.shift(); // 移除成功项
          logger.debug('Operation synced successfully', { id: operation.id });
        } else {
          operation.retryCount++;
          if (operation.retryCount >= MAX_RETRY_COUNT) {
            this.queue.shift(); // 超过重试次数，移除
            failed.push(operation);
            logger.error('Operation failed after max retries', { id: operation.id });
          } else {
            // 移到队列末尾稍后重试
            const shifted = this.queue.shift();
            if (shifted) this.queue.push(shifted);
          }
        }
      } catch (error) {
        logger.error('Sync operation error', { id: operation.id, error });
        operation.retryCount++;
        if (operation.retryCount >= MAX_RETRY_COUNT) {
          this.queue.shift();
          failed.push(operation);
        } else {
          const shifted = this.queue.shift();
          if (shifted) this.queue.push(shifted);
        }
      }

      // 每处理完一项，让出时间片
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.isSyncing = false;
    this.lastSyncTime = Date.now();
    this.saveQueue();

    const status = this.getStatus();
    status.failedCount = failed.length;
    this.emit('syncComplete', status);

    logger.info('Sync completed', {
      success: this.queue.length === 0,
      failed: failed.length,
    });

    // 保存失败的记录以便后续处理
    if (failed.length > 0) {
      this.saveFailedOperations(failed);
    }
  }

  /**
   * 执行单个操作
   */
  private async executeOperation(operation: SyncOperation): Promise<boolean> {
    // 如果有自定义处理器，使用它
    if (operation.handler) {
      return operation.handler();
    }

    try {
      const response = await fetch(operation.endpoint, {
        method: operation.method,
        headers: {
          'Content-Type': 'application/json',
          'X-Offline-Sync': 'true',
          ...operation.headers,
        },
        body: operation.data ? JSON.stringify(operation.data) : undefined,
      });

      return response.ok;
    } catch (error) {
      logger.error('Operation execution failed', { id: operation.id, error });
      return false;
    }
  }

  /**
   * 保存队列到 localStorage
   */
  private saveQueue(): void {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
    } catch (error) {
      logger.error('Failed to save sync queue', { error });
    }
  }

  /**
   * 从 localStorage 加载队列
   */
  private loadQueue(): void {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.queue = JSON.parse(stored);
        logger.info('Loaded sync queue', { length: this.queue.length });
      }
    } catch (error) {
      logger.error('Failed to load sync queue', { error });
    }
  }

  /**
   * 保存失败的操作
   */
  private saveFailedOperations(failed: SyncOperation[]): void {
    if (typeof window === 'undefined') return;
    try {
      const key = `${STORAGE_KEY}-failed`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      localStorage.setItem(key, JSON.stringify([...existing, ...failed]));
    } catch (error) {
      logger.error('Failed to save failed operations', { error });
    }
  }

  /**
   * 获取同步状态
   */
  public getStatus(): SyncStatus {
    return {
      isOnline: this.isOnline,
      isSyncing: this.isSyncing,
      queueLength: this.queue.length,
      lastSyncTime: this.lastSyncTime,
      failedCount: 0,
    };
  }

  /**
   * 获取队列长度
   */
  public getQueueLength(): number {
    return this.queue.length;
  }

  /**
   * 清空队列
   */
  public clearQueue(): void {
    this.queue = [];
    this.saveQueue();
    logger.info('Sync queue cleared');
  }

  /**
   * 注册事件监听器
   */
  public on(event: SyncEventType, listener: SyncEventListener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);

    // 返回取消订阅函数
    return () => {
      const listeners = this.listeners.get(event);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      }
    };
  }

  /**
   * 触发事件
   */
  private emit(event: SyncEventType, status: SyncStatus): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((listener) => listener(status));
    }
  }
}

// 单例实例
let syncManager: OfflineSyncManager | null = null;

export function getSyncManager(): OfflineSyncManager {
  if (!syncManager) {
    syncManager = new OfflineSyncManager();
  }
  return syncManager;
}

export { OfflineSyncManager };
export default getSyncManager;
