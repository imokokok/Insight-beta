/**
 * RPC 客户端管理模块
 *
 * 提供 RPC 客户端的缓存、创建和管理功能
 */

import { createPublicClient, http, type PublicClient } from 'viem';
import { env } from '@/lib/config/env';
import { DEFAULT_RPC_TIMEOUT_MS, CACHE_TTL_MS } from './constants';

/** 客户端缓存 */
const clientCache = new Map<string, PublicClient & { _cacheTimestamp?: number }>();

/**
 * 获取 RPC 超时时间
 * @returns 超时时间（毫秒）
 */
export function getRpcTimeoutMs(): number {
  const raw = Number(
    env.INSIGHT_RPC_TIMEOUT_MS || env.INSIGHT_DEPENDENCY_TIMEOUT_MS || DEFAULT_RPC_TIMEOUT_MS,
  );
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_RPC_TIMEOUT_MS;
}

/**
 * 获取缓存的 RPC 客户端
 * 如果缓存过期或不存在，则创建新客户端
 * @param url - RPC URL
 * @returns PublicClient 实例
 */
export function getCachedClient(url: string): PublicClient {
  const now = Date.now();

  // 测试环境下不缓存
  if ((process.env.NODE_ENV || '').toLowerCase() === 'test') {
    return createPublicClient({
      transport: http(url, {
        timeout: getRpcTimeoutMs(),
        retryCount: 0,
      }),
    });
  }

  // 检查缓存
  const cached = clientCache.get(url);
  if (cached) {
    const timestamp = cached._cacheTimestamp;
    if (timestamp && now - timestamp < CACHE_TTL_MS) {
      return cached;
    }
    clientCache.delete(url);
  }

  // 创建新客户端
  const client = createPublicClient({
    transport: http(url, {
      timeout: getRpcTimeoutMs(),
      retryCount: 0,
    }),
  }) as PublicClient & { _cacheTimestamp?: number };

  client._cacheTimestamp = now;
  clientCache.set(url, client);
  return client;
}

/**
 * 清理过期的客户端缓存
 */
export function cleanupClientCache(): void {
  const now = Date.now();
  for (const [url, client] of clientCache.entries()) {
    const timestamp = client._cacheTimestamp;
    if (timestamp && now - timestamp > CACHE_TTL_MS * 2) {
      clientCache.delete(url);
    }
  }
}

// 定期清理缓存
setInterval(cleanupClientCache, CACHE_TTL_MS);

/**
 * 脱敏 RPC URL
 * 移除 URL 中的敏感信息（用户名、密码、token 等）
 * @param raw - 原始 URL
 * @returns 脱敏后的 URL
 */
export function redactRpcUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.username = '';
    u.password = '';
    u.search = '';
    u.hash = '';

    const segments = u.pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      for (let i = 0; i < segments.length; i++) {
        const seg = segments[i] ?? '';
        const looksLikeToken =
          seg.length >= 16 && /^[a-zA-Z0-9_-]+$/.test(seg) && !seg.includes('.');
        if (looksLikeToken) segments[i] = '<redacted>';
      }
      if (segments.length > 6) {
        segments.splice(6, segments.length - 6, '…');
      }
      u.pathname = '/' + segments.join('/');
    }
    return u.toString();
  } catch {
    const trimmed = raw.trim();
    if (trimmed.length <= 140) return trimmed;
    return trimmed.slice(0, 140) + '…';
  }
}

/**
 * 选择下一个 RPC URL
 * 实现简单的轮询策略
 * @param urls - URL 列表
 * @param current - 当前 URL
 * @returns 下一个 URL
 */
export function pickNextRpcUrl(urls: string[], current: string): string {
  if (urls.length <= 1) return current;
  const idx = urls.indexOf(current);
  if (idx >= 0) {
    const nextIdx = (idx + 1) % urls.length;
    return urls[nextIdx] ?? urls[0] ?? '';
  }
  return urls[0] ?? '';
}
