import { createPublicClient, http, parseAbi } from 'viem';

import { logger } from '@/lib/logger';

import { CACHE_TTL_MS, getRpcTimeoutMs } from './constants';

import type { RpcStats } from './types';

const umaClientCache = new Map<string, ReturnType<typeof createPublicClient>>();

export const OOV2_ABI = parseAbi([
  'event PriceProposed(bytes32 indexed identifier, uint256 timestamp, bytes ancillaryData, int256 price, address proposer, uint256 reward)',
  'event PriceDisputed(bytes32 indexed identifier, uint256 timestamp, bytes ancillaryData, address disputer, uint256 disputeBond)',
  'event PriceSettled(bytes32 indexed identifier, uint256 timestamp, bytes ancillaryData, int256 price, uint256 payout)',
]);

export const OOV3_ABI = parseAbi([
  'event AssertionMade(bytes32 indexed assertionId, bytes32 indexed claim, address indexed asserter, uint64 bond, bytes32 identifier)',
  'event AssertionDisputed(bytes32 indexed assertionId, address indexed disputer)',
  'event AssertionSettled(bytes32 indexed assertionId, bool indexed settledTruth, uint256 payout)',
  'event VoteEmitted(bytes32 indexed assertionId, address indexed voter, uint256 weight, bool support)',
]);

export function getCachedUMAClient(
  url: string,
  chainId: number,
): ReturnType<typeof createPublicClient> {
  const now = Date.now();
  const cacheKey = `${url}:${chainId}`;

  if ((process.env.NODE_ENV || '').toLowerCase() === 'test') {
    return createPublicClient({
      transport: http(url, { timeout: getRpcTimeoutMs(), retryCount: 0 }),
    });
  }

  const cached = umaClientCache.get(cacheKey);
  if (cached) {
    const timestamp = (cached as unknown as { _cacheTimestamp?: number })._cacheTimestamp;
    if (timestamp && now - timestamp < CACHE_TTL_MS) {
      return cached;
    }
    umaClientCache.delete(cacheKey);
  }

  const client = createPublicClient({
    transport: http(url, { timeout: getRpcTimeoutMs(), retryCount: 0 }),
  });
  (client as unknown as { _cacheTimestamp?: number })._cacheTimestamp = now;
  umaClientCache.set(cacheKey, client);
  return client;
}

export function cleanupUMAClientCache() {
  const now = Date.now();
  for (const [key, client] of umaClientCache.entries()) {
    const timestamp = (client as unknown as { _cacheTimestamp?: number })._cacheTimestamp;
    if (timestamp && now - timestamp > CACHE_TTL_MS * 2) {
      umaClientCache.delete(key);
    }
  }
}

// 启动缓存清理定时器，并保存引用以便 graceful shutdown
const cleanupInterval = setInterval(cleanupUMAClientCache, CACHE_TTL_MS);

// 添加最大缓存生命周期保护（24小时）
const MAX_CACHE_LIFETIME_MS = 24 * 60 * 60 * 1000;
let cacheCreatedAt = Date.now();

// 定期检查和强制清理
const lifetimeCheckInterval = setInterval(() => {
  if (Date.now() - cacheCreatedAt > MAX_CACHE_LIFETIME_MS) {
    clearInterval(cleanupInterval);
    clearInterval(lifetimeCheckInterval);
    umaClientCache.clear();
    cacheCreatedAt = Date.now(); // 重置计时器
    logger.warn('UMA client cache force cleared due to max lifetime');
  }
}, CACHE_TTL_MS);

// Graceful shutdown 处理
if (typeof process !== 'undefined') {
  process.on('SIGTERM', () => {
    clearInterval(cleanupInterval);
    clearInterval(lifetimeCheckInterval);
    umaClientCache.clear();
    logger.info('UMA client cache cleaned up on SIGTERM');
  });

  process.on('SIGINT', () => {
    clearInterval(cleanupInterval);
    clearInterval(lifetimeCheckInterval);
    umaClientCache.clear();
    logger.info('UMA client cache cleaned up on SIGINT');
  });
}

export function toSyncErrorCode(error: unknown) {
  if (error instanceof Error) {
    const message = error.message;
    if (message === 'contract_not_found') return 'contract_not_found';
    const lowered = message.toLowerCase();
    if (
      lowered.includes('failed to fetch') ||
      lowered.includes('fetch failed') ||
      lowered.includes('econnrefused') ||
      lowered.includes('timeout') ||
      lowered.includes('timed out') ||
      lowered.includes('socket') ||
      lowered.includes('aborted') ||
      lowered.includes('abort')
    ) {
      return 'rpc_unreachable';
    }
  }
  return 'sync_failed';
}

export function redactRpcUrl(raw: string) {
  try {
    const u = new URL(raw);
    u.username = '';
    u.password = '';
    u.search = '';
    u.hash = '';
    const segments = u.pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      for (let i = 0; i < segments.length; i += 1) {
        const seg = segments[i] ?? '';
        const looksLikeToken =
          seg.length >= 16 && /^[a-zA-Z0-9_-]+$/.test(seg) && !seg.includes('.');
        if (looksLikeToken) segments[i] = '<redacted>';
      }
      if (segments.length > 6) segments.splice(6, segments.length - 6, '…');
      u.pathname = '/' + segments.join('/');
    }
    return u.toString();
  } catch {
    const trimmed = raw.trim();
    if (trimmed.length <= 140) return trimmed;
    return trimmed.slice(0, 140) + '…';
  }
}

export function readRpcStats(input: unknown): RpcStats {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return input as RpcStats;
}

export function recordRpcOk(stats: RpcStats, url: string, latencyMs: number) {
  const prev = stats[url] ?? {
    ok: 0,
    fail: 0,
    lastOkAt: null,
    lastFailAt: null,
    avgLatencyMs: null,
  };
  const avg =
    prev.avgLatencyMs === null ? latencyMs : Math.round(prev.avgLatencyMs * 0.8 + latencyMs * 0.2);
  stats[url] = { ...prev, ok: prev.ok + 1, lastOkAt: new Date().toISOString(), avgLatencyMs: avg };
  if (Math.random() < 0.01)
    logger.info('uma_rpc_sample', { url: redactRpcUrl(url), ok: true, latencyMs });
}

export function recordRpcFail(stats: RpcStats, url: string) {
  const prev = stats[url] ?? {
    ok: 0,
    fail: 0,
    lastOkAt: null,
    lastFailAt: null,
    avgLatencyMs: null,
  };
  stats[url] = { ...prev, fail: prev.fail + 1, lastFailAt: new Date().toISOString() };
  if (Math.random() < 0.01) logger.warn('uma_rpc_sample', { url: redactRpcUrl(url), ok: false });
}

export function pickNextRpcUrl(urls: string[], current: string): string {
  if (urls.length <= 1) return current;
  const idx = urls.indexOf(current);
  if (idx >= 0) {
    const nextIdx = (idx + 1) % urls.length;
    return urls[nextIdx] ?? urls[0] ?? '';
  }
  return urls[0] ?? '';
}

export function getChainId(chain: string): number {
  switch (chain) {
    case 'Ethereum':
      return 1;
    case 'Polygon':
      return 137;
    case 'Arbitrum':
      return 42161;
    case 'Optimism':
      return 10;
    case 'Base':
      return 8453;
    case 'PolygonAmoy':
      return 80002;
    default:
      return 1;
  }
}
