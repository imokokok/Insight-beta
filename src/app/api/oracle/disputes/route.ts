import { isAddress } from 'viem';
import { z } from 'zod';

import { env } from '@/lib/config/env';
import { cachedJson, handleApi, rateLimit, requireAdmin } from '@/server/apiResponse';
import { ensureOracleSynced, listDisputes } from '@/server/oracle';

/**
 * @swagger
 * /api/oracle/disputes:
 *   get:
 *     summary: 获取争议列表
 *     description: 获取预言机争议列表，支持分页、筛选和搜索
 *     tags:
 *       - Disputes
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Voting, 'Pending Execution', Executed]
 *         description: 争议状态筛选
 *       - in: query
 *         name: chain
 *         schema:
 *           type: string
 *           enum: [Polygon, PolygonAmoy, Arbitrum, Optimism, Local]
 *         description: 区块链网络筛选
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *       - in: query
 *         name: disputer
 *         schema:
 *           type: string
 *         description: 争议者地址筛选
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 30
 *           minimum: 1
 *           maximum: 100
 *         description: 每页数量
 *       - in: query
 *         name: cursor
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 分页游标
 *       - in: query
 *         name: sync
 *         schema:
 *           type: string
 *           enum: ['0', '1']
 *         description: 是否强制同步（需要管理员权限）
 *       - in: query
 *         name: instanceId
 *         schema:
 *           type: string
 *         description: 预言机实例ID
 *     responses:
 *       200:
 *         description: 成功获取争议列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     items:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Dispute'
 *                     total:
 *                       type: integer
 *                     nextCursor:
 *                       type: integer
 *                       nullable: true
 *                     voteTrackingEnabled:
 *                       type: boolean
 *                       description: 是否启用投票追踪
 *       429:
 *         description: 请求过于频繁
 *       500:
 *         description: 服务器错误
 */

const disputesParamsSchema = z.object({
  status: z.enum(['Voting', 'Pending Execution', 'Executed']).optional().nullable(),
  chain: z.enum(['Polygon', 'PolygonAmoy', 'Arbitrum', 'Optimism', 'Local']).optional().nullable(),
  q: z.string().max(100).optional().nullable(), // 添加长度限制
  limit: z.coerce.number().min(1).max(100).default(30),
  cursor: z.coerce.number().min(0).default(0),
  sync: z.enum(['0', '1']).optional(),
  disputer: z
    .string()
    .max(50) // 添加长度限制
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

    // 使用 safeParse 进行参数验证，提供更好的错误处理
    const parseResult = disputesParamsSchema.safeParse(rawParams);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((i) => i.message).join(', ');
      return new Response(
        JSON.stringify({
          success: false,
          error: {
            code: 'invalid_request_params',
            message: `Invalid request parameters: ${errorMessage}`,
            details: parseResult.error.issues,
          },
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }
    const params = parseResult.data;

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
      const degraded = env.INSIGHT_VOTING_DEGRADATION;
      const voteTrackingEnabled = env.INSIGHT_ENABLE_VOTING && !env.INSIGHT_DISABLE_VOTE_TRACKING;
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
