import { ensureOracleSynced, getOracleStats } from "@/server/oracle";
import { cachedJson, handleApi, rateLimit, requireAdmin } from "@/server/apiResponse";

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, { key: "oracle_stats_get", limit: 120, windowMs: 60_000 });
    if (limited) return limited;

    const url = new URL(request.url);
    if (url.searchParams.get("sync") === "1") {
      const auth = await requireAdmin(request, { strict: true, scope: "oracle_sync_trigger" });
      if (auth) return auth;
      await ensureOracleSynced();
    }
    if (url.searchParams.get("sync") === "1") return await getOracleStats();
    const cacheKey = `oracle_api:${url.pathname}${url.search}`;
    return await cachedJson(cacheKey, 10_000, () => getOracleStats());
  });
}
