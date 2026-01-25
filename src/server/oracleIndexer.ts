import { createPublicClient, http, parseAbi, type Address } from "viem";
import type { Assertion, Dispute, OracleChain } from "@/lib/types/oracleTypes";
import { DEFAULT_ORACLE_INSTANCE_ID, readOracleConfig } from "./oracleConfig";
import {
  readOracleState,
  getSyncState,
  fetchAssertion,
  fetchDispute,
  upsertAssertion,
  upsertDispute,
  updateSyncState,
  insertSyncMetric,
  insertVoteEvent,
  insertOracleEvent,
  recomputeDisputeVotes,
  replayOracleEventsRange,
  type StoredState,
} from "./oracleState";
import { isZeroBytes32, parseRpcUrls, toIsoFromSeconds } from "@/lib/utils";
import { env } from "@/lib/config/env";
import { createOrTouchAlert, readAlertRules } from "./observability";
import { logger } from "@/lib/logger";

const abi = parseAbi([
  "event AssertionCreated(bytes32 indexed assertionId,address indexed asserter,string protocol,string market,string assertion,uint256 bondUsd,uint256 assertedAt,uint256 livenessEndsAt,bytes32 txHash)",
  "event AssertionDisputed(bytes32 indexed assertionId,address indexed disputer,string reason,uint256 disputedAt)",
  "event AssertionResolved(bytes32 indexed assertionId,bool outcome,uint256 resolvedAt)",
  "event VoteCast(bytes32 indexed assertionId, address indexed voter, bool support, uint256 weight)",
]);

function getRpcTimeoutMs() {
  const raw = Number(
    env.INSIGHT_RPC_TIMEOUT_MS || env.INSIGHT_DEPENDENCY_TIMEOUT_MS || 10_000,
  );
  return Number.isFinite(raw) && raw > 0 ? raw : 10_000;
}

export async function getOracleEnv(
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
) {
  const normalizedInstanceId = (
    instanceId || DEFAULT_ORACLE_INSTANCE_ID
  ).trim();
  const config = await readOracleConfig(normalizedInstanceId);
  const useEnvOverrides = normalizedInstanceId === DEFAULT_ORACLE_INSTANCE_ID;
  const chain = (config.chain ||
    (useEnvOverrides
      ? (env.INSIGHT_CHAIN as StoredState["chain"] | undefined)
      : undefined) ||
    "Local") as StoredState["chain"];
  const chainRpcUrl =
    chain === "PolygonAmoy"
      ? env.POLYGON_AMOY_RPC_URL
      : chain === "Polygon"
        ? env.POLYGON_RPC_URL
        : chain === "Arbitrum"
          ? env.ARBITRUM_RPC_URL
          : chain === "Optimism"
            ? env.OPTIMISM_RPC_URL
            : "";
  const rpcUrl =
    (useEnvOverrides ? env.INSIGHT_RPC_URL : "") ||
    config.rpcUrl ||
    chainRpcUrl;
  const contractAddress = (config.contractAddress ||
    (useEnvOverrides ? env.INSIGHT_ORACLE_ADDRESS : "")) as Address;
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

const inflightByInstance = new Map<
  string,
  Promise<{ updated: boolean; state: StoredState }>
>();

export async function ensureOracleSynced(
  instanceId: string = DEFAULT_ORACLE_INSTANCE_ID,
) {
  const normalizedInstanceId = (
    instanceId || DEFAULT_ORACLE_INSTANCE_ID
  ).trim();
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
    const normalizedInstanceId = (
      instanceId || DEFAULT_ORACLE_INSTANCE_ID
    ).trim();
    return inflightByInstance.has(normalizedInstanceId);
  }
  return inflightByInstance.size > 0;
}

function toSyncErrorCode(error: unknown) {
  if (error instanceof Error) {
    const message = error.message;
    if (message === "contract_not_found") return "contract_not_found";
    const lowered = message.toLowerCase();
    if (
      lowered.includes("failed to fetch") ||
      lowered.includes("fetch failed") ||
      lowered.includes("econnrefused") ||
      lowered.includes("timeout") ||
      lowered.includes("timed out") ||
      lowered.includes("socket")
    ) {
      return "rpc_unreachable";
    }
  }
  return "sync_failed";
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
    u.username = "";
    u.password = "";
    u.search = "";
    u.hash = "";
    const segments = u.pathname.split("/").filter(Boolean);
    if (segments.length > 0) {
      for (let i = 0; i < segments.length; i += 1) {
        const seg = segments[i] ?? "";
        const looksLikeToken =
          seg.length >= 16 &&
          /^[a-zA-Z0-9_-]+$/.test(seg) &&
          !seg.includes(".");

        if (looksLikeToken) segments[i] = "<redacted>";
      }
      if (segments.length > 6) {
        segments.splice(6, segments.length - 6, "…");
      }
      u.pathname = "/" + segments.join("/");
    }
    return u.toString();
  } catch {
    const trimmed = raw.trim();
    if (trimmed.length <= 140) return trimmed;
    return trimmed.slice(0, 140) + "…";
  }
}

function readRpcStats(input: unknown): RpcStats {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
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
    prev.avgLatencyMs === null
      ? latencyMs
      : Math.round(prev.avgLatencyMs * 0.8 + latencyMs * 0.2);

  stats[url] = {
    ...prev,
    ok: prev.ok + 1,
    lastOkAt: new Date().toISOString(),
    avgLatencyMs: avg,
  };
  if (Math.random() < 0.01)
    logger.info("rpc_sample", { url: redactRpcUrl(url), ok: true, latencyMs });
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
  if (Math.random() < 0.01)
    logger.warn("rpc_sample", { url: redactRpcUrl(url), ok: false });
}

function pickNextRpcUrl(urls: string[], current: string): string {
  if (urls.length <= 1) return current;
  const idx = urls.indexOf(current);
  if (idx >= 0) {
    const nextIdx = (idx + 1) % urls.length;

    return urls[nextIdx]!;
  }
  return urls[0]!;
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
  const degraded = ["1", "true"].includes(
    (env.INSIGHT_VOTING_DEGRADATION || "").toLowerCase(),
  );
  const voteTrackingEnabled =
    ["1", "true"].includes((env.INSIGHT_ENABLE_VOTING || "").toLowerCase()) &&
    !["1", "true"].includes(
      (env.INSIGHT_DISABLE_VOTE_TRACKING || "").toLowerCase(),
    );
  const effectiveVoteTrackingEnabled = voteTrackingEnabled && !degraded;
  const syncState = await getSyncState(instanceId);
  let lastProcessedBlock = syncState.lastProcessedBlock;
  const alertRules = await readAlertRules();
  const enabledRules = (event: string) =>
    alertRules.filter((r) => r.enabled && r.event === event);

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
    ) => {
      const urlsToTry = rpcUrls.length > 0 ? rpcUrls : [rpcActiveUrl];
      let lastErr: unknown = null;
      for (let i = 0; i < urlsToTry.length; i += 1) {
        const url =
          i === 0 ? rpcActiveUrl : pickNextRpcUrl(urlsToTry, rpcActiveUrl);
        rpcActiveUrl = url;
        const client = createPublicClient({
          transport: http(url, { timeout: getRpcTimeoutMs() }),
        });

        const MAX_RETRIES = 3;
        for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
          const t0 = Date.now();
          try {
            const result = await op(client);
            recordRpcOk(rpcStats, url, Date.now() - t0);
            return result;
          } catch (e) {
            lastErr = e;
            const code = toSyncErrorCode(e);

            if (code === "rpc_unreachable") {
              recordRpcFail(rpcStats, url);
              if (attempt < MAX_RETRIES - 1) {
                const backoff = 1000 * Math.pow(2, attempt);
                logger.warn(
                  `RPC ${redactRpcUrl(url)} unreachable (attempt ${
                    attempt + 1
                  }/${MAX_RETRIES}), retrying in ${backoff}ms...`,
                );
                await new Promise((r) => setTimeout(r, backoff));
                continue;
              }
            } else {
              break;
            }
          }
        }

        const code = toSyncErrorCode(lastErr);
        if (code !== "rpc_unreachable") break;
      }
      throw lastErr instanceof Error ? lastErr : new Error("rpc_unreachable");
    };

    const bytecode = await withRpc((client) =>
      client.getBytecode({ address: contractAddress }),
    );
    if (!bytecode || bytecode === "0x") {
      throw new Error("contract_not_found");
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

    if (initialCursor > toBlock) {
      const durationMs = Date.now() - startedAt;
      await updateSyncState(
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
      await insertSyncMetric(
        {
          lastProcessedBlock: syncState.lastProcessedBlock,
          latestBlock: latest,
          safeBlock: toBlock,
          lagBlocks: latest - syncState.lastProcessedBlock,
          durationMs,
          error: null,
        },
        instanceId,
      );
      return { updated: false, state: await readOracleState(instanceId) };
    }

    let updated = false;
    let cursor = initialCursor;
    let window = maxBlockRange > 0n ? maxBlockRange : 10_000n;

    while (cursor <= toBlock) {
      const rangeTo =
        cursor + window - 1n <= toBlock ? cursor + window - 1n : toBlock;

      let attempts = 0;
      while (true) {
        try {
          const [createdLogs, disputedLogs, resolvedLogs, voteLogs] =
            await withRpc((client) =>
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

          for (const log of createdLogs) {
            const args = log.args;
            if (!args) continue;
            const id = args.assertionId as `0x${string}`;
            const assertedAt = toIsoFromSeconds(args.assertedAt as bigint);
            const livenessEndsAt = toIsoFromSeconds(
              args.livenessEndsAt as bigint,
            );
            const txHashArg = args.txHash as `0x${string}` | undefined;
            const txHash = !isZeroBytes32(txHashArg)
              ? txHashArg!
              : ((log.transactionHash as `0x${string}`) ?? "0x0");
            const blockNumber =
              typeof log.blockNumber === "bigint" ? log.blockNumber : 0n;
            const logIndex =
              typeof log.logIndex === "number"
                ? log.logIndex
                : Number(log.logIndex ?? 0);

            const assertion: Assertion = {
              id,
              chain: chain as Assertion["chain"],
              asserter: args.asserter as `0x${string}`,
              protocol: args.protocol as string,
              market: args.market as string,
              assertion: args.assertion as string,
              assertedAt,
              livenessEndsAt,
              blockNumber: blockNumber.toString(10),
              logIndex,
              resolvedAt: undefined,
              status: "Pending",
              bondUsd: Number(args.bondUsd as bigint),
              txHash,
            };

            await insertOracleEvent(
              {
                chain: chain as OracleChain,
                eventType: "assertion_created",
                assertionId: id,
                txHash,
                blockNumber,
                logIndex,
                payload: assertion,
              },
              instanceId,
            );
            await upsertAssertion(assertion, instanceId);
            updated = true;
          }

          for (const log of disputedLogs) {
            const args = log.args;
            if (!args) continue;
            const id = args.assertionId as `0x${string}`;
            const disputedAt = toIsoFromSeconds(args.disputedAt as bigint);
            const disputer = args.disputer as `0x${string}`;
            const txHash =
              (log.transactionHash as `0x${string}` | undefined) ?? "0x0";
            const blockNumber =
              typeof log.blockNumber === "bigint" ? log.blockNumber : 0n;
            const logIndex =
              typeof log.logIndex === "number"
                ? log.logIndex
                : Number(log.logIndex ?? 0);

            const assertion = await fetchAssertion(id, instanceId);
            if (assertion) {
              assertion.status = "Disputed";
              assertion.disputer = disputer;
              await upsertAssertion(assertion, instanceId);
              updated = true;
            }

            const dispute: Dispute = {
              id: `D:${id}`,
              chain: chain as Dispute["chain"],
              assertionId: id,
              market: assertion?.market ?? id,
              disputeReason: args.reason as string,
              disputer,
              disputedAt,
              votingEndsAt: new Date(
                new Date(disputedAt).getTime() + votingPeriodMs,
              ).toISOString(),
              txHash,
              blockNumber: blockNumber.toString(10),
              logIndex,
              status: "Voting",
              currentVotesFor: 0,
              currentVotesAgainst: 0,
              totalVotes: 0,
            };

            await insertOracleEvent(
              {
                chain: chain as OracleChain,
                eventType: "assertion_disputed",
                assertionId: id,
                txHash,
                blockNumber,
                logIndex,
                payload: dispute,
              },
              instanceId,
            );
            await upsertDispute(dispute, instanceId);
            updated = true;

            for (const rule of enabledRules("dispute_created")) {
              const nowMs = Date.now();
              const silencedUntilRaw = (rule.silencedUntil ?? "").trim();
              const silencedUntilMs = silencedUntilRaw
                ? Date.parse(silencedUntilRaw)
                : NaN;
              const silenced =
                Number.isFinite(silencedUntilMs) && silencedUntilMs > nowMs;
              const fingerprint = `${rule.id}:${instanceId}:${chain}:${id}`;
              await createOrTouchAlert({
                fingerprint,
                type: rule.event,
                severity: rule.severity,
                title: "Dispute detected",
                message: `${assertion?.market ?? id} disputed: ${
                  dispute.disputeReason
                }`,
                entityType: "assertion",
                entityId: id,
                notify: silenced
                  ? { channels: [] }
                  : {
                      channels: rule.channels,
                      recipient: rule.recipient ?? undefined,
                    },
              });
            }
          }

          const touchedVotes = new Set<string>();
          for (const log of voteLogs) {
            const args = log.args;
            if (!args) continue;
            const id = args.assertionId as `0x${string}`;
            const support = args.support as boolean;
            const weight = args.weight as bigint;
            const txHash =
              (log.transactionHash as `0x${string}` | undefined) ?? "0x0";
            const blockNumber = (log.blockNumber as bigint | undefined) ?? 0n;
            const logIndex =
              typeof log.logIndex === "number"
                ? log.logIndex
                : Number(log.logIndex ?? 0);
            const voter = (args.voter as `0x${string}` | undefined) ?? "0x0";

            const inserted = await insertVoteEvent(
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
            );
            if (inserted) {
              await insertOracleEvent(
                {
                  chain: chain as OracleChain,
                  eventType: "vote_cast",
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
              touchedVotes.add(id);
              updated = true;
            }
          }

          for (const assertionId of touchedVotes) {
            await recomputeDisputeVotes(assertionId, instanceId);
          }

          for (const log of resolvedLogs) {
            const args = log.args;
            if (!args) continue;
            const id = args.assertionId as `0x${string}`;
            const resolvedAt = toIsoFromSeconds(args.resolvedAt as bigint);
            const outcome = args.outcome as boolean;
            const txHash =
              (log.transactionHash as `0x${string}` | undefined) ?? "0x0";
            const blockNumber =
              typeof log.blockNumber === "bigint" ? log.blockNumber : 0n;
            const logIndex =
              typeof log.logIndex === "number"
                ? log.logIndex
                : Number(log.logIndex ?? 0);

            await insertOracleEvent(
              {
                chain: chain as OracleChain,
                eventType: "assertion_resolved",
                assertionId: id,
                txHash,
                blockNumber,
                logIndex,
                payload: { assertionId: id, resolvedAt, outcome },
              },
              instanceId,
            );
            const assertion = await fetchAssertion(id, instanceId);
            if (assertion) {
              assertion.status = "Resolved";
              assertion.resolvedAt = resolvedAt;
              assertion.settlementResolution = outcome;
              await upsertAssertion(assertion, instanceId);
              updated = true;
            }

            const dispute = await fetchDispute(`D:${id}`, instanceId);
            if (dispute) {
              dispute.status = "Executed";
              dispute.votingEndsAt = resolvedAt;
              await upsertDispute(dispute, instanceId);
              updated = true;
            }
          }

          if (rangeTo > processedHigh) processedHigh = rangeTo;
          await updateSyncState(
            processedHigh,
            attemptAt,
            syncState.sync.lastSuccessAt,
            syncState.sync.lastDurationMs,
            null,
            {
              latestBlock: latest,
              safeBlock: toBlock,
              lastSuccessProcessedBlock: processedHigh,
              consecutiveFailures: 0,
              rpcActiveUrl,
              rpcStats,
            },
            instanceId,
          );
          lastProcessedBlock = processedHigh;
          cursor = rangeTo + 1n;
          break;
        } catch (e) {
          attempts += 1;
          if (window > 200n) {
            window = window / 2n;
            if (window < 200n) window = 200n;
            continue;
          }
          if (attempts < 3) continue;
          const replay = await replayOracleEventsRange(
            cursor,
            rangeTo,
            instanceId,
          );
          if (replay.applied > 0) {
            updated = true;
            if (rangeTo > processedHigh) processedHigh = rangeTo;
            await updateSyncState(
              processedHigh,
              attemptAt,
              syncState.sync.lastSuccessAt,
              syncState.sync.lastDurationMs,
              null,
              {
                latestBlock: latest,
                safeBlock: toBlock,
                lastSuccessProcessedBlock: processedHigh,
                consecutiveFailures: 0,
                rpcActiveUrl,
                rpcStats,
              },
              instanceId,
            );
            lastProcessedBlock = processedHigh;
            cursor = rangeTo + 1n;
            break;
          }
          throw e;
        }
      }
    }

    await updateSyncState(
      processedHigh > toBlock ? processedHigh : toBlock,
      attemptAt,
      new Date().toISOString(),
      Date.now() - startedAt,
      null,
      {
        latestBlock: latest,
        safeBlock: toBlock,
        lastSuccessProcessedBlock:
          processedHigh > toBlock ? processedHigh : toBlock,
        consecutiveFailures: 0,
        rpcActiveUrl,
        rpcStats,
      },
      instanceId,
    );
    await insertSyncMetric(
      {
        lastProcessedBlock: processedHigh > toBlock ? processedHigh : toBlock,
        latestBlock: latest,
        safeBlock: toBlock,
        lagBlocks: latest - (processedHigh > toBlock ? processedHigh : toBlock),
        durationMs: Date.now() - startedAt,
        error: null,
      },
      instanceId,
    );

    return { updated, state: await readOracleState(instanceId) };
  } catch (e) {
    const code = toSyncErrorCode(e);
    for (const rule of enabledRules("sync_error")) {
      const nowMs = Date.now();
      const silencedUntilRaw = (rule.silencedUntil ?? "").trim();
      const silencedUntilMs = silencedUntilRaw
        ? Date.parse(silencedUntilRaw)
        : NaN;
      const silenced =
        Number.isFinite(silencedUntilMs) && silencedUntilMs > nowMs;
      const fingerprint = `${rule.id}:${instanceId}:${chain}:${contractAddress}`;
      await createOrTouchAlert({
        fingerprint,
        type: rule.event,
        severity: rule.severity,
        title: "Oracle sync error",
        message: code,
        entityType: "oracle",
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
        lastSuccessProcessedBlock:
          syncState.lastSuccessProcessedBlock ?? undefined,
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
        lagBlocks:
          latestForMetric !== null
            ? latestForMetric - lastProcessedBlock
            : null,
        durationMs: Date.now() - startedAt,
        error: code,
      },
      instanceId,
    );
    throw e;
  }
}
