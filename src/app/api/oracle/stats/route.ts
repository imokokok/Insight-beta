import { ensureOracleSynced, getOracleStats } from "@/server/oracle";
import { handleApi, rateLimit } from "@/server/apiResponse";

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = rateLimit(request, { key: "oracle_stats_get", limit: 120, windowMs: 60_000 });
    if (limited) return limited;

    const url = new URL(request.url);
    if (url.searchParams.get("sync") === "1") {
      await ensureOracleSynced();
    }
    return await getOracleStats();
  });
}
