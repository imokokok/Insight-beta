import { getLeaderboardStats } from "@/server/oracle";
import { cachedJson, handleApi, rateLimit } from "@/server/apiResponse";

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, { key: "leaderboard_get", limit: 240, windowMs: 60_000 });
    if (limited) return limited;

    const url = new URL(request.url);
    const cacheKey = `oracle_api:${url.pathname}${url.search}`;
    return await cachedJson(cacheKey, 30_000, () => getLeaderboardStats());
  });
}
