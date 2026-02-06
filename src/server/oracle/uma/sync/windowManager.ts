import { logger } from '@/lib/logger';

import {
  MIN_BLOCK_WINDOW,
  MAX_BLOCK_WINDOW,
  ADAPTIVE_GROWTH_FACTOR,
  ADAPTIVE_SHRINK_FACTOR,
  MAX_CONSECUTIVE_EMPTY_RANGES,
  MAX_RETRY_BACKOFF_MS,
} from './constants';

export function calculateInitialWindow(
  syncState: { lastProcessedBlock: bigint },
  startBlock: bigint,
  safeBlock: bigint | null,
  maxBlockRange: bigint,
): { fromBlock: bigint; initialCursor: bigint; window: bigint } {
  const fromBlock =
    syncState.lastProcessedBlock === 0n
      ? startBlock > 0n
        ? startBlock
        : (safeBlock ?? 0n) > maxBlockRange
          ? (safeBlock ?? 0n) - maxBlockRange
          : 0n
      : syncState.lastProcessedBlock > 10n
        ? syncState.lastProcessedBlock - 10n
        : 0n;

  const initialCursor = fromBlock < startBlock ? startBlock : fromBlock;
  const lastWindowSize = syncState.lastProcessedBlock > 0n ? maxBlockRange : MIN_BLOCK_WINDOW;

  return { fromBlock, initialCursor, window: lastWindowSize };
}

export function shouldGrowWindow(
  logsInRange: number,
  rangeDuration: number,
  rangeSize: bigint,
): boolean {
  if (logsInRange === 0) return false;
  const logsPerSecond = logsInRange / (rangeDuration / 1000);
  return logsPerSecond > 10 && rangeSize < MAX_BLOCK_WINDOW;
}

export function growWindow(currentWindow: bigint): bigint {
  return BigInt(Math.min(Number(currentWindow) * ADAPTIVE_GROWTH_FACTOR, Number(MAX_BLOCK_WINDOW)));
}

export function shrinkWindow(currentWindow: bigint): bigint {
  return BigInt(Math.max(Number(currentWindow) * ADAPTIVE_SHRINK_FACTOR, Number(MIN_BLOCK_WINDOW)));
}

export function calculateBackoff(attempt: number, baseBackoff: number): number {
  const backoff = Math.min(baseBackoff * Math.pow(2, attempt), MAX_RETRY_BACKOFF_MS);
  const jitter = Math.random() * 0.3 * backoff;
  return backoff + jitter;
}

export function updateWindowAfterRange(
  window: bigint,
  logsInRange: number,
  consecutiveEmptyRanges: number,
  rangeDuration: number,
  rangeSize: bigint,
): { newWindow: bigint; newConsecutiveEmptyRanges: number } {
  if (logsInRange === 0) {
    const newConsecutiveEmptyRanges = consecutiveEmptyRanges + 1;
    if (newConsecutiveEmptyRanges >= MAX_CONSECUTIVE_EMPTY_RANGES) {
      return {
        newWindow: shrinkWindow(window),
        newConsecutiveEmptyRanges: 0,
      };
    }
    return { newWindow: window, newConsecutiveEmptyRanges };
  }

  if (shouldGrowWindow(logsInRange, rangeDuration, rangeSize)) {
    return {
      newWindow: growWindow(window),
      newConsecutiveEmptyRanges: 0,
    };
  }

  return { newWindow: window, newConsecutiveEmptyRanges: 0 };
}

export function logRangeRetry(
  cursor: bigint,
  rangeTo: bigint,
  attempt: number,
  backoff: number,
): void {
  logger.warn(
    `UMA Range [${cursor}-${rangeTo}] failed (attempt ${attempt}/3), retrying in ${Math.round(backoff)}ms...`,
  );
}

export function logRpcRetry(
  url: string,
  attempt: number,
  maxRetries: number,
  backoff: number,
): void {
  logger.warn(
    `UMA RPC ${url} unreachable (attempt ${attempt}/${maxRetries}), retrying in ${Math.round(backoff)}ms...`,
  );
}
