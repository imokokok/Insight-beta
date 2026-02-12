/**
 * Rate Limiter Service
 *
 * Provides API rate limiting functionality
 * for Oracle Monitor platform
 */

import { logger } from '@/shared/logger';

// ============================================================================
// Types
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyPrefix?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  info: RateLimitInfo;
  retryAfter?: number;
}

// ============================================================================
// Rate Limiter
// ============================================================================

export class RateLimiter {
  private static instance: RateLimiter;
  private requests: Map<string, number[]> = new Map();
  private readonly defaultConfig: RateLimitConfig = {
    windowMs: 60000, // 1 minute
    maxRequests: 100,
    keyPrefix: 'ratelimit:',
  };

  private constructor() {}

  static getInstance(): RateLimiter {
    if (!RateLimiter.instance) {
      RateLimiter.instance = new RateLimiter();
    }
    return RateLimiter.instance;
  }

  // ============================================================================
  // Rate Limit Check
  // ============================================================================

  checkLimit(identifier: string, config?: Partial<RateLimitConfig>): RateLimitResult {
    const finalConfig = { ...this.defaultConfig, ...config };
    const key = `${finalConfig.keyPrefix}${identifier}`;
    const now = Date.now();
    const windowStart = now - finalConfig.windowMs;

    // Get existing requests
    let timestamps = this.requests.get(key) ?? [];

    // Remove old requests outside the window
    timestamps = timestamps.filter((ts) => ts > windowStart);

    // Check if limit exceeded
    if (timestamps.length >= finalConfig.maxRequests) {
      const oldestTimestamp = timestamps[0] ?? now;
      const resetTime = oldestTimestamp + finalConfig.windowMs;
      const retryAfter = Math.ceil((resetTime - now) / 1000);

      logger.warn('Rate limit exceeded', {
        identifier,
        requests: timestamps.length,
        limit: finalConfig.maxRequests,
        retryAfter,
      });

      return {
        allowed: false,
        info: {
          limit: finalConfig.maxRequests,
          remaining: 0,
          resetTime,
          windowMs: finalConfig.windowMs,
        },
        retryAfter,
      };
    }

    // Add current request
    timestamps.push(now);
    this.requests.set(key, timestamps);

    // Clean up old entries periodically
    this.cleanup();

    const resetTime = now + finalConfig.windowMs;

    return {
      allowed: true,
      info: {
        limit: finalConfig.maxRequests,
        remaining: finalConfig.maxRequests - timestamps.length,
        resetTime,
        windowMs: finalConfig.windowMs,
      },
    };
  }

  // ============================================================================
  // Cleanup
  // ============================================================================

  private cleanup(): void {
    // Simple cleanup: remove entries older than 10 minutes
    const cutoff = Date.now() - 600000;
    for (const [key, timestamps] of this.requests.entries()) {
      const filtered = timestamps.filter((ts) => ts > cutoff);
      if (filtered.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, filtered);
      }
    }
  }

  // ============================================================================
  // Reset
  // ============================================================================

  reset(identifier: string, keyPrefix?: string): void {
    const prefix = keyPrefix ?? this.defaultConfig.keyPrefix;
    const key = `${prefix}${identifier}`;
    this.requests.delete(key);
    logger.info('Rate limit reset', { identifier });
  }

  resetAll(): void {
    this.requests.clear();
    logger.info('All rate limits reset');
  }

  // ============================================================================
  // Get Stats
  // ============================================================================

  getStats(): {
    totalKeys: number;
    totalRequests: number;
  } {
    let totalRequests = 0;
    for (const timestamps of this.requests.values()) {
      totalRequests += timestamps.length;
    }

    return {
      totalKeys: this.requests.size,
      totalRequests,
    };
  }
}

// Export singleton instance
export const rateLimiter = RateLimiter.getInstance();

// ============================================================================
// Predefined Configurations
// ============================================================================

export const rateLimitConfigs = {
  // Standard API limits
  standard: {
    windowMs: 60000,
    maxRequests: 100,
  },
  // Strict limits for sensitive endpoints
  strict: {
    windowMs: 60000,
    maxRequests: 10,
  },
  // Relaxed limits for public endpoints
  relaxed: {
    windowMs: 60000,
    maxRequests: 1000,
  },
  // Burst limits for high-traffic scenarios
  burst: {
    windowMs: 1000,
    maxRequests: 10,
  },
};
