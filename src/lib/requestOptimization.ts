import { useCallback, useRef, useEffect } from "react";

const pendingRequests = new Map<string, Promise<unknown>>();

export function deduplicateRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
): Promise<T> {
  const existing = pendingRequests.get(key);
  if (existing) {
    return existing as Promise<T>;
  }

  const promise = fetcher()
    .finally(() => {
      pendingRequests.delete(key);
    })
    .catch((error) => {
      pendingRequests.delete(key);
      throw error;
    });

  pendingRequests.set(key, promise);
  return promise;
}

export function useRequestDeduplication() {
  const pendingRef = useRef(new Map<string, Promise<unknown>>());

  const deduplicate = useCallback(
    <T>(key: string, fetcher: () => Promise<T>): Promise<T> => {
      const pending = pendingRef.current;
      const existing = pending.get(key);
      if (existing) {
        return existing as Promise<T>;
      }

      const promise = fetcher()
        .finally(() => {
          pending.delete(key);
        })
        .catch((error) => {
          pending.delete(key);
          throw error;
        });

      pending.set(key, promise);
      return promise;
    },
    [],
  );

  return deduplicate;
}

export function useDebounce<T extends (...args: unknown[]) => void>(
  callback: T,
  delay: number,
): T {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    }) as T,
    [delay],
  );
}

export function useThrottle<T extends (...args: unknown[]) => void>(
  callback: T,
  limit: number,
): T {
  const lastRanRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    ((...args) => {
      const now = Date.now();
      if (now - lastRanRef.current >= limit) {
        callbackRef.current(...args);
        lastRanRef.current = now;
      } else {
        if (timeoutRef.current) {
          return;
        }
        timeoutRef.current = setTimeout(
          () => {
            callbackRef.current(...args);
            lastRanRef.current = Date.now();
            timeoutRef.current = null;
          },
          limit - (now - lastRanRef.current),
        );
      }
    }) as T,
    [limit],
  );
}

export function useStableCallback<
  T extends (...args: unknown[]) => ReturnType<T>,
>(callback: T): T {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  return useCallback(
    ((...args) => {
      return callbackRef.current(...args);
    }) as T,
    [],
  );
}

export function batched<T>(items: T[], batchSize: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }
  return batches;
}

export function createPrefetchLink(href: string) {
  if (typeof document === "undefined") return;

  const link = document.createElement("link");
  link.rel = "prefetch";
  link.href = href;
  link.as = "document";
  document.head.appendChild(link);

  setTimeout(() => {
    document.head.removeChild(link);
  }, 5000);
}

export function preloadImage(src: string) {
  if (typeof window === "undefined") return;

  const img = new window.Image();
  img.src = src;
}

export function getCacheKey(...parts: unknown[]): string {
  return parts
    .map((part) => {
      if (typeof part === "string") return part;
      if (typeof part === "number") return part.toString();
      if (typeof part === "boolean") return String(part);
      if (part === null) return "null";
      if (part === undefined) return "undefined";
      if (Array.isArray(part)) return part.map(getCacheKey).join(",");
      if (typeof part === "object") {
        try {
          return JSON.stringify(part);
        } catch {
          return "";
        }
      }
      return String(part);
    })
    .join(":");
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();

export function setMemoryCache<T>(key: string, data: T, ttl: number = 300000) {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

export function getMemoryCache<T>(key: string): T | null {
  const entry = memoryCache.get(key) as CacheEntry<T> | undefined;
  if (!entry) return null;

  if (Date.now() - entry.timestamp > entry.ttl) {
    memoryCache.delete(key);
    return null;
  }

  return entry.data;
}

export function clearMemoryCache(pattern?: string) {
  if (!pattern) {
    memoryCache.clear();
    return;
  }

  try {
    // eslint-disable-next-line security/detect-non-literal-regexp
    const regex = new RegExp(pattern);
    for (const key of memoryCache.keys()) {
      if (regex.test(key)) {
        memoryCache.delete(key);
      }
    }
  } catch {
    for (const key of memoryCache.keys()) {
      if (key.includes(pattern)) {
        memoryCache.delete(key);
      }
    }
  }
}

export function preloadCriticalResources() {
  if (typeof document === "undefined") return;

  const criticalPaths = ["/oracle", "/disputes", "/alerts"];
  criticalPaths.forEach((path) => {
    const link = document.createElement("link");
    link.rel = "prefetch";
    link.href = path;
    link.as = "document";
    link.setAttribute("fetchpriority", "high");
    document.head.appendChild(link);

    setTimeout(() => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    }, 10000);
  });
}
