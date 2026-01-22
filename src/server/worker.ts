import {
  ensureOracleSynced,
  getOracleEnv,
  isOracleSyncing,
} from "./oracleIndexer";
import crypto from "crypto";
import type { PoolClient } from "pg";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getClient, hasDatabase, query } from "@/server/db";
import { getMemoryStore } from "@/server/memoryBackend";
import {
  createOrTouchAlert,
  pruneStaleAlerts,
  readAlertRules,
} from "@/server/observability";
import {
  getSyncState,
  listOracleInstances,
  readOracleState,
} from "@/server/oracle";
import { writeJsonFile } from "@/server/kvStore";
import { fetchCurrentPrice } from "@/server/oracle/priceFetcher";
import { createPublicClient, http, formatEther, parseAbi } from "viem";

const SYNC_INTERVAL = 15000; // 15 seconds
const workerAlertCooldown = new Map<string, number>();

const pausableAbi = parseAbi(["function paused() view returns (bool)"]);

export async function tryAcquireWorkerLock() {
  if (!hasDatabase()) return true;
  if (global.insightWorkerLockClient) return true;
  const name = `insight_worker:${env.INSIGHT_WORKER_ID || "embedded"}`;
  const digest = crypto.createHash("sha256").update(name).digest();
  const raw = BigInt(`0x${Buffer.from(digest.subarray(0, 8)).toString("hex")}`);
  const key = raw % 9223372036854775807n;

  const client = await getClient();
  try {
    const res = await client.query<{ ok: boolean }>(
      "SELECT pg_try_advisory_lock($1::bigint) as ok",
      [key.toString(10)],
    );
    const ok = Boolean(res.rows[0]?.ok);
    if (!ok) {
      client.release();
      return false;
    }
    global.insightWorkerLockClient = client;
    global.insightWorkerLockKey = key.toString(10);
    return true;
  } catch (e) {
    logger.error("Failed to acquire worker lock", { error: e });
    client.release();
    return false;
  }
}

async function tickWorker() {
  if (global.insightWorkerTickInProgress) return;
  global.insightWorkerTickInProgress = true;
  const startedAt = Date.now();
  let lastError: string | null = null;
  try {
    if (hasDatabase() && global.insightWorkerLockClient) {
      try {
        await global.insightWorkerLockClient.query("SELECT 1 as ok");
      } catch (e) {
        logger.error("Worker lock client unhealthy", { error: e });
        try {
          global.insightWorkerLockClient.release();
        } catch (releaseError) {
          logger.error("Failed to release worker lock client", {
            error: releaseError,
          });
        }
        global.insightWorkerLockClient = undefined;
        global.insightWorkerLockKey = undefined;
        if (global.insightWorkerInterval)
          clearInterval(global.insightWorkerInterval);
        global.insightWorkerInterval = undefined;
        global.insightWorkerStarted = false;
        setTimeout(() => startWorker(), 5_000);
        return;
      }
    }

    const nowMs = Date.now();
    const lastMaintenanceAt = global.insightWorkerLastMaintenanceAt ?? 0;
    if (nowMs - lastMaintenanceAt >= 6 * 60 * 60_000) {
      try {
        await pruneStaleAlerts();
      } catch (e) {
        logger.warn("Failed to prune stale alerts", { error: e });
      } finally {
        global.insightWorkerLastMaintenanceAt = nowMs;
      }
    }
    const rules = await readAlertRules();
    const degraded = ["1", "true"].includes(
      (env.INSIGHT_VOTING_DEGRADATION || "").toLowerCase(),
    );
    const voteTrackingEnabled =
      ["1", "true"].includes((env.INSIGHT_ENABLE_VOTING || "").toLowerCase()) &&
      !["1", "true"].includes(
        (env.INSIGHT_DISABLE_VOTE_TRACKING || "").toLowerCase(),
      );
    const effectiveVoteTrackingEnabled = voteTrackingEnabled && !degraded;

    const shouldEmit = (
      event: string,
      fingerprint: string,
      cooldownMs: number,
    ) => {
      const key = `${event}:${fingerprint}`;
      const lastAt = workerAlertCooldown.get(key) ?? 0;
      if (nowMs - lastAt < cooldownMs) return false;
      workerAlertCooldown.set(key, nowMs);
      return true;
    };

    const notifyForRule = (rule: {
      silencedUntil?: string | null;
      channels?: Array<"webhook" | "email" | "telegram">;
      recipient?: string | null;
    }) => {
      const silencedUntilRaw = (rule.silencedUntil ?? "").trim();
      const silencedUntilMs = silencedUntilRaw
        ? Date.parse(silencedUntilRaw)
        : NaN;
      const silenced =
        Number.isFinite(silencedUntilMs) && silencedUntilMs > nowMs;
      return silenced
        ? { channels: [] as Array<"webhook" | "email" | "telegram"> }
        : {
            channels: rule.channels,
            recipient: rule.recipient ?? undefined,
          };
    };

    const getRuleCooldownMs = (rule: { params?: Record<string, unknown> }) => {
      const raw = Number(rule.params?.cooldownMs ?? 5 * 60_000);
      if (!Number.isFinite(raw) || raw <= 0) return 5 * 60_000;
      return Math.min(24 * 60 * 60_000, Math.max(30_000, Math.round(raw)));
    };

    const getRuleEscalateAfterMs = (rule: {
      params?: Record<string, unknown>;
    }) => {
      const raw = Number(rule.params?.escalateAfterMs ?? 0);
      if (!Number.isFinite(raw) || raw <= 0) return null;
      return Math.min(30 * 24 * 60 * 60_000, Math.max(60_000, Math.round(raw)));
    };

    const instances = (await listOracleInstances()).filter((i) => i.enabled);
    for (const inst of instances) {
      const instanceId = inst.id;
      try {
        if (isOracleSyncing(instanceId)) continue;

        const preSyncState = await getSyncState(instanceId);
        const envConfig = await getOracleEnv(instanceId);
        const missingConfig = !envConfig.rpcUrl || !envConfig.contractAddress;
        const consecutiveFailures = preSyncState.consecutiveFailures ?? 0;
        const lastAttemptAtRaw = preSyncState.sync.lastAttemptAt ?? "";
        const lastAttemptAtMs = lastAttemptAtRaw
          ? Date.parse(lastAttemptAtRaw)
          : NaN;
        const baseBackoffMs =
          consecutiveFailures > 0
            ? Math.min(
                5 * 60_000,
                5_000 * 2 ** Math.min(consecutiveFailures - 1, 6),
              )
            : 0;

        const isConfigError =
          missingConfig || preSyncState.sync.lastError === "contract_not_found";

        const backoffMs = isConfigError
          ? Math.max(
              baseBackoffMs,
              consecutiveFailures > 0
                ? Math.min(
                    60 * 60_000,
                    30_000 * 2 ** Math.min(consecutiveFailures - 1, 10),
                  )
                : 60_000,
            )
          : baseBackoffMs;

        const shouldAttemptSync =
          backoffMs === 0 ||
          !Number.isFinite(lastAttemptAtMs) ||
          nowMs - lastAttemptAtMs >= backoffMs;

        if (missingConfig) {
          lastError = "missing_config";
        }

        if (shouldAttemptSync && !missingConfig) {
          await ensureOracleSynced(instanceId);
        }

        const state = await getSyncState(instanceId);

        if (missingConfig) {
          const syncErrorRules = rules.filter(
            (r) => r.enabled && r.event === "sync_error",
          );
          for (const rule of syncErrorRules) {
            const fingerprint = `${rule.id}:${instanceId}:${state.chain}:${
              state.contractAddress ?? "unknown"
            }`;
            if (!shouldEmit(rule.event, fingerprint, getRuleCooldownMs(rule)))
              continue;
            await createOrTouchAlert({
              fingerprint,
              type: rule.event,
              severity: rule.severity,
              title: "Oracle sync error",
              message: "missing_config",
              entityType: "oracle",
              entityId: state.contractAddress,
              notify: notifyForRule(rule),
            });
          }
        }

        const staleRules = rules.filter(
          (r) => r.enabled && r.event === "stale_sync",
        );
        if (staleRules.length > 0) {
          const lastSuccessAt = state.sync.lastSuccessAt;
          if (lastSuccessAt) {
            const ageMs = Date.now() - new Date(lastSuccessAt).getTime();
            for (const staleRule of staleRules) {
              const maxAgeMs = Number(
                (staleRule.params as { maxAgeMs?: unknown } | undefined)
                  ?.maxAgeMs ?? 5 * 60 * 1000,
              );
              if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) continue;
              if (ageMs > maxAgeMs) {
                const fingerprint = `${staleRule.id}:${instanceId}:${state.chain}:${
                  state.contractAddress ?? "unknown"
                }`;
                if (
                  !shouldEmit(
                    staleRule.event,
                    fingerprint,
                    getRuleCooldownMs(staleRule),
                  )
                )
                  continue;
                await createOrTouchAlert({
                  fingerprint,
                  type: staleRule.event,
                  severity: staleRule.severity,
                  title: "Oracle sync stale",
                  message: `Last success ${Math.round(ageMs / 1000)}s ago`,
                  entityType: "oracle",
                  entityId: state.contractAddress,
                  notify: notifyForRule(staleRule),
                });
              }
            }
          }
        }

        const pausedRules = rules.filter(
          (r) => r.enabled && r.event === "contract_paused",
        );
        if (
          pausedRules.length > 0 &&
          state.contractAddress &&
          state.rpcActiveUrl
        ) {
          try {
            const client = createPublicClient({
              transport: http(state.rpcActiveUrl),
            });
            const paused = (await client.readContract({
              address: state.contractAddress as `0x${string}`,
              abi: pausableAbi,
              functionName: "paused",
              args: [],
            })) as boolean;
            if (paused) {
              for (const rule of pausedRules) {
                const fingerprint = `${rule.id}:${instanceId}:${state.chain}:${
                  state.contractAddress ?? "unknown"
                }`;
                if (
                  !shouldEmit(rule.event, fingerprint, getRuleCooldownMs(rule))
                )
                  continue;
                await createOrTouchAlert({
                  fingerprint,
                  type: rule.event,
                  severity: rule.severity,
                  title: "Contract paused",
                  message: "paused() returned true",
                  entityType: "oracle",
                  entityId: state.contractAddress,
                  notify: notifyForRule(rule),
                });
              }
            }
          } catch {
            void 0;
          }
        }

        const backlogRules = rules.filter(
          (r) =>
            r.enabled &&
            (r.event === "sync_backlog" ||
              r.event === "backlog_assertions" ||
              r.event === "backlog_disputes" ||
              r.event === "market_stale"),
        );

        if (backlogRules.length > 0) {
          const lagBlocks =
            state.latestBlock !== null &&
            state.latestBlock !== undefined &&
            state.lastProcessedBlock !== null &&
            state.lastProcessedBlock !== undefined
              ? state.latestBlock - state.lastProcessedBlock
              : null;

          const oracleState = await readOracleState(instanceId);
          const assertions = Object.values(oracleState.assertions);
          const disputes = Object.values(oracleState.disputes);

          const openAssertions = assertions.filter(
            (a) => a.status !== "Resolved",
          ).length;
          const openDisputes = disputes.filter(
            (d) => d.status !== "Executed",
          ).length;
          const newestAssertedAtMs = assertions.reduce((acc, a) => {
            const ms = Date.parse(a.assertedAt);
            if (!Number.isFinite(ms)) return acc;
            return Math.max(acc, ms);
          }, 0);

          for (const rule of backlogRules) {
            if (rule.event === "sync_backlog") {
              const maxLagBlocks = Number(
                (rule.params as { maxLagBlocks?: unknown } | undefined)
                  ?.maxLagBlocks ?? 200,
              );
              if (!Number.isFinite(maxLagBlocks) || maxLagBlocks <= 0) continue;
              if (lagBlocks === null) continue;
              if (lagBlocks <= BigInt(Math.floor(maxLagBlocks))) continue;
              const fingerprint = `${rule.id}:${instanceId}:${state.chain}:${
                state.contractAddress ?? "unknown"
              }`;
              if (!shouldEmit(rule.event, fingerprint, getRuleCooldownMs(rule)))
                continue;
              await createOrTouchAlert({
                fingerprint,
                type: rule.event,
                severity: rule.severity,
                title: "Sync backlog high",
                message: `lagBlocks ${lagBlocks.toString(10)} > ${Math.floor(
                  maxLagBlocks,
                )}`,
                entityType: "oracle",
                entityId: state.contractAddress,
                notify: notifyForRule(rule),
              });
            }

            if (rule.event === "backlog_assertions") {
              const maxOpenAssertions = Number(
                (rule.params as { maxOpenAssertions?: unknown } | undefined)
                  ?.maxOpenAssertions ?? 50,
              );
              if (
                !Number.isFinite(maxOpenAssertions) ||
                maxOpenAssertions <= 0 ||
                openAssertions <= maxOpenAssertions
              )
                continue;
              const fingerprint = `${rule.id}:${instanceId}:${state.chain}:${
                state.contractAddress ?? "unknown"
              }`;
              if (!shouldEmit(rule.event, fingerprint, getRuleCooldownMs(rule)))
                continue;
              await createOrTouchAlert({
                fingerprint,
                type: rule.event,
                severity: rule.severity,
                title: "Assertion backlog high",
                message: `${openAssertions} open assertions > ${Math.floor(
                  maxOpenAssertions,
                )}`,
                entityType: "oracle",
                entityId: state.contractAddress,
                notify: notifyForRule(rule),
              });
            }

            if (rule.event === "backlog_disputes") {
              const maxOpenDisputes = Number(
                (rule.params as { maxOpenDisputes?: unknown } | undefined)
                  ?.maxOpenDisputes ?? 20,
              );
              if (
                !Number.isFinite(maxOpenDisputes) ||
                maxOpenDisputes <= 0 ||
                openDisputes <= maxOpenDisputes
              )
                continue;
              const fingerprint = `${rule.id}:${instanceId}:${state.chain}:${
                state.contractAddress ?? "unknown"
              }`;
              if (!shouldEmit(rule.event, fingerprint, getRuleCooldownMs(rule)))
                continue;
              await createOrTouchAlert({
                fingerprint,
                type: rule.event,
                severity: rule.severity,
                title: "Dispute backlog high",
                message: `${openDisputes} open disputes > ${Math.floor(
                  maxOpenDisputes,
                )}`,
                entityType: "oracle",
                entityId: state.contractAddress,
                notify: notifyForRule(rule),
              });
            }

            if (rule.event === "market_stale") {
              const maxAgeMs = Number(
                (rule.params as { maxAgeMs?: unknown } | undefined)?.maxAgeMs ??
                  6 * 60 * 60_000,
              );
              if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) continue;
              if (newestAssertedAtMs <= 0) continue;
              const ageMs = nowMs - newestAssertedAtMs;
              if (ageMs <= maxAgeMs) continue;
              const fingerprint = `${rule.id}:${instanceId}:${state.chain}:${
                state.contractAddress ?? "unknown"
              }`;
              if (!shouldEmit(rule.event, fingerprint, getRuleCooldownMs(rule)))
                continue;
              await createOrTouchAlert({
                fingerprint,
                type: rule.event,
                severity: rule.severity,
                title: "Market data stale",
                message: `last assertion ${Math.round(ageMs / 60_000)}m ago`,
                entityType: "oracle",
                entityId: state.contractAddress,
                notify: notifyForRule(rule),
              });
            }
          }
        }

        const livenessRules = rules.filter(
          (r) => r.enabled && r.event === "liveness_expiring",
        );
        if (livenessRules.length > 0) {
          const oracleState = await readOracleState(instanceId);
          const assertions = Object.values(oracleState.assertions);

          for (const assertion of assertions) {
            if (assertion.status === "Resolved") continue;
            const livenessEndsAtMs = Date.parse(assertion.livenessEndsAt);
            if (!Number.isFinite(livenessEndsAtMs)) continue;
            const remainingMs = livenessEndsAtMs - nowMs;
            if (remainingMs <= 0) continue;

            for (const rule of livenessRules) {
              const withinMinutes = Number(
                (rule.params as { withinMinutes?: unknown } | undefined)
                  ?.withinMinutes ?? 60,
              );
              if (!Number.isFinite(withinMinutes) || withinMinutes <= 0)
                continue;
              if (remainingMs > withinMinutes * 60_000) continue;

              const fingerprint = `${rule.id}:${instanceId}:${assertion.chain}:${assertion.id}`;
              if (!shouldEmit(rule.event, fingerprint, getRuleCooldownMs(rule)))
                continue;

              await createOrTouchAlert({
                fingerprint,
                type: rule.event,
                severity: rule.severity,
                title: "Liveness expiring",
                message: `${assertion.market} • ${Math.max(
                  0,
                  Math.ceil(remainingMs / 60_000),
                )}m remaining`,
                entityType: "assertion",
                entityId: assertion.id,
                notify: notifyForRule(rule),
              });
            }
          }
        }

        const disputeRules = rules.filter(
          (r) =>
            r.enabled &&
            (r.event === "execution_delayed" ||
              r.event === "low_participation" ||
              r.event === "high_vote_divergence"),
        );

        if (disputeRules.length > 0 && effectiveVoteTrackingEnabled) {
          const oracleState = await readOracleState(instanceId);
          const disputes = Object.values(oracleState.disputes);

          for (const dispute of disputes) {
            if (dispute.status !== "Voting") continue;
            const disputedAtMs = Date.parse(dispute.disputedAt);
            const votingEndsAtMs = Date.parse(dispute.votingEndsAt);
            if (
              !Number.isFinite(disputedAtMs) ||
              !Number.isFinite(votingEndsAtMs)
            )
              continue;

            const totalVotes = Number(dispute.totalVotes);
            const votesFor = Number(dispute.currentVotesFor);
            const votesAgainst = Number(dispute.currentVotesAgainst);
            const marginPercent =
              totalVotes > 0
                ? (Math.abs(votesFor - votesAgainst) / totalVotes) * 100
                : 100;

            for (const rule of disputeRules) {
              if (rule.event === "execution_delayed") {
                const maxDelayMinutes = Number(
                  (rule.params as { maxDelayMinutes?: unknown } | undefined)
                    ?.maxDelayMinutes ?? 30,
                );
                if (!Number.isFinite(maxDelayMinutes) || maxDelayMinutes <= 0)
                  continue;
                const thresholdMs = votingEndsAtMs + maxDelayMinutes * 60_000;
                if (nowMs <= thresholdMs) continue;

                const fingerprint = `${rule.id}:${instanceId}:${dispute.chain}:${dispute.assertionId}`;
                if (
                  !shouldEmit(rule.event, fingerprint, getRuleCooldownMs(rule))
                )
                  continue;
                const delayMinutes = Math.max(
                  0,
                  Math.round((nowMs - votingEndsAtMs) / 60_000),
                );

                await createOrTouchAlert({
                  fingerprint,
                  type: rule.event,
                  severity: rule.severity,
                  title: "Dispute execution delayed",
                  message: `${dispute.market} • ${delayMinutes}m past voting end • votes ${totalVotes}`,
                  entityType: "assertion",
                  entityId: dispute.assertionId,
                  notify: notifyForRule(rule),
                });
              }

              if (rule.event === "low_participation") {
                const withinMinutes = Number(
                  (rule.params as { withinMinutes?: unknown } | undefined)
                    ?.withinMinutes ?? 60,
                );
                const minTotalVotes = Number(
                  (rule.params as { minTotalVotes?: unknown } | undefined)
                    ?.minTotalVotes ?? 0,
                );
                if (!Number.isFinite(withinMinutes) || withinMinutes <= 0)
                  continue;
                if (!Number.isFinite(minTotalVotes) || minTotalVotes < 0)
                  continue;

                if (nowMs - disputedAtMs < withinMinutes * 60_000) continue;
                if (totalVotes > minTotalVotes) continue;

                const fingerprint = `${rule.id}:${instanceId}:${dispute.chain}:${dispute.assertionId}`;
                if (
                  !shouldEmit(rule.event, fingerprint, getRuleCooldownMs(rule))
                )
                  continue;

                await createOrTouchAlert({
                  fingerprint,
                  type: rule.event,
                  severity: rule.severity,
                  title: "Low dispute participation",
                  message: `${dispute.market} • votes ${totalVotes} after ${Math.round(
                    withinMinutes,
                  )}m`,
                  entityType: "assertion",
                  entityId: dispute.assertionId,
                  notify: notifyForRule(rule),
                });
              }

              if (rule.event === "high_vote_divergence") {
                const withinMinutes = Number(
                  (rule.params as { withinMinutes?: unknown } | undefined)
                    ?.withinMinutes ?? 15,
                );
                const minTotalVotes = Number(
                  (rule.params as { minTotalVotes?: unknown } | undefined)
                    ?.minTotalVotes ?? 1,
                );
                const maxMarginPercent = Number(
                  (rule.params as { maxMarginPercent?: unknown } | undefined)
                    ?.maxMarginPercent ?? 10,
                );

                if (!Number.isFinite(withinMinutes) || withinMinutes <= 0)
                  continue;
                if (!Number.isFinite(minTotalVotes) || minTotalVotes <= 0)
                  continue;
                if (
                  !Number.isFinite(maxMarginPercent) ||
                  maxMarginPercent <= 0 ||
                  maxMarginPercent > 100
                )
                  continue;

                if (totalVotes < minTotalVotes) continue;
                if (marginPercent > maxMarginPercent) continue;

                const minsToEnd = (votingEndsAtMs - nowMs) / 60_000;
                if (minsToEnd < 0 || minsToEnd > withinMinutes) continue;

                const fingerprint = `${rule.id}:${instanceId}:${dispute.chain}:${dispute.assertionId}`;
                if (
                  !shouldEmit(rule.event, fingerprint, getRuleCooldownMs(rule))
                )
                  continue;

                await createOrTouchAlert({
                  fingerprint,
                  type: rule.event,
                  severity: rule.severity,
                  title: "Vote divergence risk",
                  message: `${dispute.market} • margin ${marginPercent.toFixed(
                    1,
                  )}% • votes ${totalVotes} • ${Math.max(
                    0,
                    Math.round(minsToEnd),
                  )}m to end`,
                  entityType: "assertion",
                  entityId: dispute.assertionId,
                  notify: notifyForRule(rule),
                });
              }
            }
          }
        }

        const deviationRules = rules.filter(
          (r) => r.enabled && r.event === "price_deviation",
        );
        if (deviationRules.length > 0) {
          const symbol = env.INSIGHT_PRICE_SYMBOL || "ETH";
          const { referencePrice, oraclePrice } = await fetchCurrentPrice(
            symbol,
            {
              rpcUrl: state.rpcActiveUrl ?? null,
            },
          );
          const deviation =
            referencePrice > 0
              ? Math.abs(oraclePrice - referencePrice) / referencePrice
              : 0;
          const deviationPercent = deviation * 100;

          for (const rule of deviationRules) {
            const threshold = Number(
              (rule.params as { thresholdPercent?: unknown })
                ?.thresholdPercent ?? 2,
            );
            if (deviationPercent > threshold) {
              const fingerprint = `price_deviation:${instanceId}:${symbol}:${
                state.contractAddress ?? "unknown"
              }`;
              if (!shouldEmit(rule.event, fingerprint, getRuleCooldownMs(rule)))
                continue;

              await createOrTouchAlert({
                fingerprint,
                type: rule.event,
                severity: rule.severity,
                title: "Price Deviation Detected",
                message: `Oracle: $${oraclePrice}, Ref: $${referencePrice}, Deviation: ${deviationPercent.toFixed(
                  2,
                )}% > ${threshold}%`,
                entityType: "oracle",
                entityId: state.contractAddress,
                notify: notifyForRule(rule),
              });
            }
          }
        }

        const lowGasRules = rules.filter(
          (r) => r.enabled && r.event === "low_gas",
        );
        if (lowGasRules.length > 0 && state.owner && state.rpcActiveUrl) {
          try {
            const client = createPublicClient({
              transport: http(state.rpcActiveUrl),
            });
            const balanceWei = await client.getBalance({
              address: state.owner as `0x${string}`,
            });
            const balanceEth = Number(formatEther(balanceWei));

            for (const rule of lowGasRules) {
              const minBalance = Number(
                (rule.params as { minBalanceEth?: unknown })?.minBalanceEth ??
                  0.1,
              );
              if (balanceEth < minBalance) {
                const fingerprint = `low_gas:${instanceId}:${state.owner}`;
                if (
                  !shouldEmit(rule.event, fingerprint, getRuleCooldownMs(rule))
                )
                  continue;

                await createOrTouchAlert({
                  fingerprint,
                  type: rule.event,
                  severity: rule.severity,
                  title: "Low Gas Balance",
                  message: `Owner ${state.owner.slice(
                    0,
                    6,
                  )}... has ${balanceEth.toFixed(4)} ETH < ${minBalance} ETH`,
                  entityType: "account",
                  entityId: state.owner,
                  notify: notifyForRule(rule),
                });
              }
            }
          } catch (e) {
            logger.error("Failed to check gas balance", {
              error: e,
              instanceId,
            });
          }
        }

        const disputeRateRules = rules.filter(
          (r) => r.enabled && r.event === "high_dispute_rate",
        );
        if (disputeRateRules.length > 0) {
          const contract = state.contractAddress ?? "unknown";
          for (const rule of disputeRateRules) {
            const windowDays = Number(
              (rule.params as { windowDays?: unknown } | undefined)
                ?.windowDays ?? 7,
            );
            const minAssertions = Number(
              (rule.params as { minAssertions?: unknown } | undefined)
                ?.minAssertions ?? 20,
            );
            const thresholdPercent = Number(
              (rule.params as { thresholdPercent?: unknown } | undefined)
                ?.thresholdPercent ?? 10,
            );
            if (!Number.isFinite(windowDays) || windowDays <= 0) continue;
            if (!Number.isFinite(minAssertions) || minAssertions <= 0) continue;
            if (
              !Number.isFinite(thresholdPercent) ||
              thresholdPercent <= 0 ||
              thresholdPercent > 100
            )
              continue;

            let totalAssertions = 0;
            let disputedAssertions = 0;

            if (hasDatabase()) {
              const totalRes = await query<{ total: string | number }>(
                `
                SELECT COUNT(*) as total
                FROM assertions
                WHERE asserted_at > NOW() - INTERVAL '1 day' * $1
                  AND instance_id = $2
                `,
                [windowDays, instanceId],
              );
              totalAssertions = Number(totalRes.rows[0]?.total ?? 0);

              const disputedRes = await query<{ total: string | number }>(
                `
                SELECT COUNT(DISTINCT assertion_id) as total
                FROM disputes
                WHERE disputed_at > NOW() - INTERVAL '1 day' * $1
                  AND instance_id = $2
                `,
                [windowDays, instanceId],
              );
              disputedAssertions = Number(disputedRes.rows[0]?.total ?? 0);
            } else {
              const oracleState = await readOracleState(instanceId);
              const cutoff = nowMs - windowDays * 24 * 60 * 60_000;
              const assertions = Object.values(oracleState.assertions);
              const disputes = Object.values(oracleState.disputes);
              totalAssertions = assertions.filter(
                (a) => Date.parse(a.assertedAt) >= cutoff,
              ).length;
              const disputedSet = new Set(
                disputes
                  .filter((d) => Date.parse(d.disputedAt) >= cutoff)
                  .map((d) => d.assertionId),
              );
              disputedAssertions = disputedSet.size;
            }

            if (totalAssertions < minAssertions) continue;
            if (totalAssertions <= 0) continue;

            const rate = (disputedAssertions / totalAssertions) * 100;
            if (rate < thresholdPercent) continue;

            const fingerprint = `${rule.id}:${instanceId}:${state.chain}:${contract}`;
            if (!shouldEmit(rule.event, fingerprint, getRuleCooldownMs(rule)))
              continue;

            await createOrTouchAlert({
              fingerprint,
              type: rule.event,
              severity: rule.severity,
              title: "High dispute rate",
              message: `${rate.toFixed(1)}% disputed (${disputedAssertions}/${totalAssertions}) over ${Math.round(
                windowDays,
              )}d`,
              entityType: "oracle",
              entityId: state.contractAddress,
              notify: notifyForRule(rule),
            });
          }
        }
      } catch (e) {
        lastError = e instanceof Error ? e.message : "unknown_error";
        if (
          lastError === "contract_not_found" ||
          lastError === "missing_config"
        ) {
          logger.warn("Background sync skipped due to configuration issue", {
            errorMessage: lastError,
            instanceId,
          });
        } else {
          logger.error("Background sync failed:", {
            error: e,
            errorMessage: lastError,
            instanceId,
          });
        }
      }
    }

    const escalationRules = rules
      .filter((r) => r.enabled)
      .map((r) => ({ rule: r, afterMs: getRuleEscalateAfterMs(r) }))
      .filter(
        (x): x is { rule: (typeof rules)[number]; afterMs: number } =>
          typeof x.afterMs === "number",
      );

    if (escalationRules.length > 0) {
      const escalateSeverity = (s: "info" | "warning" | "critical") =>
        s === "info" ? "warning" : "critical";

      if (hasDatabase()) {
        for (const { rule, afterMs } of escalationRules) {
          const cutoffSeconds = Math.floor((nowMs - afterMs) / 1000);
          const prefix = `${rule.id}:escalation:`;
          const res = await query<{
            fingerprint: string;
            title: string;
            message: string;
            entity_type: string | null;
            entity_id: string | null;
            first_seen_at: Date;
          }>(
            `
            SELECT fingerprint, title, message, entity_type, entity_id, first_seen_at
            FROM alerts a
            WHERE a.status = 'Open'
              AND a.type = $1
              AND a.first_seen_at <= to_timestamp($2)
              AND NOT EXISTS (
                SELECT 1 FROM alerts e WHERE e.fingerprint = CONCAT($3, a.fingerprint)
              )
            ORDER BY a.first_seen_at ASC
            LIMIT 200
            `,
            [rule.event, cutoffSeconds, prefix],
          );

          for (const a of res.rows) {
            const firstSeenMs = a.first_seen_at.getTime();
            const ageMs = nowMs - firstSeenMs;
            const escalationFingerprint = `${prefix}${a.fingerprint}`;
            if (
              !shouldEmit(
                `${rule.event}_escalation`,
                escalationFingerprint,
                getRuleCooldownMs(rule),
              )
            )
              continue;
            await createOrTouchAlert({
              fingerprint: escalationFingerprint,
              type: `${rule.event}_escalation`,
              severity: escalateSeverity(rule.severity),
              title: `Escalation: ${a.title}`,
              message: `${Math.round(ageMs / 60_000)}m open • ${a.message} • source ${a.fingerprint}`,
              entityType: a.entity_type,
              entityId: a.entity_id,
              notify: notifyForRule(rule),
            });
          }
        }
      } else {
        const mem = getMemoryStore();
        const items = Array.from(mem.alerts.values());
        const existingFingerprints = new Set(items.map((a) => a.fingerprint));

        for (const { rule, afterMs } of escalationRules) {
          const prefix = `${rule.id}:escalation:`;
          for (const a of items) {
            if (a.status !== "Open") continue;
            if (a.type !== rule.event) continue;
            const firstSeenMs = Date.parse(a.firstSeenAt);
            if (!Number.isFinite(firstSeenMs)) continue;
            const ageMs = nowMs - firstSeenMs;
            if (ageMs < afterMs) continue;
            const escalationFingerprint = `${prefix}${a.fingerprint}`;
            if (existingFingerprints.has(escalationFingerprint)) continue;
            if (
              !shouldEmit(
                `${rule.event}_escalation`,
                escalationFingerprint,
                getRuleCooldownMs(rule),
              )
            )
              continue;
            await createOrTouchAlert({
              fingerprint: escalationFingerprint,
              type: `${rule.event}_escalation`,
              severity: escalateSeverity(rule.severity),
              title: `Escalation: ${a.title}`,
              message: `${Math.round(ageMs / 60_000)}m open • ${a.message} • source ${a.fingerprint}`,
              entityType: a.entityType,
              entityId: a.entityId,
              notify: notifyForRule(rule),
            });
          }
        }
      }
    }
  } catch (e) {
    lastError = e instanceof Error ? e.message : "unknown_error";
    if (lastError === "contract_not_found" || lastError === "missing_config") {
      logger.warn("Background sync skipped due to configuration issue", {
        errorMessage: lastError,
      });
    } else {
      logger.error("Background sync failed:", {
        error: e,
        errorMessage: lastError,
      });
    }
  } finally {
    const at = new Date().toISOString();
    global.insightWorkerLastTickAt = at;
    global.insightWorkerLastTickDurationMs = Date.now() - startedAt;
    global.insightWorkerLastError = lastError;
    try {
      await writeJsonFile("worker/heartbeat/v1", {
        at,
        workerId: env.INSIGHT_WORKER_ID || "embedded",
        lockKey: global.insightWorkerLockKey ?? null,
        pid: typeof process !== "undefined" ? process.pid : null,
        runtime: process.env.NEXT_RUNTIME ?? null,
        durationMs: global.insightWorkerLastTickDurationMs,
        lastError,
      });
    } catch (e) {
      logger.error("Failed to write worker heartbeat", { error: e });
    }
    global.insightWorkerTickInProgress = false;
  }
}

function startWorker() {
  if (global.insightWorkerStarted) return;
  void tryAcquireWorkerLock().then((ok) => {
    if (!ok) {
      setTimeout(() => startWorker(), 30_000);
      return;
    }

    global.insightWorkerStarted = true;

    logger.info("Starting background sync worker...");

    void tickWorker();
    global.insightWorkerInterval = setInterval(() => {
      void tickWorker();
    }, SYNC_INTERVAL);
  });
}

declare global {
  var insightWorkerStarted: boolean;
  var insightWorkerLockClient: PoolClient | undefined;
  var insightWorkerLockKey: string | undefined;
  var insightWorkerInterval: ReturnType<typeof setInterval> | undefined;
  var insightWorkerTickInProgress: boolean | undefined;
  var insightWorkerLastTickAt: string | undefined;
  var insightWorkerLastTickDurationMs: number | undefined;
  var insightWorkerLastError: string | null | undefined;
  var insightWorkerLastMaintenanceAt: number | undefined;
}

const embeddedWorkerDisabled = ["1", "true"].includes(
  env.INSIGHT_DISABLE_EMBEDDED_WORKER.toLowerCase(),
);

if (!embeddedWorkerDisabled) startWorker();

export async function tickWorkerOnce() {
  await tickWorker();
}
