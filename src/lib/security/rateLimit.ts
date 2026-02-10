/**
 * Rate Limiting - 速率限制
 *
 * 使用内存存储（适合 Vercel 无服务器环境）
 */

import type { NextRequest } from 'next/server';

import { logger } from '@/lib/logger';

// ============================================================================
// 类型定义
// ============================================================================

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (req: NextRequest) => string;
}

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  totalLimit: number;
}

// ============================================================================
// 内存存储实现
// ============================================================================

const store = new Map<string, RateLimitRecord>();

async function getRecord(key: string): Promise<RateLimitRecord | null> {
  const record = store.get(key);
  if (!record) return null;

  // 清理过期记录
  if (Date.now() > record.resetTime) {
    store.delete(key);
    return null;
  }

  return record;
}

async function setRecord(key: string, record: RateLimitRecord): Promise<void> {
  store.set(key, record);
}

async function incrementRecord(key: string, windowMs: number): Promise<RateLimitRecord> {
  const now = Date.now();
  const existing = await getRecord(key);

  if (!existing) {
    const record: RateLimitRecord = {
      count: 1,
      resetTime: now + windowMs,
    };
    await setRecord(key, record);
    return record;
  }

  existing.count++;
  return existing;
}

// ============================================================================
// 清理过期记录（可用于定时任务）
// ============================================================================

function cleanupStore(): void {
  const now = Date.now();
  for (const [key, record] of store.entries()) {
    if (now > record.resetTime) {
      store.delete(key);
    }
  }
}

// ============================================================================
// 客户端 IP 获取
// ============================================================================

export function getClientIp(req: NextRequest): string {
  // 从各种 header 中获取真实 IP
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? 'unknown';
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  // 返回未知标识
  return 'unknown';
}

// ============================================================================
// 速率限制核心逻辑
// ============================================================================

export async function rateLimit(
  req: NextRequest,
  config: RateLimitConfig,
): Promise<RateLimitResult> {
  const clientIp = getClientIp(req);
  const key = config.keyGenerator
    ? config.keyGenerator(req)
    : `${clientIp}:${req.nextUrl.pathname}`;

  const now = Date.now();

  try {
    // 尝试获取现有记录
    const record = await getRecord(key);

    if (!record || now > record.resetTime) {
      // 新窗口
      const newRecord: RateLimitRecord = {
        count: 1,
        resetTime: now + config.windowMs,
      };
      await setRecord(key, newRecord);

      return {
        allowed: true,
        remaining: config.maxRequests - 1,
        resetTime: newRecord.resetTime,
        totalLimit: config.maxRequests,
      };
    }

    if (record.count >= config.maxRequests) {
      logger.warn('Rate limit exceeded', {
        ip: clientIp,
        path: req.nextUrl.pathname,
        key,
        count: record.count,
      });

      return {
        allowed: false,
        remaining: 0,
        resetTime: record.resetTime,
        totalLimit: config.maxRequests,
      };
    }

    // 增加计数
    const updated = await incrementRecord(key, config.windowMs);

    return {
      allowed: true,
      remaining: config.maxRequests - updated.count,
      resetTime: updated.resetTime,
      totalLimit: config.maxRequests,
    };
  } catch (error) {
    logger.error('Rate limit check failed', {
      error: error instanceof Error ? error.message : String(error),
      key,
    });

    // 失败时允许请求通过（fail-open 策略）
    return {
      allowed: true,
      remaining: 1,
      resetTime: now + config.windowMs,
      totalLimit: config.maxRequests,
    };
  }
}

// ============================================================================
// 内存存储清理（用于定时任务）
// ============================================================================

export function cleanupMemoryStore(): void {
  cleanupStore();
  logger.debug('Memory rate limit store cleaned up', { size: store.size });
}

// ============================================================================
// 获取存储状态（用于监控）
// ============================================================================

export async function getRateLimitStoreStatus(): Promise<{
  type: 'memory';
  memorySize: number;
}> {
  return { type: 'memory', memorySize: store.size };
}
