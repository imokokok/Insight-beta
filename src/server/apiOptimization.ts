import { logger } from '@/lib/logger';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// Request deduplication with TTL
interface DedupeEntry<T> {
  promise: Promise<T>;
  timestamp: number;
  ttl: number;
}

const dedupeCache = new Map<string, DedupeEntry<unknown>>();
const DEFAULT_DEDUPE_TTL = 5000; // 5 seconds

export async function dedupeRequest<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = DEFAULT_DEDUPE_TTL,
): Promise<T> {
  const now = Date.now();
  const existing = dedupeCache.get(key);

  // Check if existing request is still valid
  if (existing && now - existing.timestamp < existing.ttl) {
    return existing.promise as Promise<T>;
  }

  // Create new request
  const promise = fetcher().finally(() => {
    // Clean up after TTL expires
    setTimeout(() => {
      dedupeCache.delete(key);
    }, ttl);
  });

  dedupeCache.set(key, {
    promise,
    timestamp: now,
    ttl,
  });

  return promise;
}

export function clearDedupeCache(pattern?: string): void {
  if (!pattern) {
    dedupeCache.clear();
    return;
  }

  for (const key of dedupeCache.keys()) {
    if (key.includes(pattern)) {
      dedupeCache.delete(key);
    }
  }
}

// Enhanced rate limiting with sliding window
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyPrefix?: string;
}

export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `${config.keyPrefix || 'ratelimit'}:${identifier}`;
  const entry = rateLimitStore.get(key);

  if (!entry || now - entry.windowStart > config.windowMs) {
    // New window
    rateLimitStore.set(key, {
      count: 1,
      windowStart: now,
    });
    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: now + config.windowMs,
    };
  }

  // Existing window
  if (entry.count >= config.maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.windowStart + config.windowMs,
    };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - entry.count,
    resetTime: entry.windowStart + config.windowMs,
  };
}

// Request/Response compression
export function compressResponse(data: unknown): {
  data: unknown;
  compressed: boolean;
  originalSize: number;
} {
  const jsonString = JSON.stringify(data);
  const originalSize = Buffer.byteLength(jsonString, 'utf8');

  // Only compress if data is large enough
  if (originalSize < 1024) {
    return { data, compressed: false, originalSize };
  }

  // In production, use zlib for actual compression
  // For now, just return the data with metadata
  return {
    data,
    compressed: false,
    originalSize,
  };
}

// API response caching
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  etag: string;
}

const apiCache = new Map<string, CacheEntry<unknown>>();

export function generateETag(data: unknown): string {
  // Simple hash function for ETag generation
  const str = JSON.stringify(data);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return `"${Math.abs(hash).toString(16)}"`;
}

export async function cachedApiResponse<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  ttl: number = 60000,
  req?: NextRequest,
): Promise<NextResponse> {
  const now = Date.now();
  const cached = apiCache.get(cacheKey);

  // Check if client has valid cached version
  if (req && cached) {
    const ifNoneMatch = req.headers.get('if-none-match');
    if (ifNoneMatch === cached.etag && now - cached.timestamp < ttl) {
      return new NextResponse(null, { status: 304 });
    }
  }

  // Return cached data if still valid
  if (cached && now - cached.timestamp < ttl) {
    return NextResponse.json(cached.data, {
      headers: {
        ETag: cached.etag,
        'Cache-Control': `private, max-age=${Math.floor(ttl / 1000)}`,
        'X-Cache': 'HIT',
      },
    });
  }

  // Fetch fresh data
  try {
    const data = await fetcher();
    const etag = generateETag(data);

    apiCache.set(cacheKey, {
      data,
      timestamp: now,
      etag,
    });

    return NextResponse.json(data, {
      headers: {
        ETag: etag,
        'Cache-Control': `private, max-age=${Math.floor(ttl / 1000)}`,
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    // Return stale data if available
    if (cached) {
      logger.warn('Returning stale cache due to fetch error', { cacheKey, error });
      return NextResponse.json(cached.data, {
        headers: {
          ETag: cached.etag,
          'Cache-Control': 'private, max-age=0',
          'X-Cache': 'STALE',
        },
      });
    }
    throw error;
  }
}

export function invalidateApiCache(pattern: string): number {
  let count = 0;
  for (const key of apiCache.keys()) {
    if (key.includes(pattern)) {
      apiCache.delete(key);
      count++;
    }
  }
  return count;
}

// Batch request processing
interface BatchRequest {
  id: string;
  method: string;
  path: string;
  body?: unknown;
}

interface BatchResponse {
  id: string;
  status: number;
  data?: unknown;
  error?: string;
}

export async function processBatchRequests(
  requests: BatchRequest[],
  handlers: Record<string, (req: BatchRequest) => Promise<unknown>>,
): Promise<BatchResponse[]> {
  const results = await Promise.allSettled(
    requests.map(async (req) => {
      const handler = handlers[req.path];
      if (!handler) {
        return {
          id: req.id,
          status: 404,
          error: 'Not found',
        };
      }

      try {
        const data = await handler(req);
        return {
          id: req.id,
          status: 200,
          data,
        };
      } catch (error) {
        return {
          id: req.id,
          status: 500,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }),
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    }
    const request = requests[index];
    return {
      id: request?.id ?? `unknown-${index}`,
      status: 500,
      error: 'Request failed',
    };
  });
}

// Pagination optimization
interface PaginationParams {
  page: number;
  pageSize: number;
  cursor?: string;
}

interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total?: number;
    hasMore: boolean;
    nextCursor?: string;
  };
}

export function paginateResults<T>(
  items: T[],
  params: PaginationParams,
  options: {
    maxPageSize?: number;
    cursorExtractor?: (item: T) => string;
  } = {},
): PaginatedResult<T> {
  const maxPageSize = options.maxPageSize || 100;
  const pageSize = Math.min(params.pageSize, maxPageSize);
  const page = Math.max(1, params.page);

  let startIndex = (page - 1) * pageSize;
  let endIndex = startIndex + pageSize;

  // Handle cursor-based pagination
  if (params.cursor && options.cursorExtractor) {
    const extractor = options.cursorExtractor;
    const cursorIndex = items.findIndex((item) => extractor(item) === params.cursor);
    if (cursorIndex !== -1) {
      startIndex = cursorIndex + 1;
      endIndex = startIndex + pageSize;
    }
  }

  const data = items.slice(startIndex, endIndex);
  const hasMore = endIndex < items.length;

  return {
    data,
    pagination: {
      page,
      pageSize,
      hasMore,
      nextCursor:
        hasMore && options.cursorExtractor && data.length > 0
          ? options.cursorExtractor(data[data.length - 1] as T)
          : undefined,
    },
  };
}

// Request validation with caching
const validationCache = new Map<string, boolean>();

export function validateRequest<T>(
  data: unknown,
  validator: (data: unknown) => data is T,
  cacheKey?: string,
): { valid: boolean; data?: T; error?: string } {
  // Check validation cache
  if (cacheKey && validationCache.has(cacheKey)) {
    return { valid: true, data: data as T };
  }

  if (!validator(data)) {
    return { valid: false, error: 'Invalid request data' };
  }

  // Cache successful validation
  if (cacheKey) {
    validationCache.set(cacheKey, true);
    // Clear cache after 5 minutes
    setTimeout(() => validationCache.delete(cacheKey), 300000);
  }

  return { valid: true, data: data as T };
}

// API middleware chain
export type ApiMiddleware = (
  req: NextRequest,
  next: () => Promise<NextResponse>,
) => Promise<NextResponse>;

export function createMiddlewareChain(...middlewares: ApiMiddleware[]) {
  return async (req: NextRequest, handler: () => Promise<NextResponse>): Promise<NextResponse> => {
    let index = 0;

    const next = async (): Promise<NextResponse> => {
      if (index < middlewares.length) {
        const middleware = middlewares[index++];
        if (middleware) {
          return middleware(req, next);
        }
      }
      return handler();
    };

    return next();
  };
}

// Performance monitoring middleware
export function performanceMiddleware(
  req: NextRequest,
  next: () => Promise<NextResponse>,
): Promise<NextResponse> {
  const start = performance.now();

  return next().then((response) => {
    const duration = performance.now() - start;
    const path = new URL(req.url).pathname;

    // Log slow requests
    if (duration > 1000) {
      logger.warn('Slow API request', {
        path,
        method: req.method,
        duration: `${duration.toFixed(2)}ms`,
      });
    }

    // Add performance headers
    response.headers.set('X-Response-Time', `${duration.toFixed(2)}ms`);

    return response;
  });
}

// CORS middleware
export function corsMiddleware(allowedOrigins: string[] = ['*']): ApiMiddleware {
  return async (req: NextRequest, next: () => Promise<NextResponse>) => {
    const origin = req.headers.get('origin') || '';
    const allowed = allowedOrigins.includes('*') || allowedOrigins.includes(origin);

    if (req.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': allowed ? origin : '',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const response = await next();

    if (allowed) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return response;
  };
}

// Request size limit middleware
export function sizeLimitMiddleware(
  maxSize: number = 10 * 1024 * 1024, // 10MB
): ApiMiddleware {
  return async (req: NextRequest, next: () => Promise<NextResponse>) => {
    const contentLength = parseInt(req.headers.get('content-length') || '0');

    if (contentLength > maxSize) {
      return NextResponse.json({ error: 'Request entity too large' }, { status: 413 });
    }

    return next();
  };
}

// API versioning
export function extractApiVersion(path: string): { version: string; path: string } {
  const match = path.match(/^\/api\/v(\d+)\//);
  if (match && match[1]) {
    return {
      version: match[1],
      path: path.replace(/^\/api\/v\d+/, '/api'),
    };
  }
  return { version: '1', path };
}

// Health check endpoint
export function createHealthCheckHandler(checks: Record<string, () => Promise<boolean>>) {
  return async (): Promise<NextResponse> => {
    const results = await Promise.all(
      Object.entries(checks).map(async ([name, check]) => ({
        name,
        healthy: await check(),
      })),
    );

    const allHealthy = results.every((r) => r.healthy);

    return NextResponse.json(
      {
        status: allHealthy ? 'healthy' : 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: results,
      },
      { status: allHealthy ? 200 : 503 },
    );
  };
}

// Export all utilities
export { dedupeCache, rateLimitStore, apiCache, validationCache };
