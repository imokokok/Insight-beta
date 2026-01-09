import { getLeaderboardStats } from "@/server/oracleStore";
import { handleApi } from "@/server/apiResponse";

export async function GET() {
  return handleApi(async () => {
    return await getLeaderboardStats();
  });
}
