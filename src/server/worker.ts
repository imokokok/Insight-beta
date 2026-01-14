import { ensureOracleSynced, isOracleSyncing } from "./oracleIndexer";
import crypto from "crypto";
import type { PoolClient } from "pg";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { getClient, hasDatabase } from "@/server/db";
import { createOrTouchAlert, readAlertRules } from "@/server/observability";
import { getSyncState } from "@/server/oracle";
import { writeJsonFile } from "@/server/kvStore";

const SYNC_INTERVAL = 15000; // 15 seconds

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
      [key.toString(10)]
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
    const staleRule = rules.find((r) => r.enabled && r.event === "stale_sync");
    if (staleRule) {
      const maxAgeMs = Number(
        (staleRule.params as { maxAgeMs?: unknown } | undefined)?.maxAgeMs ??
          5 * 60 * 1000
      );
      const state = await getSyncState();
      const lastSuccessAt = state.sync.lastSuccessAt;
      if (lastSuccessAt) {
        const ageMs = Date.now() - new Date(lastSuccessAt).getTime();
        if (ageMs > maxAgeMs) {
          const fingerprint = `stale_sync:${state.chain}:${
            state.contractAddress ?? "unknown"
          }`;
          await createOrTouchAlert({
            fingerprint,
            type: "stale_sync",
            severity: staleRule.severity,
            title: "Oracle sync stale",
            message: `Last success ${Math.round(ageMs / 1000)}s ago`,
            entityType: "oracle",
            entityId: state.contractAddress,
          });
        }
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
