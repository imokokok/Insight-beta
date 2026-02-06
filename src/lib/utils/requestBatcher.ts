/**
 * Request Batcher - 请求批处理和去重工具
 *
 * 提供以下功能：
 * 1. 请求去重 - 相同 key 的请求合并为一个
 * 2. 请求批处理 - 批量执行请求
 * 3. 并发控制 - 限制同时执行的请求数量
 */

export interface BatcherOptions {
  /** 最大并发数 */
  concurrencyLimit?: number;
  /** 批处理延迟（毫秒） */
  batchDelayMs?: number;
  /** 最大批处理大小 */
  maxBatchSize?: number;
}

interface PendingRequest<T> {
  key: string;
  fn: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  timestamp: number;
}

/**
 * 请求批处理器
 */
export class RequestBatcher {
  private pendingRequests = new Map<string, PendingRequest<unknown>>();
  private executingRequests = new Map<string, Promise<unknown>>();
  private runningCount = 0;
  private batchTimer: NodeJS.Timeout | null = null;

  private readonly concurrencyLimit: number;
  private readonly batchDelayMs: number;
  private readonly maxBatchSize: number;

  constructor(options: BatcherOptions = {}) {
    this.concurrencyLimit = options.concurrencyLimit ?? 5;
    this.batchDelayMs = options.batchDelayMs ?? 10;
    this.maxBatchSize = options.maxBatchSize ?? 100;
  }

  /**
   * 执行请求（自动去重）
   */
  async execute<T>(key: string, fn: () => Promise<T>): Promise<T> {
    // 检查是否已有相同 key 的请求正在执行
    const executing = this.executingRequests.get(key);
    if (executing) {
      return executing as Promise<T>;
    }

    // 检查是否已有相同 key 的请求在等待
    const pending = this.pendingRequests.get(key);
    if (pending) {
      return new Promise((resolve, reject) => {
        const originalResolve = pending.resolve;
        const originalReject = pending.reject;

        pending.resolve = (value: unknown) => {
          originalResolve(value);
          resolve(value as T);
        };
        pending.reject = (error: Error) => {
          originalReject(error);
          reject(error);
        };
      });
    }

    // 创建新的请求
    return new Promise((resolve, reject) => {
      const request: PendingRequest<T> = {
        key,
        fn,
        resolve: resolve as (value: unknown) => void,
        reject,
        timestamp: Date.now(),
      };

      this.pendingRequests.set(key, request as PendingRequest<unknown>);
      this.scheduleBatch();
    });
  }

  /**
   * 批量执行函数
   */
  async executeBatch<T, R>(
    items: T[],
    fn: (item: T) => Promise<R>,
    options?: {
      concurrencyLimit?: number;
      onProgress?: (completed: number, total: number) => void;
    },
  ): Promise<PromiseSettledResult<R>[]> {
    const limit = options?.concurrencyLimit ?? this.concurrencyLimit;
    const results: PromiseSettledResult<R>[] = [];
    const executing: Promise<void>[] = [];
    let completed = 0;

    for (let i = 0; i < items.length; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const item = items[i]!;
      const promise = fn(item).then(
        (value): PromiseSettledResult<R> => {
          completed++;
          options?.onProgress?.(completed, items.length);
          return { status: 'fulfilled', value };
        },
        (reason): PromiseSettledResult<R> => {
          completed++;
          options?.onProgress?.(completed, items.length);
          return { status: 'rejected', reason };
        },
      );

      results.push(promise as unknown as PromiseSettledResult<R>);

      const execution = promise.then(() => {});
      executing.push(execution);

      if (executing.length >= limit) {
        await Promise.race(executing);
        const index = executing.findIndex((p) => p === execution);
        if (index !== -1) {
          executing.splice(index, 1);
        }
      }
    }

    return Promise.all(results);
  }

  /**
   * 清空所有待处理请求
   */
  clear(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    for (const request of this.pendingRequests.values()) {
      request.reject(new Error('Batcher cleared'));
    }
    this.pendingRequests.clear();
  }

  /**
   * 获取当前状态
   */
  getStatus(): {
    pendingCount: number;
    executingCount: number;
    runningCount: number;
  } {
    return {
      pendingCount: this.pendingRequests.size,
      executingCount: this.executingRequests.size,
      runningCount: this.runningCount,
    };
  }

  private scheduleBatch(): void {
    if (this.batchTimer) return;

    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      this.processBatch();
    }, this.batchDelayMs);
  }

  private async processBatch(): Promise<void> {
    if (this.pendingRequests.size === 0) return;
    if (this.runningCount >= this.concurrencyLimit) {
      this.scheduleBatch();
      return;
    }

    // 获取一批请求
    const batch: PendingRequest<unknown>[] = [];
    for (const request of this.pendingRequests.values()) {
      if (batch.length >= this.maxBatchSize) break;
      batch.push(request);
    }

    // 从待处理队列中移除
    for (const request of batch) {
      this.pendingRequests.delete(request.key);
    }

    // 执行请求
    await Promise.all(
      batch.map(async (request) => {
        this.runningCount++;
        this.executingRequests.set(request.key, Promise.resolve());

        try {
          const result = await request.fn();
          request.resolve(result);
        } catch (error) {
          request.reject(error instanceof Error ? error : new Error(String(error)));
        } finally {
          this.runningCount--;
          this.executingRequests.delete(request.key);
        }
      }),
    );

    // 如果还有待处理的请求，继续处理
    if (this.pendingRequests.size > 0) {
      this.scheduleBatch();
    }
  }
}

/**
 * 创建请求去重包装器
 */
export function withDeduplication<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  keyGenerator?: (...args: Parameters<T>) => string,
): T {
  const pendingRequests = new Map<string, Promise<unknown>>();

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const key = keyGenerator ? keyGenerator(...args) : JSON.stringify(args);

    const existing = pendingRequests.get(key);
    if (existing) {
      return existing as ReturnType<T>;
    }

    const promise = fn(...args).finally(() => {
      pendingRequests.delete(key);
    });

    pendingRequests.set(key, promise);
    return promise as ReturnType<T>;
  }) as T;
}

/**
 * 创建带并发限制的函数包装器
 */
export function withConcurrencyLimit<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  limit: number,
): T {
  let running = 0;
  const queue: Array<{
    args: Parameters<T>;
    resolve: (value: ReturnType<T>) => void;
    reject: (error: Error) => void;
  }> = [];

  const runNext = async (): Promise<void> => {
    if (running >= limit || queue.length === 0) return;

    running++;
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { args, resolve, reject } = queue.shift()!;

    try {
      const result = await fn(...args);
      resolve(result as ReturnType<T>);
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    } finally {
      running--;
      runNext();
    }
  };

  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    return new Promise((resolve, reject) => {
      queue.push({
        args,
        resolve: (value) => resolve(value as Awaited<ReturnType<T>>),
        reject,
      });
      runNext();
    }) as Promise<ReturnType<T>>;
  }) as T;
}

// 默认批处理器实例
export const defaultBatcher = new RequestBatcher();
