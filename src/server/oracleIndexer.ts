import { createPublicClient, http, parseAbi, type Address } from "viem";
import type { Assertion, Dispute, OracleChain } from "@/lib/oracleTypes";
import { readOracleConfig } from "./oracleConfig";
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
  recomputeDisputeVotes,
  type StoredState 
} from "./oracleState";
import { isZeroBytes32, toIsoFromSeconds } from "@/lib/utils";
import { env } from "@/lib/env";
import { createOrTouchAlert, readAlertRules } from "./observability";

const abi = parseAbi([
  "event AssertionCreated(bytes32 indexed assertionId,address indexed asserter,string protocol,string market,string assertion,uint256 bondUsd,uint256 assertedAt,uint256 livenessEndsAt,bytes32 txHash)",
  "event AssertionDisputed(bytes32 indexed assertionId,address indexed disputer,string reason,uint256 disputedAt)",
  "event AssertionResolved(bytes32 indexed assertionId,bool outcome,uint256 resolvedAt)",
  "event VoteCast(bytes32 indexed assertionId, address indexed voter, bool support, uint256 weight)"
]);

export async function getOracleEnv() {
  const config = await readOracleConfig();
  const rpcUrl = config.rpcUrl || env.INSIGHT_RPC_URL;
  const contractAddress = (config.contractAddress || env.INSIGHT_ORACLE_ADDRESS) as Address;
  const chain = (config.chain || (env.INSIGHT_CHAIN as StoredState["chain"] | undefined) || "Local") as StoredState["chain"];
  const startBlock = BigInt(config.startBlock ?? 0);
  const maxBlockRange = BigInt(config.maxBlockRange ?? 10_000);
  const votingPeriodMs = Number(config.votingPeriodHours ?? 72) * 3600 * 1000;
  const confirmationBlocks = BigInt(config.confirmationBlocks ?? 12);
  return { rpcUrl, contractAddress, chain, startBlock, maxBlockRange, votingPeriodMs, confirmationBlocks };
}

let inflight: Promise<{ updated: boolean; state: StoredState }> | null = null;

export async function ensureOracleSynced() {
  if (!inflight) {
    inflight = syncOracleOnce().finally(() => {
      inflight = null;
    });
  }
  return inflight;
}

export function isOracleSyncing() {
  return inflight !== null;
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

function parseRpcUrls(value: string) {
  const parts = value
    .split(/[,\s]+/g)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of parts) {
    try {
      const u = new URL(p);
      if (!["http:", "https:", "ws:", "wss:"].includes(u.protocol)) continue;
      if (!out.includes(p)) out.push(p);
    } catch {
      continue;
    }
  }
  return out;
}

function readRpcStats(input: unknown): RpcStats {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  return input as RpcStats;
}

function recordRpcOk(stats: RpcStats, url: string, latencyMs: number) {
  const prev = stats[url] ?? { ok: 0, fail: 0, lastOkAt: null, lastFailAt: null, avgLatencyMs: null };
  const avg =
    prev.avgLatencyMs === null ? latencyMs : Math.round(prev.avgLatencyMs * 0.8 + latencyMs * 0.2);
  stats[url] = { ...prev, ok: prev.ok + 1, lastOkAt: new Date().toISOString(), avgLatencyMs: avg };
}

function recordRpcFail(stats: RpcStats, url: string) {
  const prev = stats[url] ?? { ok: 0, fail: 0, lastOkAt: null, lastFailAt: null, avgLatencyMs: null };
  stats[url] = { ...prev, fail: prev.fail + 1, lastFailAt: new Date().toISOString() };
}

function pickNextRpcUrl(urls: string[], current: string) {
  if (urls.length <= 1) return current;
  const idx = urls.indexOf(current);
  const nextIdx = idx >= 0 ? (idx + 1) % urls.length : 0;
  return urls[nextIdx];
}

async function syncOracleOnce(): Promise<{ updated: boolean; state: StoredState }> {
  const { rpcUrl, contractAddress, chain, startBlock, maxBlockRange, votingPeriodMs, confirmationBlocks } = await getOracleEnv();
  const syncState = await getSyncState();
  let lastProcessedBlock = syncState.lastProcessedBlock;
  const alertRules = await readAlertRules();
  const isRuleEnabled = (event: string) => alertRules.some((r) => r.enabled && r.event === event);

  if (!rpcUrl || !contractAddress) {
    return { updated: false, state: await readOracleState() };
  }

  const attemptAt = new Date().toISOString();
  const startedAt = Date.now();
  let latestBlock: bigint | null = null;
  let safeBlock: bigint | null = null;
  const rpcUrls = parseRpcUrls(rpcUrl);
  const rpcStats = readRpcStats(syncState.rpcStats);
  let rpcActiveUrl =
    (syncState.rpcActiveUrl && rpcUrls.includes(syncState.rpcActiveUrl) ? syncState.rpcActiveUrl : null) ??
    rpcUrls[0] ??
    rpcUrl;

  try {
    const withRpc = async <T,>(op: (client: ReturnType<typeof createPublicClient>) => Promise<T>) => {
      const urlsToTry = rpcUrls.length > 0 ? rpcUrls : [rpcActiveUrl];
      let lastErr: unknown = null;
      for (let i = 0; i < urlsToTry.length; i += 1) {
        const url = i === 0 ? rpcActiveUrl : pickNextRpcUrl(urlsToTry, rpcActiveUrl);
        rpcActiveUrl = url;
        const client = createPublicClient({ transport: http(url) });
        const t0 = Date.now();
        try {
          const result = await op(client);
          recordRpcOk(rpcStats, url, Date.now() - t0);
          return result;
        } catch (e) {
          lastErr = e;
          const code = toSyncErrorCode(e);
          recordRpcFail(rpcStats, url);
          if (code !== "rpc_unreachable") break;
        }
      }
      throw lastErr instanceof Error ? lastErr : new Error("rpc_unreachable");
    };

    const bytecode = await withRpc((client) => client.getBytecode({ address: contractAddress }));
    if (!bytecode || bytecode === "0x") {
      throw new Error("contract_not_found");
    }

    const latest = await withRpc((client) => client.getBlockNumber());
    latestBlock = latest;
    safeBlock = latest > confirmationBlocks ? latest - confirmationBlocks : 0n;
    const fromBlock =
      syncState.lastProcessedBlock === 0n
        ? (startBlock > 0n
            ? startBlock
            : ((safeBlock ?? 0n) > maxBlockRange ? (safeBlock ?? 0n) - maxBlockRange : 0n))
        : (syncState.lastProcessedBlock > 10n ? syncState.lastProcessedBlock - 10n : 0n);
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
          rpcStats
        }
      );
      await insertSyncMetric({
        lastProcessedBlock: syncState.lastProcessedBlock,
        latestBlock: latest,
        safeBlock: toBlock,
        lagBlocks: latest - syncState.lastProcessedBlock,
        durationMs,
        error: null
      });
      return { updated: false, state: await readOracleState() };
    }

    let updated = false;
    let cursor = initialCursor;
    let window = maxBlockRange > 0n ? maxBlockRange : 10_000n;

    while (cursor <= toBlock) {
      const rangeTo = cursor + window - 1n <= toBlock ? cursor + window - 1n : toBlock;

      let attempts = 0;
      while (true) {
        try {
          const [createdLogs, disputedLogs, resolvedLogs, voteLogs] = await withRpc((client) =>
            Promise.all([
              client.getLogs({ address: contractAddress, event: abi[0], fromBlock: cursor, toBlock: rangeTo }),
              client.getLogs({ address: contractAddress, event: abi[1], fromBlock: cursor, toBlock: rangeTo }),
              client.getLogs({ address: contractAddress, event: abi[2], fromBlock: cursor, toBlock: rangeTo }),
              client.getLogs({ address: contractAddress, event: abi[3], fromBlock: cursor, toBlock: rangeTo })
            ])
          );

          for (const log of createdLogs) {
            const args = log.args;
            if (!args) continue;
            const id = args.assertionId as `0x${string}`;
            const assertedAt = toIsoFromSeconds(args.assertedAt as bigint);
            const livenessEndsAt = toIsoFromSeconds(args.livenessEndsAt as bigint);
            const txHashArg = args.txHash as `0x${string}` | undefined;
            const txHash = !isZeroBytes32(txHashArg) ? txHashArg! : ((log.transactionHash as `0x${string}`) ?? "0x0");

            const assertion: Assertion = {
              id,
              chain: chain as Assertion["chain"],
              asserter: args.asserter as `0x${string}`,
              protocol: args.protocol as string,
              market: args.market as string,
              assertion: args.assertion as string,
              assertedAt,
              livenessEndsAt,
              resolvedAt: undefined,
              status: "Pending",
              bondUsd: Number(args.bondUsd as bigint),
              txHash
            };
            
            await upsertAssertion(assertion);
            updated = true;
          }

          for (const log of disputedLogs) {
            const args = log.args;
            if (!args) continue;
            const id = args.assertionId as `0x${string}`;
            const disputedAt = toIsoFromSeconds(args.disputedAt as bigint);
            const disputer = args.disputer as `0x${string}`;

            const assertion = await fetchAssertion(id);
            if (assertion) {
              assertion.status = "Disputed";
              assertion.disputer = disputer;
              await upsertAssertion(assertion);
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
              votingEndsAt: new Date(new Date(disputedAt).getTime() + votingPeriodMs).toISOString(),
              status: "Voting",
              currentVotesFor: 0,
              currentVotesAgainst: 0,
              totalVotes: 0
            };
            
            await upsertDispute(dispute);
            updated = true;

            if (isRuleEnabled("dispute_created")) {
              const fingerprint = `dispute_created:${chain}:${id}`;
              await createOrTouchAlert({
                fingerprint,
                type: "dispute_created",
                severity: "critical",
                title: "Dispute detected",
                message: `${assertion?.market ?? id} disputed: ${dispute.disputeReason}`,
                entityType: "assertion",
                entityId: id
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
            const txHash = (log.transactionHash as `0x${string}` | undefined) ?? "0x0";
            const blockNumber = (log.blockNumber as bigint | undefined) ?? 0n;
            const logIndex = typeof log.logIndex === "number" ? log.logIndex : Number(log.logIndex ?? 0);
            const voter = (args.voter as `0x${string}` | undefined) ?? "0x0";

            const inserted = await insertVoteEvent({
              chain: chain as OracleChain,
              assertionId: id,
              voter,
              support,
              weight,
              txHash,
              blockNumber,
              logIndex
            });
            if (inserted) {
              touchedVotes.add(id);
              updated = true;
            }
          }

          for (const assertionId of touchedVotes) {
            await recomputeDisputeVotes(assertionId);
          }

          for (const log of resolvedLogs) {
            const args = log.args;
            if (!args) continue;
            const id = args.assertionId as `0x${string}`;
            const resolvedAt = toIsoFromSeconds(args.resolvedAt as bigint);
            const outcome = args.outcome as boolean;
            
            const assertion = await fetchAssertion(id);
            if (assertion) {
              assertion.status = "Resolved";
              assertion.resolvedAt = resolvedAt;
              assertion.settlementResolution = outcome;
              await upsertAssertion(assertion);
              updated = true;
            }

            const dispute = await fetchDispute(`D:${id}`);
            if (dispute) {
              dispute.status = "Executed";
              dispute.votingEndsAt = resolvedAt;
              await upsertDispute(dispute);
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
              rpcStats
            }
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
        lastSuccessProcessedBlock: processedHigh > toBlock ? processedHigh : toBlock,
        consecutiveFailures: 0,
        rpcActiveUrl,
        rpcStats
      }
    );
    await insertSyncMetric({
      lastProcessedBlock: processedHigh > toBlock ? processedHigh : toBlock,
      latestBlock: latest,
      safeBlock: toBlock,
      lagBlocks: latest - (processedHigh > toBlock ? processedHigh : toBlock),
      durationMs: Date.now() - startedAt,
      error: null
    });

    return { updated, state: await readOracleState() };

  } catch (e) {
    const code = toSyncErrorCode(e);
    if (isRuleEnabled("sync_error")) {
      const fingerprint = `sync_error:${chain}:${contractAddress}`;
      await createOrTouchAlert({
        fingerprint,
        type: "sync_error",
        severity: "warning",
        title: "Oracle sync error",
        message: code,
        entityType: "oracle",
        entityId: contractAddress
      });
    }
    await updateSyncState(
      lastProcessedBlock,
      attemptAt,
      syncState.sync.lastSuccessAt,
      syncState.sync.lastDurationMs,
      code,
      {
        latestBlock: (latestBlock ?? syncState.latestBlock) ?? undefined,
        safeBlock: (safeBlock ?? syncState.safeBlock) ?? undefined,
        lastSuccessProcessedBlock: syncState.lastSuccessProcessedBlock ?? undefined,
        consecutiveFailures: (syncState.consecutiveFailures ?? 0) + 1,
        rpcActiveUrl,
        rpcStats
      }
    );
    const latestForMetric = latestBlock ?? syncState.latestBlock ?? null;
    const safeForMetric = safeBlock ?? syncState.safeBlock ?? null;
    await insertSyncMetric({
      lastProcessedBlock,
      latestBlock: latestForMetric,
      safeBlock: safeForMetric,
      lagBlocks: latestForMetric !== null ? latestForMetric - lastProcessedBlock : null,
      durationMs: Date.now() - startedAt,
      error: code
    });
    throw e;
  }
}
