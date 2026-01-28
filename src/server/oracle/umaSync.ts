import { createPublicClient, http, parseAbi, getAddress, type Address } from 'viem';
import type { UMAChain, UMAAssertion, UMADispute, UMAVote } from '@/lib/types/oracleTypes';
import { readUMAConfig, DEFAULT_UMA_INSTANCE_ID } from './umaConfig';
import {
  upsertUMAAssertion,
  upsertUMADispute,
  upsertUMAVote,
  updateUMASyncState,
  getUMASyncState,
  type StoredUMAState,
} from './umaState';
import { decodeIdentifier } from '@/lib/blockchain/umaOptimisticOracle';
import { parseRpcUrls, toIsoFromSeconds } from '@/lib/utils';
import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';

const OOV2_ABI = parseAbi([
  'event PriceProposed(bytes32 indexed identifier, uint256 timestamp, bytes ancillaryData, int256 price, address proposer, uint256 reward)',
  'event PriceDisputed(bytes32 indexed identifier, uint256 timestamp, bytes ancillaryData, address disputer, uint256 disputeBond)',
  'event PriceSettled(bytes32 indexed identifier, uint256 timestamp, bytes ancillaryData, int256 price, uint256 payout)',
]);

const OOV3_ABI = parseAbi([
  'event AssertionMade(bytes32 indexed assertionId, bytes32 indexed claim, address indexed asserter, uint64 bond, bytes32 identifier)',
  'event AssertionDisputed(bytes32 indexed assertionId, address indexed disputer)',
  'event AssertionSettled(bytes32 indexed assertionId, bool indexed settledTruth, uint256 payout)',
  'event VoteEmitted(bytes32 indexed assertionId, address indexed voter, uint256 weight, bool support)',
]);

const DEFAULT_RPC_TIMEOUT_MS = 30_000;
const MIN_BLOCK_WINDOW = 500n;
const MAX_BLOCK_WINDOW = 100_000n;
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

const umaClientCache = new Map<string, ReturnType<typeof createPublicClient>>();
const CACHE_TTL_MS = 60_000;

function getCachedUMAClient(url: string, chainId: number): ReturnType<typeof createPublicClient> {
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

function cleanupUMAClientCache() {
  const now = Date.now();
  for (const [key, client] of umaClientCache.entries()) {
    const timestamp = (client as unknown as { _cacheTimestamp?: number })._cacheTimestamp;
    if (timestamp && now - timestamp > CACHE_TTL_MS * 2) {
      umaClientCache.delete(key);
    }
  }
}

setInterval(cleanupUMAClientCache, CACHE_TTL_MS);

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
  stats[url] = { ...prev, ok: prev.ok + 1, lastOkAt: new Date().toISOString(), avgLatencyMs: avg };
  if (Math.random() < 0.01)
    logger.info('uma_rpc_sample', { url: redactRpcUrl(url), ok: true, latencyMs });
}

function recordRpcFail(stats: RpcStats, url: string) {
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

function pickNextRpcUrl(urls: string[], current: string): string {
  if (urls.length <= 1) return current;
  const idx = urls.indexOf(current);
  if (idx >= 0) {
    const nextIdx = (idx + 1) % urls.length;
    return urls[nextIdx] ?? urls[0] ?? '';
  }
  return urls[0] ?? '';
}

export async function getUMAEnv(instanceId: string = DEFAULT_UMA_INSTANCE_ID) {
  const config = await readUMAConfig(instanceId);
  const chain = config.chain || 'Ethereum';

  const getRpcUrl = () => {
    const chainKey = chain.replace(/[^a-zA-Z]/g, '').toUpperCase();
    const envKey = `UMA_${chainKey}_RPC_URL`;
    return (env[envKey as keyof typeof env] as string) || config.rpcUrl || '';
  };

  const getOOv2Address = () => {
    const chainKey = chain.replace(/[^a-zA-Z]/g, '').toUpperCase();
    const envKey = `UMA_${chainKey}_OPTIMISTIC_ORACLE_V2_ADDRESS`;
    const envAddr = env[envKey as keyof typeof env] as string;
    if (envAddr && /^0x[a-fA-F0-9]{40}$/.test(envAddr)) return envAddr as Address;
    return (config.optimisticOracleV2Address || config.optimisticOracleV3Address) as
      | Address
      | undefined;
  };

  const getOOv3Address = () => {
    const chainKey = chain.replace(/[^a-zA-Z]/g, '').toUpperCase();
    const envKey = `UMA_${chainKey}_OPTIMISTIC_ORACLE_V3_ADDRESS`;
    const envAddr = env[envKey as keyof typeof env] as string;
    if (envAddr && /^0x[a-fA-F0-9]{40}$/.test(envAddr)) return envAddr as Address;
    return config.optimisticOracleV3Address as Address | undefined;
  };

  return {
    rpcUrl: getRpcUrl(),
    ooV2Address: getOOv2Address(),
    ooV3Address: getOOv3Address(),
    chain: chain as UMAChain,
    startBlock: BigInt(config.startBlock ?? 0),
    maxBlockRange: BigInt(config.maxBlockRange ?? 10_000),
    votingPeriodMs: Number(config.votingPeriodHours ?? 72) * 3600 * 1000,
    confirmationBlocks: BigInt(config.confirmationBlocks ?? 12),
  };
}

const umaInflightByInstance = new Map<
  string,
  Promise<{ updated: boolean; state: StoredUMAState }>
>();

export async function ensureUMASynced(instanceId: string = DEFAULT_UMA_INSTANCE_ID) {
  const normalizedInstanceId = (instanceId || DEFAULT_UMA_INSTANCE_ID).trim();
  const existing = umaInflightByInstance.get(normalizedInstanceId);
  if (existing) return existing;
  const p = syncUMAOnce(normalizedInstanceId).finally(() => {
    umaInflightByInstance.delete(normalizedInstanceId);
  });
  umaInflightByInstance.set(normalizedInstanceId, p);
  return p;
}

export function isUMASyncing(instanceId?: string) {
  if (instanceId) {
    const normalizedInstanceId = (instanceId || DEFAULT_UMA_INSTANCE_ID).trim();
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
        const client = getCachedUMAClient(
          url,
          chain === 'Ethereum'
            ? 1
            : chain === 'Polygon'
              ? 137
              : chain === 'Arbitrum'
                ? 42161
                : chain === 'Optimism'
                  ? 10
                  : chain === 'Base'
                    ? 8453
                    : chain === 'PolygonAmoy'
                      ? 80002
                      : 1,
        );
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
                  `UMA RPC ${redactRpcUrl(url)} unreachable (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${Math.round(totalBackoff)}ms...`,
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
                  `UMA RPC ${redactRpcUrl(url)} error: ${(e as Error).message} (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${Math.round(totalBackoff)}ms...`,
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
      await updateUMASyncState(
        processedHigh,
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

    while (cursor <= toBlock) {
      const rangeTo = cursor + window - 1n <= toBlock ? cursor + window - 1n : toBlock;
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
            args: {
              identifier: unknown;
              timestamp: unknown;
              ancillaryData: unknown;
              price: unknown;
              proposer: unknown;
              reward: unknown;
            };
            transactionHash: unknown;
            blockNumber: unknown;
            logIndex: unknown;
          }>;
          const oov2DisputedLogs = (logsResults[1] || []) as Array<{
            args: {
              identifier: unknown;
              timestamp: unknown;
              ancillaryData: unknown;
              disputer: unknown;
              disputeBond: unknown;
            };
            transactionHash: unknown;
            blockNumber: unknown;
            logIndex: unknown;
          }>;
          const oov2SettledLogs = (logsResults[2] || []) as Array<{
            args: {
              identifier: unknown;
              timestamp: unknown;
              ancillaryData: unknown;
              price: unknown;
              payout: unknown;
            };
            transactionHash: unknown;
            blockNumber: unknown;
            logIndex: unknown;
          }>;

          const oov3MadeLogs = (logsResults[3] || []) as Array<{
            args: {
              assertionId: unknown;
              claim: unknown;
              asserter: unknown;
              bond: unknown;
              identifier: unknown;
            };
            transactionHash: unknown;
            blockNumber: unknown;
            logIndex: unknown;
          }>;
          const oov3DisputedLogs = (logsResults[4] || []) as Array<{
            args: { assertionId: unknown; disputer: unknown };
            transactionHash: unknown;
            blockNumber: unknown;
            logIndex: unknown;
          }>;
          const oov3SettledLogs = (logsResults[5] || []) as Array<{
            args: { assertionId: unknown; settledTruth: unknown; payout: unknown };
            transactionHash: unknown;
            blockNumber: unknown;
            logIndex: unknown;
          }>;
          const oov3VoteLogs = (logsResults[6] || []) as Array<{
            args: { assertionId: unknown; voter: unknown; weight: unknown; support: unknown };
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
          const dbOps: Promise<unknown>[] = [];

          for (const log of oov2ProposedLogs) {
            const args = log.args;
            if (!args) continue;
            const identifier = decodeIdentifier(args.identifier as string);
            const ancillaryData = args.ancillaryData
              ? decodeIdentifier(args.ancillaryData as string)
              : '';
            const requestKey = `${identifier}-${args.timestamp}`;

            const assertion: UMAAssertion = {
              id: requestKey,
              chain: chain as UMAChain,
              identifier,
              ancillaryData,
              proposer: getAddress(args.proposer as string),
              proposedValue: args.price as bigint,
              reward: args.reward as bigint,
              proposedAt: toIsoFromSeconds(args.timestamp as bigint),
              livenessEndsAt: undefined,
              disputedAt: undefined,
              settledAt: undefined,
              settlementValue: undefined,
              status: 'Proposed',
              bond: args.reward as bigint,
              disputeBond: 0n,
              txHash: (log.transactionHash as string) ?? '0x0',
              blockNumber: String(log.blockNumber ?? 0),
              logIndex: Number(log.logIndex ?? 0),
              version: 'v2',
            };

            dbOps.push(upsertUMAAssertion(assertion, instanceId));
          }

          for (const log of oov2DisputedLogs) {
            const args = log.args;
            if (!args) continue;
            const identifier = decodeIdentifier(args.identifier as string);
            const ancillaryData = args.ancillaryData
              ? decodeIdentifier(args.ancillaryData as string)
              : '';
            const requestKey = `${identifier}-${args.timestamp}`;

            const dispute: UMADispute = {
              id: `D:${requestKey}`,
              chain: chain as UMAChain,
              assertionId: requestKey,
              identifier,
              ancillaryData,
              disputer: getAddress(args.disputer as string),
              disputeBond: args.disputeBond as bigint,
              disputedAt: new Date().toISOString(),
              votingEndsAt: new Date(Date.now() + votingPeriodMs).toISOString(),
              status: 'Voting',
              currentVotesFor: 0,
              currentVotesAgainst: 0,
              totalVotes: 0,
              txHash: (log.transactionHash as string) ?? '0x0',
              blockNumber: String(log.blockNumber ?? 0),
              logIndex: Number(log.logIndex ?? 0),
              version: 'v2',
            };

            dbOps.push(upsertUMADispute(dispute, instanceId));
          }

          for (const log of oov2SettledLogs) {
            const args = log.args;
            if (!args) continue;
            const identifier = decodeIdentifier(args.identifier as string);
            const ancillaryData = args.ancillaryData
              ? decodeIdentifier(args.ancillaryData as string)
              : '';
            const requestKey = `${identifier}-${args.timestamp}`;

            const assertion: UMAAssertion = {
              id: requestKey,
              chain: chain as UMAChain,
              identifier,
              ancillaryData,
              proposer: '0x0000000000000000000000000000000000000000',
              proposedValue: args.price as bigint,
              reward: 0n,
              proposedAt: toIsoFromSeconds(args.timestamp as bigint),
              livenessEndsAt: undefined,
              disputedAt: undefined,
              settledAt: new Date().toISOString(),
              settlementValue: args.price as bigint,
              status: 'Settled',
              bond: 0n,
              disputeBond: args.payout as bigint,
              txHash: (log.transactionHash as string) ?? '0x0',
              blockNumber: String(log.blockNumber ?? 0),
              logIndex: Number(log.logIndex ?? 0),
              version: 'v2',
            };

            dbOps.push(upsertUMAAssertion(assertion, instanceId));
          }

          for (const log of oov3MadeLogs) {
            const args = log.args;
            if (!args) continue;
            const assertionId = args.assertionId as string;
            const identifier = decodeIdentifier(args.identifier as string);
            const claimHash = args.claim as string;

            const assertion: UMAAssertion = {
              id: assertionId,
              chain: chain as UMAChain,
              identifier,
              ancillaryData: `0x${claimHash.replace(/^0x/, '').slice(0, 64)}`,
              proposer: getAddress(args.asserter as string),
              proposedValue: undefined,
              reward: args.bond as bigint,
              proposedAt: new Date().toISOString(),
              livenessEndsAt: undefined,
              disputedAt: undefined,
              settledAt: undefined,
              settlementValue: undefined,
              status: 'Proposed',
              bond: args.bond as bigint,
              disputeBond: 0n,
              txHash: (log.transactionHash as string) ?? '0x0',
              blockNumber: String(log.blockNumber ?? 0),
              logIndex: Number(log.logIndex ?? 0),
              version: 'v3',
            };

            dbOps.push(upsertUMAAssertion(assertion, instanceId));
          }

          for (const log of oov3DisputedLogs) {
            const args = log.args;
            if (!args) continue;
            const assertionId = args.assertionId as string;

            const dispute: UMADispute = {
              id: `D:${assertionId}`,
              chain: chain as UMAChain,
              assertionId,
              identifier: '',
              ancillaryData: '',
              disputer: getAddress(args.disputer as string),
              disputeBond: 0n,
              disputedAt: new Date().toISOString(),
              votingEndsAt: new Date(Date.now() + votingPeriodMs).toISOString(),
              status: 'Voting',
              currentVotesFor: 0,
              currentVotesAgainst: 0,
              totalVotes: 0,
              txHash: (log.transactionHash as string) ?? '0x0',
              blockNumber: String(log.blockNumber ?? 0),
              logIndex: Number(log.logIndex ?? 0),
              version: 'v3',
            };

            dbOps.push(upsertUMADispute(dispute, instanceId));
          }

          for (const log of oov3SettledLogs) {
            const args = log.args;
            if (!args) continue;
            const assertionId = args.assertionId as string;

            const assertion: UMAAssertion = {
              id: assertionId,
              chain: chain as UMAChain,
              identifier: '',
              ancillaryData: '',
              proposer: '0x0000000000000000000000000000000000000000',
              proposedValue: undefined,
              reward: 0n,
              proposedAt: new Date().toISOString(),
              livenessEndsAt: undefined,
              disputedAt: undefined,
              settledAt: new Date().toISOString(),
              settlementValue: (args.settledTruth as boolean) ? 1n : 0n,
              status: 'Settled',
              bond: 0n,
              disputeBond: args.payout as bigint,
              txHash: (log.transactionHash as string) ?? '0x0',
              blockNumber: String(log.blockNumber ?? 0),
              logIndex: Number(log.logIndex ?? 0),
              version: 'v3',
            };

            dbOps.push(upsertUMAAssertion(assertion, instanceId));
          }

          for (const log of oov3VoteLogs) {
            const args = log.args;
            if (!args) continue;
            const assertionId = args.assertionId as string;

            const vote: UMAVote = {
              chain: chain as UMAChain,
              assertionId,
              voter: getAddress(args.voter as string),
              support: args.support as boolean,
              weight: args.weight as bigint,
              txHash: (log.transactionHash as string) ?? '0x0',
              blockNumber: String(log.blockNumber ?? 0),
              logIndex: Number(log.logIndex ?? 0),
            };

            dbOps.push(upsertUMAVote(vote, instanceId));
          }

          await Promise.all(dbOps);

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
              `UMA Range [${cursor}-${rangeTo}] failed (attempt ${attempts}/3), retrying in ${backoff}ms...`,
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
  } catch (e) {
    const code = toSyncErrorCode(e);
    logger.error('UMA sync failed', { error: e, instanceId, code });
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
    throw e;
  }
}

export async function replayUMAEventsRange(
  _fromBlock: bigint,
  _toBlock: bigint,
  _instanceId: string = DEFAULT_UMA_INSTANCE_ID,
) {
  logger.warn(
    'replayUMAEventsRange not yet implemented - requires full event replay infrastructure',
  );
}
