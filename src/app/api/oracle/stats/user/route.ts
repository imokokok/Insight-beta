import { getUserStats } from "@/server/oracle";
import { handleApi, rateLimit } from "@/server/apiResponse";
import { z } from "zod";
import { isAddress } from "viem";

const statsParamsSchema = z.object({
  address: z.string().refine((value) => isAddress(value), { message: "invalid_address" })
});

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, { key: "user_stats_get", limit: 120, windowMs: 60_000 });
    if (limited) return limited;

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    
    const params = statsParamsSchema.parse(rawParams);
    
    const stats = await getUserStats(params.address);
    
    return stats;
  });
}
