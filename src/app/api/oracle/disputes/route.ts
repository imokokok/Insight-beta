import { ensureOracleSynced, listDisputes } from "@/server/oracle";
import { handleApi, rateLimit } from "@/server/apiResponse";
import { z } from "zod";
import { isAddress } from "viem";

const disputesParamsSchema = z.object({
  status: z.enum(["Voting", "Pending Execution", "Executed"]).optional().nullable(),
  chain: z.enum(["Polygon", "Arbitrum", "Optimism", "Local"]).optional().nullable(),
  q: z.string().optional().nullable(),
  limit: z.coerce.number().min(1).max(100).default(30),
  cursor: z.coerce.number().min(0).default(0),
  sync: z.enum(["0", "1"]).optional(),
  disputer: z.string().optional().nullable().refine((value) => !value || isAddress(value), { message: "invalid_address" })
});

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = rateLimit(request, { key: "disputes_get", limit: 120, windowMs: 60_000 });
    if (limited) return limited;

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const params = disputesParamsSchema.parse(rawParams);

    if (params.sync === "1") {
      await ensureOracleSynced();
    }
    const { items, total, nextCursor } = await listDisputes({
      status: params.status ?? undefined,
      chain: params.chain ?? undefined,
      q: params.q ?? undefined,
      limit: params.limit,
      cursor: params.cursor,
      disputer: params.disputer ?? undefined
    });
    return { items, total, nextCursor };
  });
}
