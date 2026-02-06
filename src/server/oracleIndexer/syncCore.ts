/**
 * Oracle Indexer 同步核心模块
 *
 * 提供 Oracle 数据同步的核心逻辑
 */

import { parseAbi, type Address, type PublicClient } from 'viem';

import { logger } from '@/lib/logger';
import type { Assertion, Dispute, OracleChain } from '@/lib/types/oracleTypes';
import { isZeroBytes32, parseRpcUrls, toIsoFromSeconds } from '@/lib/utils';

import {
  readOracleState,
  getSyncState,
  upsertAssertion,
  upsertDispute,
  updateSyncState,
  insertSyncMetric,
  insertVoteEvent,
  insertOracleEvent,
  recomputeDisputeVotes,
} from '../oracleState';
import {
  MIN_BLOCK_WINDOW,
  MAX_BLOCK_WINDOW,
  ADAPTIVE_GROWTH_FACTOR,
  ADAPTIVE_SHRINK_FACTOR,
  MAX_RETRY_BACKOFF_MS,
} from './constants';
import { getOracleEnv, isDegradedMode, isVoteTrackingEnabled } from './env';
import {
  readAlertRules,
  createOrTouchAlert,
  type AlertRule,
  type AlertSeverity,
} from '../observability';
import { getCachedClient, getRpcTimeoutMs, pickNextRpcUrl } from './rpcClient';
import { readRpcStats, recordRpcOk, recordRpcFail, toSyncErrorCode } from './rpcStats';
import { fetchAssertion } from '../oracleState/operations';

import type { NotificationChannel } from '../notifications';
import type { SyncResult, RpcStats } from './types';

/** 合约 ABI */
const abi = parseAbi([
  'event AssertionCreated(bytes32 indexed assertionId,address indexed asserter,string protocol,string market,string assertion,uint256 bondUsd,uint256 assertedAt,uint256 livenessEndsAt,bytes32 txHash)',
  'event AssertionDisputed(bytes32 indexed assertionId,address indexed disputer,string reason,uint256 disputedAt)',
  'event AssertionResolved(bytes32 indexed assertionId,bool outcome,uint256 resolvedAt)',
  'event VoteCast(bytes32 indexed assertionId, address indexed voter, bool support, uint256 weight)',
]);

/**
 * 执行一次 Oracle 同步
 * @param instanceId - 实例 ID
 * @returns 同步结果
 */
export async function syncOracleOnce(instanceId: string): Promise<SyncResult> {
  const env = await getOracleEnv(instanceId);
  const {
    rpcUrl,
    contractAddress,
    chain,
    startBlock,
    maxBlockRange,
    votingPeriodMs,
    confirmationBlocks,
  } = env;

  const effectiveVoteTrackingEnabled = isVoteTrackingEnabled() && !isDegradedMode();
  const syncState = await getSyncState(instanceId);
  const lastProcessedBlock = syncState.lastProcessedBlock;
  const alertRules = await readAlertRules();
  const enabledRules = (event: string) => alertRules.filter((r) => r.enabled && r.event === event);

  // 检查必要配置
  if (!rpcUrl || !contractAddress) {
    return { updated: false, state: await readOracleState(instanceId) };
  }

  const attemptAt = new Date().toISOString();
  const startedAt = Date.now();
  let latestBlock: bigint | null = null;
  let safeBlock: bigint | null = null;

  const rpcUrls = parseRpcUrls(rpcUrl);
  const rpcStats = readRpcStats(syncState.rpcStats);
  const rpcActiveUrl: string =
    (syncState.rpcActiveUrl && rpcUrls.includes(syncState.rpcActiveUrl)
      ? syncState.rpcActiveUrl
      : null) ??
    rpcUrls[0] ??
    rpcUrl;

  try {
    // 执行 RPC 调用并处理重试
    const withRpc = createRpcWrapper(rpcUrls, rpcActiveUrl, rpcStats);

    // 验证合约存在
    const bytecode = await withRpc((client) => client.getBytecode({ address: contractAddress }));
    if (!bytecode || bytecode === '0x') {
      throw new Error('contract_not_found');
    }

    // 获取最新区块
    const latest = await withRpc((client) => client.getBlockNumber());
    latestBlock = latest;
    safeBlock = latest > confirmationBlocks ? latest - confirmationBlocks : 0n;

    // 计算同步范围
    const { fromBlock, toBlock, initialCursor } = calculateSyncRange(
      syncState.lastProcessedBlock,
      startBlock,
      safeBlock,
      maxBlockRange,
    );

    // 如果已经是最新，直接返回
    if (initialCursor > toBlock) {
      await updateSyncMetrics(
        instanceId,
        syncState.lastProcessedBlock,
        attemptAt,
        startedAt,
        latest,
        toBlock,
        rpcActiveUrl,
        rpcStats,
        null,
      );
      return { updated: false, state: await readOracleState(instanceId) };
    }

    // 执行同步
    const syncStats = await executeSync(
      withRpc,
      contractAddress,
      chain as OracleChain,
      fromBlock,
      toBlock,
      initialCursor,
      syncState.lastProcessedBlock,
      maxBlockRange,
      votingPeriodMs,
      effectiveVoteTrackingEnabled,
      instanceId,
    );

    // 更新同步状态
    await updateSyncMetrics(
      instanceId,
      syncStats.processedHigh > toBlock ? syncStats.processedHigh : toBlock,
      attemptAt,
      startedAt,
      latest,
      toBlock,
      rpcActiveUrl,
      rpcStats,
      null,
    );

    return { updated: syncStats.updated, state: await readOracleState(instanceId) };
  } catch (error) {
    // 处理错误
    await handleSyncError(
      error,
      instanceId,
      chain,
      contractAddress,
      lastProcessedBlock,
      attemptAt,
      startedAt,
      syncState,
      latestBlock,
      safeBlock,
      rpcActiveUrl,
      rpcStats,
      enabledRules,
    );
    throw error;
  }
}

/**
 * 创建 RPC 调用包装器
 */
function createRpcWrapper(
  rpcUrls: string[],
  initialUrl: string,
  rpcStats: RpcStats,
): <T>(op: (client: PublicClient) => Promise<T>) => Promise<T> {
  let rpcActiveUrl = initialUrl;

  return async <T>(op: (client: PublicClient) => Promise<T>): Promise<T> => {
    const urlsToTry = rpcUrls.length > 0 ? rpcUrls : [rpcActiveUrl];
    let lastErr: unknown = null;

    for (let i = 0; i < urlsToTry.length; i++) {
      const url = i === 0 ? rpcActiveUrl : pickNextRpcUrl(urlsToTry, rpcActiveUrl);
      rpcActiveUrl = url;
      const client = getCachedClient(url);

      const urlStats = rpcStats[url];
      const baseBackoff = urlStats?.avgLatencyMs
        ? Math.min(urlStats.avgLatencyMs * 2, MAX_RETRY_BACKOFF_MS)
        : 1000;

      const maxRetries = Math.min(3, Math.max(2, Math.floor(getRpcTimeoutMs() / 5000)));

      for (let attempt = 0; attempt < maxRetries; attempt++) {
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
            if (attempt < maxRetries - 1) {
              const backoff = Math.min(baseBackoff * Math.pow(2, attempt), MAX_RETRY_BACKOFF_MS);
              const jitter = Math.random() * 0.3 * backoff;
              await new Promise((r) => setTimeout(r, backoff + jitter));
              continue;
            }
          } else if (code === 'contract_not_found') {
            throw error;
          } else {
            if (attempt < maxRetries - 1) {
              const backoff = Math.min(baseBackoff * Math.pow(2, attempt), MAX_RETRY_BACKOFF_MS);
              const jitter = Math.random() * 0.2 * backoff;
              await new Promise((r) => setTimeout(r, backoff + jitter));
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
}

/**
 * 计算同步范围
 */
function calculateSyncRange(
  lastProcessedBlock: bigint,
  startBlock: bigint,
  safeBlock: bigint | null,
  maxBlockRange: bigint,
) {
  const fromBlock =
    lastProcessedBlock === 0n
      ? startBlock > 0n
        ? startBlock
        : (safeBlock ?? 0n) > maxBlockRange
          ? (safeBlock ?? 0n) - maxBlockRange
          : 0n
      : lastProcessedBlock > 10n
        ? lastProcessedBlock - 10n > startBlock
          ? lastProcessedBlock - 10n
          : startBlock
        : startBlock;

  const toBlock = safeBlock ?? 0n;
  const initialCursor = fromBlock < startBlock ? startBlock : fromBlock;

  return { fromBlock, toBlock, initialCursor };
}

/**
 * 执行同步
 */
async function executeSync(
  withRpc: <T>(op: (client: PublicClient) => Promise<T>) => Promise<T>,
  contractAddress: Address,
  chain: OracleChain,
  _fromBlock: bigint,
  toBlock: bigint,
  initialCursor: bigint,
  lastProcessedBlock: bigint,
  maxBlockRange: bigint,
  votingPeriodMs: number,
  voteTrackingEnabled: boolean,
  instanceId: string,
): Promise<{ updated: boolean; processedHigh: bigint }> {
  let updated = false;
  let cursor = initialCursor;
  let processedHigh = lastProcessedBlock;
  const lastWindowSize = lastProcessedBlock > 0n ? maxBlockRange : MIN_BLOCK_WINDOW;
  let window = lastWindowSize;

  while (cursor <= toBlock) {
    const rangeTo = cursor + window - 1n <= toBlock ? cursor + window - 1n : toBlock;
    const rangeSize = rangeTo - cursor + 1n;
    const rangeStartTime = Date.now();

    let attempts = 0;
    let rangeSuccess = false;
    let logsInRange = 0;

    while (!rangeSuccess && attempts < 3) {
      try {
        // 获取日志
        const [createdLogs, disputedLogs, resolvedLogs, voteLogs] = await withRpc((client) =>
          Promise.all([
            client.getLogs({
              address: contractAddress,
              event: abi[0],
              fromBlock: cursor,
              toBlock: rangeTo,
            }),
            client.getLogs({
              address: contractAddress,
              event: abi[1],
              fromBlock: cursor,
              toBlock: rangeTo,
            }),
            client.getLogs({
              address: contractAddress,
              event: abi[2],
              fromBlock: cursor,
              toBlock: rangeTo,
            }),
            voteTrackingEnabled
              ? client.getLogs({
                  address: contractAddress,
                  event: abi[3],
                  fromBlock: cursor,
                  toBlock: rangeTo,
                })
              : Promise.resolve([]),
          ] as const),
        );

        logsInRange =
          createdLogs.length + disputedLogs.length + resolvedLogs.length + voteLogs.length;

        // 处理日志
        await processLogs(
          createdLogs,
          disputedLogs,
          resolvedLogs,
          voteLogs,
          chain,
          votingPeriodMs,
          instanceId,
        );

        if (rangeTo > processedHigh) processedHigh = rangeTo;
        rangeSuccess = true;
        updated = updated || logsInRange > 0;

        // 调整窗口大小
        if (logsInRange > 0) {
          const rangeDuration = Date.now() - rangeStartTime;
          const logsPerSecond = logsInRange / (rangeDuration / 1000);
          if (logsPerSecond > 10 && rangeSize < MAX_BLOCK_WINDOW) {
            window = BigInt(
              Math.min(Number(window) * ADAPTIVE_GROWTH_FACTOR, Number(MAX_BLOCK_WINDOW)),
            );
          }
        }
      } catch (error: unknown) {
        attempts++;
        if (attempts < 3) {
          const backoff = Math.min(2000 * Math.pow(2, attempts - 1), MAX_RETRY_BACKOFF_MS);
          logger.warn(
            `Range [${cursor}-${rangeTo}] failed (attempt ${attempts}/3), retrying in ${backoff}ms...`,
          );
          await new Promise((r) => setTimeout(r, backoff));
          window = BigInt(
            Math.max(Number(window) * ADAPTIVE_SHRINK_FACTOR, Number(MIN_BLOCK_WINDOW)),
          );
        } else {
          throw error;
        }
      }
    }

    cursor = rangeTo + 1n;
  }

  return { updated, processedHigh };
}

/**
 * 处理日志
 */
async function processLogs(
  createdLogs: unknown[],
  disputedLogs: unknown[],
  _resolvedLogs: unknown[],
  voteLogs: unknown[],
  chain: OracleChain,
  votingPeriodMs: number,
  instanceId: string,
): Promise<void> {
  const dbOps: Promise<unknown>[] = [];
  const touchedVotes = new Set<string>();

  // 处理 AssertionCreated 日志
  for (const log of createdLogs) {
    const args = (log as { args?: Record<string, unknown> }).args;
    if (!args) continue;

    const id = args.assertionId as `0x${string}`;
    const assertedAt = toIsoFromSeconds(args.assertedAt as bigint);
    const livenessEndsAt = toIsoFromSeconds(args.livenessEndsAt as bigint);
    const txHashArg = args.txHash as `0x${string}` | undefined;
    const logTxHash = (log as { transactionHash?: string }).transactionHash;
    const txHash = !isZeroBytes32(txHashArg)
      ? (txHashArg ?? (logTxHash as `0x${string}`) ?? '0x0')
      : ((logTxHash as `0x${string}`) ?? '0x0');
    const blockNumber = (log as { blockNumber?: bigint }).blockNumber ?? 0n;
    const logIndex = Number((log as { logIndex?: number | bigint }).logIndex ?? 0);

    const assertion: Assertion = {
      id,
      chain,
      asserter: args.asserter as `0x${string}`,
      protocol: args.protocol as string,
      market: args.market as string,
      assertion: args.assertion as string,
      assertedAt,
      livenessEndsAt,
      blockNumber: blockNumber.toString(10),
      logIndex,
      resolvedAt: undefined,
      status: 'Pending',
      bondUsd: Number(args.bondUsd as bigint),
      txHash,
    };

    dbOps.push(
      insertOracleEvent(
        {
          chain,
          eventType: 'assertion_created',
          assertionId: id,
          txHash,
          blockNumber,
          logIndex,
          payload: assertion,
        },
        instanceId,
      ),
    );
    dbOps.push(upsertAssertion(assertion, instanceId));
  }

  // 处理 AssertionDisputed 日志
  for (const log of disputedLogs) {
    const args = (log as { args?: Record<string, unknown> }).args;
    if (!args) continue;

    const id = args.assertionId as `0x${string}`;
    const disputedAt = toIsoFromSeconds(args.disputedAt as bigint);
    const disputer = args.disputer as `0x${string}`;
    const logTxHash = (log as { transactionHash?: string }).transactionHash;
    const txHash = (logTxHash as `0x${string}` | undefined) ?? '0x0';
    const blockNumber = (log as { blockNumber?: bigint }).blockNumber ?? 0n;
    const logIndex = Number((log as { logIndex?: number | bigint }).logIndex ?? 0);

    dbOps.push(
      fetchAssertion(id, instanceId).then((assertion) => {
        if (assertion) {
          assertion.status = 'Disputed';
          assertion.disputer = disputer;
          return upsertAssertion(assertion, instanceId);
        }
        return null;
      }),
    );

    const dispute: Dispute = {
      id: `D:${id}`,
      chain,
      assertionId: id,
      market: id,
      disputeReason: args.reason as string,
      disputer,
      disputedAt,
      votingEndsAt: new Date(new Date(disputedAt).getTime() + votingPeriodMs).toISOString(),
      txHash,
      blockNumber: blockNumber.toString(10),
      logIndex,
      status: 'Voting',
      currentVotesFor: 0,
      currentVotesAgainst: 0,
      totalVotes: 0,
    };

    dbOps.push(
      insertOracleEvent(
        {
          chain,
          eventType: 'assertion_disputed',
          assertionId: id,
          txHash,
          blockNumber,
          logIndex,
          payload: dispute,
        },
        instanceId,
      ),
    );
    dbOps.push(upsertDispute(dispute, instanceId));
  }

  // 处理 VoteCast 日志
  for (const log of voteLogs) {
    const args = (log as { args?: Record<string, unknown> }).args;
    if (!args) continue;

    const id = args.assertionId as `0x${string}`;
    const support = args.support as boolean;
    const weight = args.weight as bigint;
    const logTxHash = (log as { transactionHash?: string }).transactionHash;
    const txHash = (logTxHash as `0x${string}` | undefined) ?? '0x0';
    const blockNumber = (log as { blockNumber?: bigint }).blockNumber ?? 0n;
    const logIndex = Number((log as { logIndex?: number | bigint }).logIndex ?? 0);
    const voter = (args.voter as `0x${string}` | undefined) ?? '0x0';

    dbOps.push(
      insertVoteEvent(
        {
          chain,
          assertionId: id,
          voter,
          support,
          weight,
          txHash,
          blockNumber,
          logIndex,
        },
        instanceId,
      ).then((inserted) => {
        if (inserted) {
          touchedVotes.add(id);
          return insertOracleEvent(
            {
              chain,
              eventType: 'vote_cast',
              assertionId: id,
              txHash,
              blockNumber,
              logIndex,
              payload: {
                chain,
                assertionId: id,
                voter,
                support,
                weight: weight.toString(10),
                txHash,
                blockNumber: blockNumber.toString(10),
                logIndex,
              },
            },
            instanceId,
          );
        }
        return null;
      }),
    );
  }

  await Promise.all(dbOps);
  await Promise.all(Array.from(touchedVotes).map((id) => recomputeDisputeVotes(id, instanceId)));
}

/**
 * 更新同步指标
 */
async function updateSyncMetrics(
  instanceId: string,
  processedBlock: bigint,
  attemptAt: string,
  startedAt: number,
  latestBlock: bigint,
  safeBlock: bigint,
  rpcActiveUrl: string,
  rpcStats: RpcStats,
  error: string | null,
): Promise<void> {
  const durationMs = Date.now() - startedAt;

  await Promise.all([
    updateSyncState(
      processedBlock,
      attemptAt,
      new Date().toISOString(),
      durationMs,
      error,
      {
        latestBlock,
        safeBlock,
        lastSuccessProcessedBlock: processedBlock,
        consecutiveFailures: error ? 1 : 0,
        rpcActiveUrl,
        rpcStats,
      },
      instanceId,
    ),
    insertSyncMetric(
      {
        lastProcessedBlock: processedBlock,
        latestBlock,
        safeBlock,
        lagBlocks: latestBlock - processedBlock,
        durationMs,
        error,
      },
      instanceId,
    ),
  ]);
}

/**
 * 处理同步错误
 */
async function handleSyncError(
  error: unknown,
  instanceId: string,
  chain: string,
  contractAddress: Address,
  lastProcessedBlock: bigint,
  attemptAt: string,
  startedAt: number,
  syncState: {
    lastProcessedBlock: bigint;
    latestBlock: bigint | null;
    safeBlock: bigint | null;
    lastSuccessProcessedBlock: bigint | null;
    consecutiveFailures: number;
    sync: { lastSuccessAt: string | null; lastDurationMs: number | null };
  },
  latestBlock: bigint | null,
  safeBlock: bigint | null,
  rpcActiveUrl: string,
  rpcStats: RpcStats,
  enabledRules: (event: string) => AlertRule[],
): Promise<void> {
  const code = toSyncErrorCode(error);

  // 创建告警
  for (const rule of enabledRules('sync_error')) {
    const nowMs = Date.now();
    const silencedUntilRaw = (rule.silencedUntil ?? '').trim();
    const silencedUntilMs = silencedUntilRaw ? Date.parse(silencedUntilRaw) : NaN;
    const silenced = Number.isFinite(silencedUntilMs) && silencedUntilMs > nowMs;
    const fingerprint = `${rule.id}:${instanceId}:${chain}:${contractAddress}`;

    await createOrTouchAlert({
      fingerprint,
      type: rule.event,
      severity: rule.severity as AlertSeverity,
      title: 'Oracle sync error',
      message: code,
      entityType: 'oracle',
      entityId: contractAddress,
      notify: silenced
        ? { channels: [] }
        : {
            channels: (rule.channels ?? []) as NotificationChannel[],
            recipient: rule.recipient ?? undefined,
          },
    });
  }

  // 更新同步状态（失败）
  const latestForMetric = latestBlock ?? syncState.latestBlock ?? null;
  const safeForMetric = safeBlock ?? syncState.safeBlock ?? null;

  await updateSyncState(
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

  await insertSyncMetric(
    {
      lastProcessedBlock,
      latestBlock: latestForMetric,
      safeBlock: safeForMetric,
      lagBlocks: latestForMetric !== null ? latestForMetric - lastProcessedBlock : null,
      durationMs: Date.now() - startedAt,
      error: code,
    },
    instanceId,
  );
}
