import { getLeaderboardStats } from "@/server/oracleStore";
import { handleApi, rateLimit } from "@/server/apiResponse";

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = rateLimit(request, { key: "leaderboard_get", limit: 240, windowMs: 60_000 });
    if (limited) return limited;

    return await getLeaderboardStats();
  });
}
