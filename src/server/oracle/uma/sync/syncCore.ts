import { logger } from '@/lib/logger';
import { parseRpcUrls } from '@/lib/utils';
import { query } from '@/server/db';
import type { StoredUMAState } from '@/server/oracle/umaState';
import { getUMASyncState, updateUMASyncState } from '@/server/oracle/umaState';

import { getRpcTimeoutMs, MAX_RETRY_BACKOFF_MS } from './constants';
import { getUMAEnv } from './env';
import {
  processOOv2ProposedLogs,
  processOOv2DisputedLogs,
  processOOv2SettledLogs,
  processOOv3MadeLogs,
  processOOv3DisputedLogs,
  processOOv3SettledLogs,
  processOOv3VoteLogs,
} from './logProcessor';
import {
  getCachedUMAClient,
  OOV2_ABI,
  OOV3_ABI,
  toSyncErrorCode,
  redactRpcUrl,
  readRpcStats,
  recordRpcOk,
  recordRpcFail,
  pickNextRpcUrl,
  getChainId,
} from './rpcUtils';
import {
  calculateInitialWindow,
  shrinkWindow,
  calculateBackoff,
  updateWindowAfterRange,
  logRangeRetry,
} from './windowManager';

import type { createPublicClient } from 'viem';

// 使用原子操作锁来防止竞态条件
const umaInflightByInstance = new Map<
  string,
  Promise<{ updated: boolean; state: StoredUMAState }>
>();
const umaSyncLocks = new Map<string, Promise<void>>();

export async function ensureUMASynced(
  instanceId: string = 'default',
): Promise<{ updated: boolean; state: StoredUMAState }> {
  const normalizedInstanceId = (instanceId || 'default').trim();

  // 使用锁确保原子性检查-设置操作
  while (umaSyncLocks.has(normalizedInstanceId)) {
    await umaSyncLocks.get(normalizedInstanceId);
  }

  // 再次检查，避免在等待锁期间其他线程已完成同步
  const existing = umaInflightByInstance.get(normalizedInstanceId);
  if (existing) return existing;

  let lockResolve: (() => void) | undefined;
  const lockPromise = new Promise<void>((resolve) => {
    lockResolve = resolve;
  });
  umaSyncLocks.set(normalizedInstanceId, lockPromise);

  try {
    const p = syncUMAOnce(normalizedInstanceId).finally(() => {
      umaInflightByInstance.delete(normalizedInstanceId);
    });
    umaInflightByInstance.set(normalizedInstanceId, p);
    return p;
  } finally {
    umaSyncLocks.delete(normalizedInstanceId);
    if (lockResolve) {
      lockResolve();
    }
  }
}

export function isUMASyncing(instanceId?: string) {
  if (instanceId) {
    const normalizedInstanceId = (instanceId || 'default').trim();
    return umaInflightByInstance.has(normalizedInstanceId);
  }
  return umaInflightByInstance.size > 0;
}

async function syncUMAOnce(
  instanceId: string,
): Promise<{ updated: boolean; state: StoredUMAState }> {
  const {
    rpcUrl,
    ooV2Address,
    ooV3Address,
    chain,
    startBlock,
    maxBlockRange,
    votingPeriodMs,
    confirmationBlocks,
  } = await getUMAEnv(instanceId);
  const syncState = await getUMASyncState(instanceId);
  const lastProcessedBlock = syncState.lastProcessedBlock;

  if (!rpcUrl || (!ooV2Address && !ooV3Address)) {
    return { updated: false, state: await getUMASyncState(instanceId) };
  }

  const attemptAt = new Date().toISOString();
  const startedAt = Date.now();
  let latestBlock: bigint | null = null;
  let safeBlock: bigint | null = null;
  const rpcUrls = parseRpcUrls(rpcUrl);
  const rpcStats = readRpcStats(syncState.rpcStats);
  let rpcActiveUrl =
    (syncState.rpcActiveUrl && rpcUrls.includes(syncState.rpcActiveUrl)
      ? syncState.rpcActiveUrl
      : null) ??
    rpcUrls[0] ??
    rpcUrl;

  try {
    const withRpc = async <T>(
      op: (client: ReturnType<typeof createPublicClient>) => Promise<T>,
    ): Promise<T> => {
      const urlsToTry = rpcUrls.length > 0 ? rpcUrls : [rpcActiveUrl];
      let lastErr: unknown = null;
      for (let i = 0; i < urlsToTry.length; i += 1) {
        const url = i === 0 ? rpcActiveUrl : pickNextRpcUrl(urlsToTry, rpcActiveUrl);
        rpcActiveUrl = url;
        const client = getCachedUMAClient(url, getChainId(chain));
        const urlStats = rpcStats[url];
        const baseBackoff = urlStats?.avgLatencyMs
          ? Math.min(urlStats.avgLatencyMs * 2, MAX_RETRY_BACKOFF_MS)
          : 1000;
        const MAX_RETRIES = Math.min(3, Math.max(2, Math.floor(getRpcTimeoutMs() / 5000)));

        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          const t0 = Date.now();
          try {
            const result = await op(client);
            recordRpcOk(rpcStats, url, Date.now() - t0);
            return result;
          } catch (error: unknown) {
            lastErr = error;
            const code = toSyncErrorCode(error);
            if (code === 'rpc_unreachable') {
              recordRpcFail(rpcStats, url);
              if (attempt < MAX_RETRIES - 1) {
                const backoff = calculateBackoff(attempt, baseBackoff);
                logger.warn(
                  `UMA RPC ${redactRpcUrl(url)} unreachable (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${Math.round(backoff)}ms...`,
                );
                await new Promise((r) => setTimeout(r, backoff));
                continue;
              }
            } else if (code === 'contract_not_found') {
              throw error;
            } else {
              if (attempt < MAX_RETRIES - 1) {
                const backoff = calculateBackoff(attempt, baseBackoff);
                logger.warn(
                  `UMA RPC ${redactRpcUrl(url)} error: ${(error as Error).message} (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${Math.round(backoff)}ms...`,
                );
                await new Promise((r) => setTimeout(r, backoff));
                continue;
              }
            }
          }
        }
        const code = toSyncErrorCode(lastErr);
        if (code !== 'rpc_unreachable') break;
      }
      throw lastErr instanceof Error ? lastErr : new Error('rpc_unreachable');
    };

    const latest = await withRpc((client) => client.getBlockNumber());
    latestBlock = latest;
    safeBlock = latest > confirmationBlocks ? latest - confirmationBlocks : 0n;

    const { initialCursor, window } = calculateInitialWindow(
      syncState,
      startBlock,
      safeBlock,
      maxBlockRange,
    );

    const toBlock = safeBlock ?? latest;

    if (initialCursor > toBlock) {
      const durationMs = Date.now() - startedAt;
      await updateUMASyncState(
        syncState.lastProcessedBlock,
        attemptAt,
        new Date().toISOString(),
        durationMs,
        null,
        {
          latestBlock: latest,
          safeBlock: toBlock,
          lastSuccessProcessedBlock: syncState.lastProcessedBlock,
          consecutiveFailures: 0,
          rpcActiveUrl,
          rpcStats,
        },
        instanceId,
      );
      return { updated: false, state: await getUMASyncState(instanceId) };
    }

    let updated = false;
    let cursor = initialCursor;
    let consecutiveEmptyRanges = 0;
    let processedHigh = syncState.lastProcessedBlock;
    let currentWindow = window;

    while (cursor <= toBlock) {
      const rangeTo =
        cursor + currentWindow - 1n <= toBlock ? cursor + currentWindow - 1n : toBlock;
      const rangeSize = rangeTo - cursor + 1n;
      const rangeStartTime = Date.now();

      let attempts = 0;
      let rangeSuccess = false;
      let logsInRange = 0;

      while (!rangeSuccess && attempts < 3) {
        try {
          const logsPromises: Promise<unknown>[] = [];

          if (ooV2Address) {
            logsPromises.push(
              withRpc((client) =>
                client.getLogs({
                  address: ooV2Address,
                  event: OOV2_ABI[0],
                  fromBlock: cursor,
                  toBlock: rangeTo,
                }),
              ),
              withRpc((client) =>
                client.getLogs({
                  address: ooV2Address,
                  event: OOV2_ABI[1],
                  fromBlock: cursor,
                  toBlock: rangeTo,
                }),
              ),
              withRpc((client) =>
                client.getLogs({
                  address: ooV2Address,
                  event: OOV2_ABI[2],
                  fromBlock: cursor,
                  toBlock: rangeTo,
                }),
              ),
            );
          }

          if (ooV3Address) {
            logsPromises.push(
              withRpc((client) =>
                client.getLogs({
                  address: ooV3Address,
                  event: OOV3_ABI[0],
                  fromBlock: cursor,
                  toBlock: rangeTo,
                }),
              ),
              withRpc((client) =>
                client.getLogs({
                  address: ooV3Address,
                  event: OOV3_ABI[1],
                  fromBlock: cursor,
                  toBlock: rangeTo,
                }),
              ),
              withRpc((client) =>
                client.getLogs({
                  address: ooV3Address,
                  event: OOV3_ABI[2],
                  fromBlock: cursor,
                  toBlock: rangeTo,
                }),
              ),
              withRpc((client) =>
                client.getLogs({
                  address: ooV3Address,
                  event: OOV3_ABI[3],
                  fromBlock: cursor,
                  toBlock: rangeTo,
                }),
              ),
            );
          }

          const logsResults = await Promise.all(logsPromises);

          const oov2ProposedLogs = (logsResults[0] || []) as Array<{
            args: { [key: string]: unknown };
            transactionHash: unknown;
            blockNumber: unknown;
            logIndex: unknown;
          }>;
          const oov2DisputedLogs = (logsResults[1] || []) as Array<{
            args: { [key: string]: unknown };
            transactionHash: unknown;
            blockNumber: unknown;
            logIndex: unknown;
          }>;
          const oov2SettledLogs = (logsResults[2] || []) as Array<{
            args: { [key: string]: unknown };
            transactionHash: unknown;
            blockNumber: unknown;
            logIndex: unknown;
          }>;

          const oov3MadeLogs = (logsResults[3] || []) as Array<{
            args: { [key: string]: unknown };
            transactionHash: unknown;
            blockNumber: unknown;
            logIndex: unknown;
          }>;
          const oov3DisputedLogs = (logsResults[4] || []) as Array<{
            args: { [key: string]: unknown };
            transactionHash: unknown;
            blockNumber: unknown;
            logIndex: unknown;
          }>;
          const oov3SettledLogs = (logsResults[5] || []) as Array<{
            args: { [key: string]: unknown };
            transactionHash: unknown;
            blockNumber: unknown;
            logIndex: unknown;
          }>;
          const oov3VoteLogs = (logsResults[6] || []) as Array<{
            args: { [key: string]: unknown };
            transactionHash: unknown;
            blockNumber: unknown;
            logIndex: unknown;
          }>;

          logsInRange =
            oov2ProposedLogs.length +
            oov2DisputedLogs.length +
            oov2SettledLogs.length +
            oov3MadeLogs.length +
            oov3DisputedLogs.length +
            oov3SettledLogs.length +
            oov3VoteLogs.length;

          // 使用数据库事务包装所有数据库操作，确保数据一致性
          const dbOps: Promise<unknown>[] = [];

          dbOps.push(...(await processOOv2ProposedLogs(oov2ProposedLogs, chain, instanceId)));
          dbOps.push(
            ...(await processOOv2DisputedLogs(oov2DisputedLogs, chain, votingPeriodMs, instanceId)),
          );
          dbOps.push(...(await processOOv2SettledLogs(oov2SettledLogs, chain, instanceId)));
          dbOps.push(...(await processOOv3MadeLogs(oov3MadeLogs, chain, instanceId)));
          dbOps.push(
            ...(await processOOv3DisputedLogs(oov3DisputedLogs, chain, votingPeriodMs, instanceId)),
          );
          dbOps.push(...(await processOOv3SettledLogs(oov3SettledLogs, chain, instanceId)));
          dbOps.push(...(await processOOv3VoteLogs(oov3VoteLogs, chain, instanceId)));

          // 在事务中执行所有数据库操作
          await query('BEGIN');
          try {
            // 使用 allSettled 替代 all，确保所有操作都被尝试执行
            const results = await Promise.allSettled(dbOps);

            // 检查是否有失败的操作
            const failures = results.filter(
              (r): r is PromiseRejectedResult => r.status === 'rejected',
            );
            if (failures.length > 0) {
              // 记录所有失败
              logger.error('Some database operations failed in transaction', {
                chain,
                instanceId,
                failureCount: failures.length,
                errors: failures.map((f) => f.reason?.message || String(f.reason)),
              });
              await query('ROLLBACK');
              throw new Error(
                `Transaction failed: ${failures.length} operations failed. First error: ${failures[0]?.reason?.message || String(failures[0]?.reason)}`,
              );
            }

            await query('COMMIT');
          } catch (error) {
            await query('ROLLBACK');
            throw error;
          }

          if (rangeTo > processedHigh) processedHigh = rangeTo;
          rangeSuccess = true;
          updated = updated || logsInRange > 0;

          const rangeDuration = Date.now() - rangeStartTime;
          const { newWindow, newConsecutiveEmptyRanges } = updateWindowAfterRange(
            currentWindow,
            logsInRange,
            consecutiveEmptyRanges,
            rangeDuration,
            rangeSize,
          );
          currentWindow = newWindow;
          consecutiveEmptyRanges = newConsecutiveEmptyRanges;
        } catch (error: unknown) {
          attempts++;
          const rangeDuration = Date.now() - rangeStartTime;
          if (attempts < 3 && rangeDuration < getRpcTimeoutMs()) {
            const backoff = Math.min(2000 * Math.pow(2, attempts - 1), MAX_RETRY_BACKOFF_MS);
            logRangeRetry(cursor, rangeTo, attempts, backoff);
            await new Promise((r) => setTimeout(r, backoff));
            currentWindow = shrinkWindow(currentWindow);
          } else if (consecutiveEmptyRanges >= 3) {
            currentWindow = shrinkWindow(currentWindow);
            consecutiveEmptyRanges = 0;
          } else {
            currentWindow = shrinkWindow(currentWindow);
            throw error;
          }
        }
      }

      if (rangeSuccess && rangeTo > processedHigh) {
        processedHigh = rangeTo;
      }
      cursor = rangeTo + 1n;
    }

    const totalDuration = Date.now() - startedAt;
    await updateUMASyncState(
      processedHigh > toBlock ? processedHigh : toBlock,
      attemptAt,
      new Date().toISOString(),
      totalDuration,
      null,
      {
        latestBlock: latest,
        safeBlock: toBlock,
        lastSuccessProcessedBlock: processedHigh > toBlock ? processedHigh : toBlock,
        consecutiveFailures: 0,
        rpcActiveUrl,
        rpcStats,
      },
      instanceId,
    );

    return { updated, state: await getUMASyncState(instanceId) };
  } catch (error: unknown) {
    const code = toSyncErrorCode(error);
    logger.error('UMA sync failed', { error, instanceId, code });
    await updateUMASyncState(
      lastProcessedBlock,
      attemptAt,
      syncState.sync.lastSuccessAt,
      syncState.sync.lastDurationMs,
      code,
      {
        latestBlock: latestBlock ?? syncState.latestBlock ?? undefined,
        safeBlock: safeBlock ?? syncState.safeBlock ?? undefined,
        lastSuccessProcessedBlock: syncState.lastSuccessProcessedBlock ?? undefined,
        consecutiveFailures: (syncState.consecutiveFailures ?? 0) + 1,
        rpcActiveUrl,
        rpcStats,
      },
      instanceId,
    );
    throw error;
  }
}

export async function replayUMAEventsRange(
  _fromBlock: bigint,
  _toBlock: bigint,
  _instanceId: string = 'default',
) {
  logger.warn(
    'replayUMAEventsRange not yet implemented - requires full event replay infrastructure',
  );
}
