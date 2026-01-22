import { error, handleApi, rateLimit } from "@/server/apiResponse";
import { hasDatabase, query } from "@/server/db";
import { env, getEnvReport } from "@/lib/env";
import { requireAdmin } from "@/server/apiResponse";
import { readJsonFile } from "@/server/kvStore";

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: "health_get",
      limit: 240,
      windowMs: 60_000,
    });
    if (limited) return limited;
    const url = new URL(request.url);
    const probe = (url.searchParams.get("probe") ?? "").toLowerCase();
    if (probe === "liveness") {
      return {
        status: "ok",
        probe: "liveness",
        timestamp: new Date().toISOString(),
      };
    }
    if (probe === "readiness") {
      const databaseStatus = hasDatabase()
        ? await query("SELECT 1 as ok")
            .then((res) =>
              res.rows[0]?.ok === 1 ? ("connected" as const) : "disconnected",
            )
            .catch(() => "disconnected" as const)
        : ("not_configured" as const);

      const embeddedWorkerDisabled = ["1", "true"].includes(
        env.INSIGHT_DISABLE_EMBEDDED_WORKER.toLowerCase(),
      );
      const heartbeat = embeddedWorkerDisabled
        ? null
        : await readJsonFile("worker/heartbeat/v1", null);
      const at =
        heartbeat && typeof heartbeat === "object"
          ? (heartbeat as { at?: unknown }).at
          : null;
      const atMs = typeof at === "string" ? Date.parse(at) : NaN;
      const workerOk =
        embeddedWorkerDisabled ||
        (Number.isFinite(atMs) && Date.now() - atMs <= 90_000);

      const ready =
        (databaseStatus === "connected" ||
          databaseStatus === "not_configured") &&
        workerOk;

      if (!ready) return error({ code: "not_ready" }, 503);

      return {
        status: "ok",
        probe: "readiness",
        timestamp: new Date().toISOString(),
      };
    }
    if (probe === "validation") {
      const databaseStatus = hasDatabase()
        ? await query("SELECT 1 as ok")
            .then((res) =>
              res.rows[0]?.ok === 1 ? ("connected" as const) : "disconnected",
            )
            .catch(() => "disconnected" as const)
        : ("not_configured" as const);

      const embeddedWorkerDisabled = ["1", "true"].includes(
        env.INSIGHT_DISABLE_EMBEDDED_WORKER.toLowerCase(),
      );
      const heartbeat = embeddedWorkerDisabled
        ? null
        : await readJsonFile("worker/heartbeat/v1", null);
      const at =
        heartbeat && typeof heartbeat === "object"
          ? (heartbeat as { at?: unknown }).at
          : null;
      const atMs = typeof at === "string" ? Date.parse(at) : NaN;
      const workerOk =
        embeddedWorkerDisabled ||
        (Number.isFinite(atMs) && Date.now() - atMs <= 90_000);

      const envReport = getEnvReport();
      const auth = await requireAdmin(request, {
        strict: false,
        scope: "audit_read",
      });
      const includeEnv = auth === null;
      const issues: string[] = [];
      if (databaseStatus === "disconnected")
        issues.push("database_disconnected");
      if (!workerOk) issues.push("worker_stale");
      if (includeEnv && !envReport.ok) issues.push("env_invalid");

      return {
        status: issues.length === 0 ? "ok" : "degraded",
        probe: "validation",
        timestamp: new Date().toISOString(),
        issues,
        database: databaseStatus,
        env: includeEnv ? envReport : { ok: false, issues: [] },
        worker: includeEnv ? heartbeat : null,
      };
    }
    const envReport = getEnvReport();
    const auth = await requireAdmin(request, {
      strict: false,
      scope: "audit_read",
    });
    const includeEnv = auth === null;
    const worker = includeEnv
      ? await readJsonFile("worker/heartbeat/v1", null)
      : null;

    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      database: hasDatabase()
        ? await query("SELECT 1 as ok")
            .then((res) =>
              res.rows[0]?.ok === 1 ? "connected" : "disconnected",
            )
            .catch(() => "disconnected")
        : "not_configured",
      environment: process.env.NODE_ENV,
      env: includeEnv ? envReport : { ok: false, issues: [] },
      worker: includeEnv ? worker : null,
    };
  });
}
