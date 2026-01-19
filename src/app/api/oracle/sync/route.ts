import {
  ensureOracleSynced,
  getOracleEnv,
  isTableEmpty,
  readOracleState,
} from "@/server/oracle";
import {
  error,
  getAdminActor,
  handleApi,
  invalidateCachedJson,
  rateLimit,
  requireAdmin,
} from "@/server/apiResponse";
import { appendAuditLog } from "@/server/observability";
import { revalidateTag } from "next/cache";
import { env } from "@/lib/env";
import crypto from "node:crypto";

function timingSafeEqualString(a: string, b: string) {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

function isCronAuthorized(request: Request) {
  const secret = (
    env.INSIGHT_CRON_SECRET.trim() || env.CRON_SECRET.trim()
  ).trim();
  if (!secret) return false;
  const gotHeader = request.headers.get("x-insight-cron-secret")?.trim() ?? "";
  if (gotHeader && timingSafeEqualString(gotHeader, secret)) return true;
  const auth = request.headers.get("authorization")?.trim() ?? "";
  if (!auth) return false;
  if (!auth.toLowerCase().startsWith("bearer ")) return false;
  const token = auth.slice(7).trim();
  if (!token) return false;
  return timingSafeEqualString(token, secret);
}

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: "oracle_sync_get",
      limit: 240,
      windowMs: 60_000,
    });
    if (limited) return limited;
    const state = await readOracleState();
    const isDemo = await isTableEmpty("assertions");
    return {
      chain: state.chain,
      contractAddress: state.contractAddress,
      mode: isDemo ? "demo" : "real",
      lastProcessedBlock: state.lastProcessedBlock.toString(10),
      assertions: Object.keys(state.assertions).length,
      disputes: Object.keys(state.disputes).length,
      sync: state.sync,
    };
  });
}

export async function POST(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: "oracle_sync_post",
      limit: 10,
      windowMs: 60_000,
    });
    if (limited) return limited;

    if (!isCronAuthorized(request)) {
      const auth = await requireAdmin(request, {
        strict: true,
        scope: "oracle_sync_trigger",
      });
      if (auth) return auth;
    }

    const envConfig = await getOracleEnv();
    if (!envConfig.rpcUrl || !envConfig.contractAddress) {
      return error({ code: "missing_config" }, 400);
    }
    let result: { updated: boolean };
    try {
      result = await ensureOracleSynced();
    } catch (e) {
      const code = e instanceof Error ? e.message : "sync_failed";
      if (code === "rpc_unreachable") return error({ code }, 502);
      if (code === "contract_not_found") return error({ code }, 400);
      if (code === "sync_failed") return error({ code }, 502);
      return error({ code: "sync_failed" }, 502);
    }
    const state = await readOracleState();
    const actor = getAdminActor(request);
    await appendAuditLog({
      actor,
      action: "oracle_sync_triggered",
      entityType: "oracle",
      entityId: state.contractAddress,
      details: {
        updated: result.updated,
        lastProcessedBlock: state.lastProcessedBlock.toString(10),
      },
    });
    if (result.updated) {
      revalidateTag("oracle-stats");
      revalidateTag("oracle-leaderboard");
      revalidateTag("user-stats");
      await invalidateCachedJson("oracle_api:/api/oracle");
    }
    const isDemo = await isTableEmpty("assertions");
    return {
      updated: result.updated,
      chain: state.chain,
      contractAddress: state.contractAddress,
      mode: isDemo ? "demo" : "real",
      lastProcessedBlock: state.lastProcessedBlock.toString(10),
      assertions: Object.keys(state.assertions).length,
      disputes: Object.keys(state.disputes).length,
      sync: state.sync,
    };
  });
}
