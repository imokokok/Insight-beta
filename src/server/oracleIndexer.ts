import { createPublicClient, http, parseAbi, type Address } from 'viem';
import type { Assertion, Dispute, OracleChain } from '@/lib/types/oracleTypes';
import { DEFAULT_ORACLE_INSTANCE_ID, readOracleConfig } from './oracleConfig';
import {
  readOracleState,
  getSyncState,
  fetchAssertion,
  upsertAssertion,
  upsertDispute,
  updateSyncState,
  insertSyncMetric,
  insertVoteEvent,
  insertOracleEvent,
  recomputeDisputeVotes,
  type StoredState,
} from './oracleState';
import { isZeroBytes32, parseRpcUrls, toIsoFromSeconds } from '@/lib/utils';
import { env } from '@/lib/config/env';
import { createOrTouchAlert, readAlertRules } from './observability';
import { logger } from '@/lib/logger';

const abi = parseAbi([
  'event AssertionCreated(bytes32 indexed assertionId,address indexed asserter,string protocol,string market,string assertion,uint256 bondUsd,uint256 assertedAt,uint256 livenessEndsAt,bytes32 txHash)',
  'event AssertionDisputed(bytes32 indexed assertionId,address indexed disputer,string reason,uint256 disputedAt)',
  'event AssertionResolved(bytes32 indexed assertionId,bool outcome,uint256 resolvedAt)',
  'event VoteCast(bytes32 indexed assertionId, address indexed voter, bool support, uint256 weight)',
]);

const DEFAULT_RPC_TIMEOUT_MS = 30_000;
const MIN_BLOCK_WINDOW = 500n;
const MAX_BLOCK_WINDOW = 50_000n;
const ADAPTIVE_GROWTH_FACTOR = 1.5;
const ADAPTIVE_SHRINK_FACTOR = 0.5;
const MAX_CONSECUTIVE_EMPTY_RANGES = 3;
const MAX_RETRY_BACKOFF_MS = 10_000;

function getRpcTimeoutMs() {
  const raw = Number(
    env.INSIGHT_RPC_TIMEOUT_MS || env.INSIGHT_DEPENDENCY_TIMEOUT_MS || DEFAULT_RPC_TIMEOUT_MS,
  );
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_RPC_TIMEOUT_MS;
}

const clientCache = new Map<string, ReturnType<typeof createPublicClient>>();
const CACHE_TTL_MS = 60_000;

function getCachedClient(url: string): ReturnType<typeof createPublicClient> {
  const now = Date.now();
  const cached = clientCache.get(url);
  if (cached) {
    const timestamp = (cached as unknown as { _cacheTimestamp?: number })._cacheTimestamp;
    if (timestamp && now - timestamp < CACHE_TTL_MS) {
      return cached;
    }
    clientCache.delete(url);
  }
  const client = createPublicClient({
    transport: http(url, {
      timeout: getRpcTimeoutMs(),
      retryCount: 0,
    }),
  });
  (client as unknown as { _cacheTimestamp?: number })._cacheTimestamp = now;
  clientCache.set(url, client);
  return client;
}

function cleanupClientCache() {
  const now = Date.now();
  for (const [url, client] of clientCache.entries()) {
    const timestamp = (client as unknown as { _cacheTimestamp?: number })._cacheTimestamp;
    if (timestamp && now - timestamp > CACHE_TTL_MS * 2) {
      clientCache.delete(url);
    }
  }
}

setInterval(cleanupClientCache, CACHE_TTL_MS);

export async function getOracleEnv(instanceId: string = DEFAULT_ORACLE_INSTANCE_ID) {
  const normalizedInstanceId = (instanceId || DEFAULT_ORACLE_INSTANCE_ID).trim();
  const config = await readOracleConfig(normalizedInstanceId);
  const useEnvOverrides = normalizedInstanceId === DEFAULT_ORACLE_INSTANCE_ID;
  const chain = (config.chain ||
    (useEnvOverrides ? (env.INSIGHT_CHAIN as StoredState['chain'] | undefined) : undefined) ||
    'Local') as StoredState['chain'];
  const chainRpcUrl =
    chain === 'PolygonAmoy'
      ? env.POLYGON_AMOY_RPC_URL
      : chain === 'Polygon'
        ? env.POLYGON_RPC_URL
        : chain === 'Arbitrum'
          ? env.ARBITRUM_RPC_URL
          : chain === 'Optimism'
            ? env.OPTIMISM_RPC_URL
            : '';
  const rpcUrl = (useEnvOverrides ? env.INSIGHT_RPC_URL : '') || config.rpcUrl || chainRpcUrl;
  const contractAddress = ((useEnvOverrides ? env.INSIGHT_ORACLE_ADDRESS : '') ||
    config.contractAddress) as Address;
  const startBlock = BigInt(config.startBlock ?? 0);
  const maxBlockRange = BigInt(config.maxBlockRange ?? 10_000);
  const votingPeriodMs = Number(config.votingPeriodHours ?? 72) * 3600 * 1000;
  const confirmationBlocks = BigInt(config.confirmationBlocks ?? 12);
  return {
    rpcUrl,
    contractAddress,
    chain,
    startBlock,
    maxBlockRange,
    votingPeriodMs,
    confirmationBlocks,
  };
}

const inflightByInstance = new Map<string, Promise<{ updated: boolean; state: StoredState }>>();

export async function ensureOracleSynced(instanceId: string = DEFAULT_ORACLE_INSTANCE_ID) {
  const normalizedInstanceId = (instanceId || DEFAULT_ORACLE_INSTANCE_ID).trim();
  const existing = inflightByInstance.get(normalizedInstanceId);
  if (existing) return existing;
  const p = syncOracleOnce(normalizedInstanceId).finally(() => {
    inflightByInstance.delete(normalizedInstanceId);
  });
  inflightByInstance.set(normalizedInstanceId, p);
  return p;
}

export function isOracleSyncing(instanceId?: string) {
  if (instanceId) {
    const normalizedInstanceId = (instanceId || DEFAULT_ORACLE_INSTANCE_ID).trim();
    return inflightByInstance.has(normalizedInstanceId);
  }
  return inflightByInstance.size > 0;
}

function toSyncErrorCode(error: unknown) {
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

type RpcStatsItem = {
  ok: number;
  fail: number;
  lastOkAt: string | null;
  lastFailAt: string | null;
  avgLatencyMs: number | null;
};

type RpcStats = Record<string, RpcStatsItem>;

function redactRpcUrl(raw: string) {
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

function readRpcStats(input: unknown): RpcStats {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return input as RpcStats;
}

function recordRpcOk(stats: RpcStats, url: string, latencyMs: number) {
  const prev = stats[url] ?? {
    ok: 0,
    fail: 0,
    lastOkAt: null,
    lastFailAt: null,
    avgLatencyMs: null,
  };
  const avg =
    prev.avgLatencyMs === null ? latencyMs : Math.round(prev.avgLatencyMs * 0.8 + latencyMs * 0.2);

  stats[url] = {
    ...prev,
    ok: prev.ok + 1,
    lastOkAt: new Date().toISOString(),
    avgLatencyMs: avg,
  };
  if (Math.random() < 0.01)
    logger.info('rpc_sample', { url: redactRpcUrl(url), ok: true, latencyMs });
}

function recordRpcFail(stats: RpcStats, url: string) {
  const prev = stats[url] ?? {
    ok: 0,
    fail: 0,
    lastOkAt: null,
    lastFailAt: null,
    avgLatencyMs: null,
  };

  stats[url] = {
    ...prev,
    fail: prev.fail + 1,
    lastFailAt: new Date().toISOString(),
  };
  if (Math.random() < 0.01) logger.warn('rpc_sample', { url: redactRpcUrl(url), ok: false });
}

function pickNextRpcUrl(urls: string[], current: string): string {
  if (urls.length <= 1) return current;
  const idx = urls.indexOf(current);
  if (idx >= 0) {
    const nextIdx = (idx + 1) % urls.length;
    return urls[nextIdx] ?? urls[0] ?? '';
  }
  return urls[0] ?? '';
}

async function syncOracleOnce(instanceId: string): Promise<{
  updated: boolean;
  state: StoredState;
}> {
  const {
    rpcUrl,
    contractAddress,
    chain,
    startBlock,
    maxBlockRange,
    votingPeriodMs,
    confirmationBlocks,
  } = await getOracleEnv(instanceId);
  const degraded = ['1', 'true'].includes((env.INSIGHT_VOTING_DEGRADATION || '').toLowerCase());
  const voteTrackingEnabled =
    ['1', 'true'].includes((env.INSIGHT_ENABLE_VOTING || '').toLowerCase()) &&
    !['1', 'true'].includes((env.INSIGHT_DISABLE_VOTE_TRACKING || '').toLowerCase());
  const effectiveVoteTrackingEnabled = voteTrackingEnabled && !degraded;
  const syncState = await getSyncState(instanceId);
  const lastProcessedBlock = syncState.lastProcessedBlock;
  const alertRules = await readAlertRules();
  const enabledRules = (event: string) => alertRules.filter((r) => r.enabled && r.event === event);

  if (!rpcUrl || !contractAddress) {
    return { updated: false, state: await readOracleState(instanceId) };
  }

  const attemptAt = new Date().toISOString();
  const startedAt = Date.now();
  let latestBlock: bigint | null = null;
  let safeBlock: bigint | null = null;
  const rpcUrls = parseRpcUrls(rpcUrl);
  const rpcStats = readRpcStats(syncState.rpcStats);
  let rpcActiveUrl: string =
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
        const client = getCachedClient(url);
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
          } catch (e) {
            lastErr = e;
            const code = toSyncErrorCode(e);
            if (code === 'rpc_unreachable') {
              recordRpcFail(rpcStats, url);
              if (attempt < MAX_RETRIES - 1) {
                const backoff = Math.min(baseBackoff * Math.pow(2, attempt), MAX_RETRY_BACKOFF_MS);
                const jitter = Math.random() * 0.3 * backoff;
                const totalBackoff = backoff + jitter;
                logger.warn(
                  `RPC ${redactRpcUrl(url)} unreachable (attempt ${
                    attempt + 1
                  }/${MAX_RETRIES}), retrying in ${Math.round(totalBackoff)}ms...`,
                );
                await new Promise((r) => setTimeout(r, totalBackoff));
                continue;
              }
            } else if (code === 'contract_not_found') {
              throw e;
            } else {
              if (attempt < MAX_RETRIES - 1) {
                const backoff = Math.min(baseBackoff * Math.pow(2, attempt), MAX_RETRY_BACKOFF_MS);
                const jitter = Math.random() * 0.2 * backoff;
                const totalBackoff = backoff + jitter;
                logger.warn(
                  `RPC ${redactRpcUrl(url)} error: ${(e as Error).message} (attempt ${
                    attempt + 1
                  }/${MAX_RETRIES}), retrying in ${Math.round(totalBackoff)}ms...`,
                );
                await new Promise((r) => setTimeout(r, totalBackoff));
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

    const bytecode = await withRpc((client) => client.getBytecode({ address: contractAddress }));
    if (!bytecode || bytecode === '0x') {
      throw new Error('contract_not_found');
    }

    const latest = await withRpc((client) => client.getBlockNumber());
    latestBlock = latest;
    safeBlock = latest > confirmationBlocks ? latest - confirmationBlocks : 0n;
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
    const toBlock = safeBlock ?? latest;
    const initialCursor = fromBlock < startBlock ? startBlock : fromBlock;
    let processedHigh = syncState.lastProcessedBlock;
    const lastWindowSize = syncState.lastProcessedBlock > 0n ? maxBlockRange : MIN_BLOCK_WINDOW;
    let window = lastWindowSize;

    if (initialCursor > toBlock) {
      const durationMs = Date.now() - startedAt;
      await Promise.all([
        updateSyncState(
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
        ),
        insertSyncMetric(
          {
            lastProcessedBlock: syncState.lastProcessedBlock,
            latestBlock: latest,
            safeBlock: toBlock,
            lagBlocks: latest - syncState.lastProcessedBlock,
            durationMs,
            error: null,
          },
          instanceId,
        ),
      ]);
      return { updated: false, state: await readOracleState(instanceId) };
    }

    let updated = false;
    let cursor = initialCursor;
    let consecutiveEmptyRanges = 0;

    while (cursor <= toBlock) {
      const rangeTo = cursor + window - 1n <= toBlock ? cursor + window - 1n : toBlock;
      const rangeSize = rangeTo - cursor + 1n;
      const rangeStartTime = Date.now();

      let attempts = 0;
      let rangeSuccess = false;
      let logsInRange = 0;

      while (!rangeSuccess && attempts < 3) {
        try {
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
              effectiveVoteTrackingEnabled
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
          const dbOps: Promise<unknown>[] = [];
          const touchedVotes = new Set<string>();

          for (const log of createdLogs) {
            const args = log.args;
            if (!args) continue;
            const id = args.assertionId as `0x${string}`;
            const assertedAt = toIsoFromSeconds(args.assertedAt as bigint);
            const livenessEndsAt = toIsoFromSeconds(args.livenessEndsAt as bigint);
            const txHashArg = args.txHash as `0x${string}` | undefined;
            const txHash = !isZeroBytes32(txHashArg)
              ? (txHashArg ?? (log.transactionHash as `0x${string}`) ?? '0x0')
              : ((log.transactionHash as `0x${string}`) ?? '0x0');
            const blockNumber = typeof log.blockNumber === 'bigint' ? log.blockNumber : 0n;
            const logIndex =
              typeof log.logIndex === 'number' ? log.logIndex : Number(log.logIndex ?? 0);

            const assertion: Assertion = {
              id,
              chain: chain as Assertion['chain'],
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
                  chain: chain as OracleChain,
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

          for (const log of disputedLogs) {
            const args = log.args;
            if (!args) continue;
            const id = args.assertionId as `0x${string}`;
            const disputedAt = toIsoFromSeconds(args.disputedAt as bigint);
            const disputer = args.disputer as `0x${string}`;
            const txHash = (log.transactionHash as `0x${string}` | undefined) ?? '0x0';
            const blockNumber = typeof log.blockNumber === 'bigint' ? log.blockNumber : 0n;
            const logIndex =
              typeof log.logIndex === 'number' ? log.logIndex : Number(log.logIndex ?? 0);

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
              chain: chain as Dispute['chain'],
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
                  chain: chain as OracleChain,
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

          for (const log of voteLogs) {
            const args = log.args;
            if (!args) continue;
            const id = args.assertionId as `0x${string}`;
            const support = args.support as boolean;
            const weight = args.weight as bigint;
            const txHash = (log.transactionHash as `0x${string}` | undefined) ?? '0x0';
            const blockNumber = (log.blockNumber as bigint | undefined) ?? 0n;
            const logIndex =
              typeof log.logIndex === 'number' ? log.logIndex : Number(log.logIndex ?? 0);
            const voter = (args.voter as `0x${string}` | undefined) ?? '0x0';

            dbOps.push(
              insertVoteEvent(
                {
                  chain: chain as OracleChain,
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
                      chain: chain as OracleChain,
                      eventType: 'vote_cast',
                      assertionId: id,
                      txHash,
                      blockNumber,
                      logIndex,
                      payload: {
                        chain: chain as OracleChain,
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

          await Promise.all([
            ...dbOps,
            ...Array.from(touchedVotes).map((id) => recomputeDisputeVotes(id, instanceId)),
          ]);

          if (rangeTo > processedHigh) processedHigh = rangeTo;
          rangeSuccess = true;
          updated = updated || logsInRange > 0;

          if (logsInRange === 0) {
            consecutiveEmptyRanges++;
          } else {
            consecutiveEmptyRanges = 0;
            const rangeDuration = Date.now() - rangeStartTime;
            const logsPerSecond = logsInRange / (rangeDuration / 1000);
            if (logsPerSecond > 10 && rangeSize < MAX_BLOCK_WINDOW) {
              window = BigInt(
                Math.min(Number(window) * ADAPTIVE_GROWTH_FACTOR, Number(MAX_BLOCK_WINDOW)),
              );
            }
          }
        } catch (e) {
          attempts++;
          const rangeDuration = Date.now() - rangeStartTime;
          if (attempts < 3 && rangeDuration < getRpcTimeoutMs()) {
            const backoff = Math.min(2000 * Math.pow(2, attempts - 1), MAX_RETRY_BACKOFF_MS);
            logger.warn(
              `Range [${cursor}-${rangeTo}] failed (attempt ${attempts}/3), retrying in ${backoff}ms...`,
            );
            await new Promise((r) => setTimeout(r, backoff));
            window = BigInt(
              Math.max(Number(window) * ADAPTIVE_SHRINK_FACTOR, Number(MIN_BLOCK_WINDOW)),
            );
          } else if (consecutiveEmptyRanges >= MAX_CONSECUTIVE_EMPTY_RANGES) {
            window = BigInt(
              Math.max(Number(window) * ADAPTIVE_SHRINK_FACTOR, Number(MIN_BLOCK_WINDOW)),
            );
            consecutiveEmptyRanges = 0;
          } else {
            window = BigInt(
              Math.max(Number(window) * ADAPTIVE_SHRINK_FACTOR, Number(MIN_BLOCK_WINDOW)),
            );
            throw e;
          }
        }
      }

      if (rangeSuccess && rangeTo > processedHigh) {
        processedHigh = rangeTo;
      }
      cursor = rangeTo + 1n;
    }

    const totalDuration = Date.now() - startedAt;
    await Promise.all([
      updateSyncState(
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
      ),
      insertSyncMetric(
        {
          lastProcessedBlock: processedHigh > toBlock ? processedHigh : toBlock,
          latestBlock: latest,
          safeBlock: toBlock,
          lagBlocks: latest - (processedHigh > toBlock ? processedHigh : toBlock),
          durationMs: totalDuration,
          error: null,
        },
        instanceId,
      ),
    ]);

    return { updated, state: await readOracleState(instanceId) };
  } catch (e) {
    const code = toSyncErrorCode(e);
    for (const rule of enabledRules('sync_error')) {
      const nowMs = Date.now();
      const silencedUntilRaw = (rule.silencedUntil ?? '').trim();
      const silencedUntilMs = silencedUntilRaw ? Date.parse(silencedUntilRaw) : NaN;
      const silenced = Number.isFinite(silencedUntilMs) && silencedUntilMs > nowMs;
      const fingerprint = `${rule.id}:${instanceId}:${chain}:${contractAddress}`;
      await createOrTouchAlert({
        fingerprint,
        type: rule.event,
        severity: rule.severity,
        title: 'Oracle sync error',
        message: code,
        entityType: 'oracle',
        entityId: contractAddress,
        notify: silenced
          ? { channels: [] }
          : {
              channels: rule.channels,
              recipient: rule.recipient ?? undefined,
            },
      });
    }
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
    const latestForMetric = latestBlock ?? syncState.latestBlock ?? null;
    const safeForMetric = safeBlock ?? syncState.safeBlock ?? null;
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
    throw e;
  }
}
