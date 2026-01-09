import { listAssertions } from "@/server/oracleStore";
import { ensureOracleSynced } from "@/server/oracleIndexer";
import { handleApi } from "@/server/apiResponse";
import { z } from "zod";

const assertionParamsSchema = z.object({
  status: z.enum(["Pending", "Disputed", "Resolved"]).optional().nullable(),
  chain: z.enum(["Polygon", "Arbitrum", "Optimism", "Local"]).optional().nullable(),
  q: z.string().optional().nullable(),
  limit: z.coerce.number().min(1).max(100).default(30),
  cursor: z.coerce.number().min(0).default(0),
  sync: z.enum(["0", "1"]).optional(),
  asserter: z.string().optional().nullable()
});

export async function GET(request: Request) {
  return handleApi(async () => {
    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    
    const params = assertionParamsSchema.parse(rawParams);

    if (params.sync === "1") {
      await ensureOracleSynced();
    }
    
    const { items, total, nextCursor } = await listAssertions({
      status: params.status,
      chain: params.chain,
      q: params.q,
      limit: params.limit,
      cursor: params.cursor,
      asserter: params.asserter
    });
    
    return { items, total, nextCursor };
  });
}
