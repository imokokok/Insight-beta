import { ensureOracleSynced, listAssertions } from "@/server/oracle";
import { cachedJson, handleApi, rateLimit, requireAdmin } from "@/server/apiResponse";
import { z } from "zod";
import { isAddress } from "viem";

const assertionParamsSchema = z.object({
  status: z.enum(["Pending", "Disputed", "Resolved"]).optional().nullable(),
  chain: z.enum(["Polygon", "Arbitrum", "Optimism", "Local"]).optional().nullable(),
  q: z.string().optional().nullable(),
  limit: z.coerce.number().min(1).max(100).default(30),
  cursor: z.coerce.number().min(0).default(0),
  sync: z.enum(["0", "1"]).optional(),
  asserter: z.string().optional().nullable().refine((value) => !value || isAddress(value), { message: "invalid_address" })
});

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, { key: "assertions_get", limit: 120, windowMs: 60_000 });
    if (limited) return limited;

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    
    const params = assertionParamsSchema.parse(rawParams);

    if (params.sync === "1") {
      const auth = await requireAdmin(request, { strict: true, scope: "oracle_sync_trigger" });
      if (auth) return auth;
      await ensureOracleSynced();
    }

    const compute = async () => {
      const { items, total, nextCursor } = await listAssertions({
        status: params.status,
        chain: params.chain,
        q: params.q,
        limit: params.limit,
        cursor: params.cursor,
        asserter: params.asserter
      });
      return { items, total, nextCursor };
    };

    if (params.sync === "1") return await compute();

    const cacheKey = `oracle_api:${url.pathname}${url.search}`;
    return await cachedJson(cacheKey, 5_000, compute);
  });
}
