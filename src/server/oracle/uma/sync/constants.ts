import { env } from '@/lib/config/env';

export const DEFAULT_RPC_TIMEOUT_MS = 30_000;
export const MIN_BLOCK_WINDOW = 500n;
export const MAX_BLOCK_WINDOW = 100_000n;
export const ADAPTIVE_GROWTH_FACTOR = 1.5;
export const ADAPTIVE_SHRINK_FACTOR = 0.5;
export const MAX_CONSECUTIVE_EMPTY_RANGES = 3;
export const MAX_RETRY_BACKOFF_MS = 10_000;
export const CACHE_TTL_MS = 60_000;

export function getRpcTimeoutMs() {
  const raw = Number(
    env.INSIGHT_RPC_TIMEOUT_MS || env.INSIGHT_DEPENDENCY_TIMEOUT_MS || DEFAULT_RPC_TIMEOUT_MS,
  );
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_RPC_TIMEOUT_MS;
}
