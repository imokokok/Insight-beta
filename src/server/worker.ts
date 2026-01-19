import { ensureOracleSynced, isOracleSyncing } from "./oracleIndexer";
import crypto from "crypto";
import type { PoolClient } from "pg";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getClient, hasDatabase, query } from "@/server/db";
import { getMemoryStore } from "@/server/memoryBackend";
import { createOrTouchAlert, readAlertRules } from "@/server/observability";
import { getSyncState, readOracleState } from "@/server/oracle";
import { writeJsonFile } from "@/server/kvStore";
import { fetchCurrentPrice } from "@/server/oracle/priceFetcher";
import { createPublicClient, http, formatEther } from "viem";

const SYNC_INTERVAL = 15000; // 15 seconds
const workerAlertCooldown = new Map<string, number>();

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

    if (isOracleSyncing()) return;
    await ensureOracleSynced();
    const rules = await readAlertRules();
    const state = await getSyncState();
    const nowMs = Date.now();

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
      channels?: Array<"webhook" | "email">;
      recipient?: string | null;
    }) => {
      const silencedUntilRaw = (rule.silencedUntil ?? "").trim();
      const silencedUntilMs = silencedUntilRaw
        ? Date.parse(silencedUntilRaw)
        : NaN;
      const silenced =
        Number.isFinite(silencedUntilMs) && silencedUntilMs > nowMs;
      return silenced
        ? { channels: [] as Array<"webhook" | "email"> }
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
            const fingerprint = `${staleRule.id}:${state.chain}:${
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

    const disputeRules = rules.filter(
      (r) =>
        r.enabled &&
        (r.event === "execution_delayed" ||
          r.event === "low_participation" ||
          r.event === "high_vote_divergence"),
    );

    if (disputeRules.length > 0) {
      const oracleState = await readOracleState();
      const disputes = Object.values(oracleState.disputes);

      for (const dispute of disputes) {
        if (dispute.status !== "Voting") continue;
        const disputedAtMs = Date.parse(dispute.disputedAt);
        const votingEndsAtMs = Date.parse(dispute.votingEndsAt);
        if (!Number.isFinite(disputedAtMs) || !Number.isFinite(votingEndsAtMs))
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

            const fingerprint = `${rule.id}:${dispute.chain}:${dispute.assertionId}`;
            if (!shouldEmit(rule.event, fingerprint, getRuleCooldownMs(rule)))
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
            if (!Number.isFinite(withinMinutes) || withinMinutes <= 0) continue;
            if (!Number.isFinite(minTotalVotes) || minTotalVotes < 0) continue;

            if (nowMs - disputedAtMs < withinMinutes * 60_000) continue;
            if (totalVotes > minTotalVotes) continue;

            const fingerprint = `${rule.id}:${dispute.chain}:${dispute.assertionId}`;
            if (!shouldEmit(rule.event, fingerprint, getRuleCooldownMs(rule)))
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

            if (!Number.isFinite(withinMinutes) || withinMinutes <= 0) continue;
            if (!Number.isFinite(minTotalVotes) || minTotalVotes <= 0) continue;
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

            const fingerprint = `${rule.id}:${dispute.chain}:${dispute.assertionId}`;
            if (!shouldEmit(rule.event, fingerprint, getRuleCooldownMs(rule)))
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

    // Price Deviation Check
    const deviationRules = rules.filter(
      (r) => r.enabled && r.event === "price_deviation",
    );
    if (deviationRules.length > 0) {
      // In a real app, symbol would be dynamic based on contract
      const symbol = "ETH";
      const { referencePrice, oraclePrice } = await fetchCurrentPrice(symbol);
      const deviation =
        referencePrice > 0
          ? Math.abs(oraclePrice - referencePrice) / referencePrice
          : 0;
      const deviationPercent = deviation * 100;

      for (const rule of deviationRules) {
        const threshold = Number(
          (rule.params as { thresholdPercent?: unknown })?.thresholdPercent ??
            2,
        );
        if (deviationPercent > threshold) {
          const fingerprint = `price_deviation:${symbol}:${
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

    // Low Gas Check
    const lowGasRules = rules.filter((r) => r.enabled && r.event === "low_gas");
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
            (rule.params as { minBalanceEth?: unknown })?.minBalanceEth ?? 0.1,
          );
          if (balanceEth < minBalance) {
            const fingerprint = `low_gas:${state.owner}`;
            if (!shouldEmit(rule.event, fingerprint, getRuleCooldownMs(rule)))
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
        logger.error("Failed to check gas balance", { error: e });
      }
    }

    const disputeRateRules = rules.filter(
      (r) => r.enabled && r.event === "high_dispute_rate",
    );
    if (disputeRateRules.length > 0) {
      const contract = state.contractAddress ?? "unknown";
      for (const rule of disputeRateRules) {
        const windowDays = Number(
          (rule.params as { windowDays?: unknown } | undefined)?.windowDays ??
            7,
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
            `,
            [windowDays],
          );
          totalAssertions = Number(totalRes.rows[0]?.total ?? 0);

          const disputedRes = await query<{ total: string | number }>(
            `
            SELECT COUNT(DISTINCT assertion_id) as total
            FROM disputes
            WHERE disputed_at > NOW() - INTERVAL '1 day' * $1
            `,
            [windowDays],
          );
          disputedAssertions = Number(disputedRes.rows[0]?.total ?? 0);
        } else {
          const oracleState = await readOracleState();
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

        const fingerprint = `${rule.id}:${state.chain}:${contract}`;
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
    logger.error("Background sync failed:", {
      error: e,
      errorMessage: lastError,
    });
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
}

const embeddedWorkerDisabled = ["1", "true"].includes(
  env.INSIGHT_DISABLE_EMBEDDED_WORKER.toLowerCase(),
);

if (!embeddedWorkerDisabled) startWorker();
