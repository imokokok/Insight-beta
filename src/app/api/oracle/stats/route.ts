import { ensureOracleSynced, getOracleStats } from "@/server/oracle";
import {
  cachedJson,
  handleApi,
  rateLimit,
  requireAdmin,
} from "@/server/apiResponse";
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
      key: "oracle_stats_get",
      limit: 120,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const url = new URL(request.url);
    if (url.searchParams.get("sync") === "1") {
      if (!isCronAuthorized(request)) {
        const auth = await requireAdmin(request, {
          strict: true,
          scope: "oracle_sync_trigger",
        });
        if (auth) return auth;
      }
      await ensureOracleSynced();
    }
    if (url.searchParams.get("sync") === "1") return await getOracleStats();
    const cacheKey = `oracle_api:${url.pathname}${url.search}`;
    return await cachedJson(cacheKey, 10_000, () => getOracleStats());
  });
}
