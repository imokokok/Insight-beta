import { ensureOracleSynced, listDisputes } from '@/server/oracle';
import { cachedJson, handleApi, rateLimit, requireAdmin } from '@/server/apiResponse';
import { z } from 'zod';
import { isAddress } from 'viem';
import { env } from '@/lib/config/env';

const disputesParamsSchema = z.object({
  status: z.enum(['Voting', 'Pending Execution', 'Executed']).optional().nullable(),
  chain: z.enum(['Polygon', 'PolygonAmoy', 'Arbitrum', 'Optimism', 'Local']).optional().nullable(),
  q: z.string().optional().nullable(),
  limit: z.coerce.number().min(1).max(100).default(30),
  cursor: z.coerce.number().min(0).default(0),
  sync: z.enum(['0', '1']).optional(),
  disputer: z
    .string()
    .optional()
    .nullable()
    .refine((value) => !value || isAddress(value), {
      message: 'invalid_address',
    }),
});

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: 'disputes_get',
      limit: 120,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const url = new URL(request.url);
    const rawParams = Object.fromEntries(url.searchParams);
    const instanceId = url.searchParams.get('instanceId');
    const params = disputesParamsSchema.parse(rawParams);

    if (params.sync === '1') {
      const auth = await requireAdmin(request, {
        strict: true,
        scope: 'oracle_sync_trigger',
      });
      if (auth) return auth;
      if (instanceId) await ensureOracleSynced(instanceId);
      else await ensureOracleSynced();
    }
    const compute = async () => {
      const { items, total, nextCursor } = await (instanceId
        ? listDisputes(
            {
              status: params.status ?? undefined,
              chain: params.chain ?? undefined,
              q: params.q ?? undefined,
              limit: params.limit,
              cursor: params.cursor,
              disputer: params.disputer ?? undefined,
            },
            instanceId,
          )
        : listDisputes({
            status: params.status ?? undefined,
            chain: params.chain ?? undefined,
            q: params.q ?? undefined,
            limit: params.limit,
            cursor: params.cursor,
            disputer: params.disputer ?? undefined,
          }));
      const degraded = ['1', 'true'].includes((env.INSIGHT_VOTING_DEGRADATION || '').toLowerCase());
      const voteTrackingEnabled =
        ['1', 'true'].includes((env.INSIGHT_ENABLE_VOTING || '').toLowerCase()) &&
        !['1', 'true'].includes((env.INSIGHT_DISABLE_VOTE_TRACKING || '').toLowerCase());
      return {
        items,
        total,
        nextCursor,
        voteTrackingEnabled: voteTrackingEnabled && !degraded,
      };
    };
    if (params.sync === '1') return await compute();
    const cacheKey = `oracle_api:${url.pathname}${url.search}`;
    return await cachedJson(cacheKey, 5_000, compute);
  });
}
