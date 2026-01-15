import { ensureOracleSynced, isOracleSyncing } from "./oracleIndexer";
import crypto from "crypto";
import type { PoolClient } from "pg";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getClient, hasDatabase, query } from "@/server/db";
import { createOrTouchAlert, readAlertRules } from "@/server/observability";
import { getSyncState, readOracleState } from "@/server/oracle";
import { writeJsonFile } from "@/server/kvStore";

const SYNC_INTERVAL = 15000; // 15 seconds
const workerAlertCooldown = new Map<string, number>();

async function tryAcquireWorkerLock() {
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
  } catch {
    client.release();
    return false;
  }
}

async function tickWorker() {
  if (hasDatabase() && global.insightWorkerLockClient) {
    try {
      await global.insightWorkerLockClient.query("SELECT 1 as ok");
    } catch {
      try {
        global.insightWorkerLockClient.release();
      } catch {
        void 0;
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
  const startedAt = Date.now();
  try {
    await ensureOracleSynced();
    const rules = await readAlertRules();
    const state = await getSyncState();
    const nowMs = Date.now();

    const shouldEmit = (event: string, fingerprint: string) => {
      const key = `${event}:${fingerprint}`;
      const lastAt = workerAlertCooldown.get(key) ?? 0;
      if (nowMs - lastAt < 30_000) return false;
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
            if (!shouldEmit(staleRule.event, fingerprint)) continue;
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
            if (!shouldEmit(rule.event, fingerprint)) continue;
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
            if (!shouldEmit(rule.event, fingerprint)) continue;

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
            if (!shouldEmit(rule.event, fingerprint)) continue;

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
        if (!shouldEmit(rule.event, fingerprint)) continue;

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

    const at = new Date().toISOString();
    global.insightWorkerLastTickAt = at;
    global.insightWorkerLastTickDurationMs = Date.now() - startedAt;
    global.insightWorkerLastError = null;
    await writeJsonFile("worker/heartbeat/v1", {
      at,
      workerId: env.INSIGHT_WORKER_ID || "embedded",
      lockKey: global.insightWorkerLockKey ?? null,
      pid: typeof process !== "undefined" ? process.pid : null,
      runtime: process.env.NEXT_RUNTIME ?? null,
    });
  } catch (e) {
    global.insightWorkerLastTickAt = new Date().toISOString();
    global.insightWorkerLastTickDurationMs = Date.now() - startedAt;
    global.insightWorkerLastError =
      e instanceof Error ? e.message : "unknown_error";
    logger.error("Background sync failed:", { error: e });
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
  var insightWorkerLastTickAt: string | undefined;
  var insightWorkerLastTickDurationMs: number | undefined;
  var insightWorkerLastError: string | null | undefined;
}

startWorker();
