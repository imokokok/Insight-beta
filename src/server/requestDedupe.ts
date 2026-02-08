import { logger } from '@/lib/logger';

interface PendingRequest {
  promise: Promise<unknown>;
  createdAt: number;
  count: number;
}

const pendingRequests = new Map<string, PendingRequest>();
const MAX_PENDING_AGE_MS = 30_000;
const MAX_CONCURRENT_REQUESTS = 50;
const MAX_PENDING_REQUESTS = 1000; // 最大pending请求数限制

let concurrentCount = 0;
const requestQueue: (() => void)[] = [];
let cleanupTimer: NodeJS.Timeout | null = null;

function processQueue() {
  while (concurrentCount < MAX_CONCURRENT_REQUESTS && requestQueue.length > 0) {
    const next = requestQueue.shift();
    if (next) {
      concurrentCount++;
      next();
    }
  }
}

export function deduplicateRequest<T>(
  key: string,
  factory: () => Promise<T>,
  ttlMs: number = 5000,
): Promise<T> {
  const now = Date.now();

  // 检查pending请求数量限制
  if (pendingRequests.size >= MAX_PENDING_REQUESTS) {
    // 清理最旧的请求
    cleanupOldestRequests(Math.floor(MAX_PENDING_REQUESTS * 0.2));
    logger.warn('Pending requests limit reached, cleaned up oldest entries', {
      currentSize: pendingRequests.size,
      maxSize: MAX_PENDING_REQUESTS,
    });
  }

  const existing = pendingRequests.get(key);
  if (existing) {
    const age = now - existing.createdAt;
    if (age < ttlMs) {
      existing.count++;
      return existing.promise as Promise<T>;
    }
    pendingRequests.delete(key);
  }

  if (concurrentCount >= MAX_CONCURRENT_REQUESTS) {
    return new Promise((resolve, reject) => {
      requestQueue.push(() => {
        executeDeduplicated(key, factory, resolve, reject);
      });
    });
  }

  concurrentCount++;
  return new Promise((resolve, reject) => {
    executeDeduplicated(key, factory, resolve, reject);
  });
}

function executeDeduplicated<T>(
  key: string,
  factory: () => Promise<T>,
  resolve: (value: T) => void,
  reject: (error: unknown) => void,
): void {
  const startTime = Date.now();
  const promise = factory()
    .then((result) => {
      const duration = Date.now() - startTime;
      cleanupExpiredRequests();

      if (duration > 1000) {
        logger.debug('Slow deduplicated request', { key, durationMs: duration });
      }

      concurrentCount--;
      processQueue();
      resolve(result);
      return result;
    })
    .catch((error) => {
      cleanupExpiredRequests();
      concurrentCount--;
      processQueue();
      reject(error);
      throw error;
    });

  pendingRequests.set(key, {
    promise,
    createdAt: Date.now(),
    count: 1,
  });
}

function cleanupExpiredRequests(): void {
  const now = Date.now();
  const expiredKeys: string[] = [];

  for (const [key, pending] of pendingRequests.entries()) {
    if (now - pending.createdAt > MAX_PENDING_AGE_MS) {
      expiredKeys.push(key);
    }
  }

  for (const key of expiredKeys) {
    pendingRequests.delete(key);
  }
}

function cleanupOldestRequests(count: number): void {
  const sorted = Array.from(pendingRequests.entries()).sort(
    (a, b) => a[1].createdAt - b[1].createdAt,
  );
  for (let i = 0; i < Math.min(count, sorted.length); i++) {
    const entry = sorted[i];
    if (entry) {
      pendingRequests.delete(entry[0]);
    }
  }
}

function startCleanupTimer(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    cleanupExpiredRequests();

    const stats = {
      pending: pendingRequests.size,
      concurrent: concurrentCount,
      queued: requestQueue.length,
    };

    if (stats.pending > 100 || stats.queued > 10) {
      logger.warn('High request deduplication stats', stats);
    }
  }, 10_000);
}

export function stopCleanupTimer(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}

// 启动清理定时器
startCleanupTimer();

export function getRequestStats(): {
  pending: number;
  concurrent: number;
  queued: number;
} {
  return {
    pending: pendingRequests.size,
    concurrent: concurrentCount,
    queued: requestQueue.length,
  };
}
