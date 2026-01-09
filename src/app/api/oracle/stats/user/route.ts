import { getUserStats } from "@/server/oracleStore";
import { handleApi } from "@/server/apiResponse";
import { z } from "zod";

const statsParamsSchema = z.object({
  address: z.string().min(1)
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    
    const params = statsParamsSchema.parse(rawParams);
    
    const stats = await getUserStats(params.address);
    
    return stats;
  });
}
