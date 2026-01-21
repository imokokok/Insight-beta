import { handleApi, rateLimit } from "@/server/apiResponse";
import { listSyncMetrics } from "@/server/oracle";
import { z } from "zod";

const querySchema = z.object({
  minutes: z.coerce
    .number()
    .int()
    .min(1)
    .max(24 * 60)
    .default(60),
  limit: z.coerce.number().int().min(1).max(5000).default(600),
});

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: "sync_metrics_get",
      limit: 120,
      windowMs: 60_000,
    });
    if (limited) return limited;
    const url = new URL(request.url);
    const raw = Object.fromEntries(url.searchParams);
    const parsed = querySchema.parse(raw);
    const instanceId = url.searchParams.get("instanceId") ?? undefined;
    const items = await listSyncMetrics({
      minutes: parsed.minutes,
      limit: parsed.limit,
      instanceId,
    });
    return { items };
  });
}
