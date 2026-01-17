import { cachedJson, handleApi, rateLimit } from "@/server/apiResponse";
import { z } from "zod";
import { fetchReferencePriceHistory } from "@/server/oracle/priceFetcher";

const paramsSchema = z.object({
  symbol: z.string().default("ETH"),
  days: z.coerce.number().min(1).max(90).default(30),
});

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: "accuracy_get",
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const { symbol, days } = paramsSchema.parse(rawParams);

    const compute = async () => {
      const data = await fetchReferencePriceHistory(symbol, days);
      return data;
    };

    // Cache for 5 minutes as accuracy data doesn't change every second
    const cacheKey = `oracle_api:accuracy:${symbol}:${days}`;
    return await cachedJson(cacheKey, 300_000, compute);
  });
}
