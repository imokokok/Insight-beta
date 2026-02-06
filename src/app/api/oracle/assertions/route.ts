/**
 * @swagger
 * /api/oracle/assertions:
 *   get:
 *     summary: 获取断言列表
 *     description: 获取预言机断言列表，支持分页、筛选和搜索
 *     tags:
 *       - Assertions
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Pending, Disputed, Resolved]
 *         description: 断言状态筛选
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
 *         name: asserter
 *         schema:
 *           type: string
 *         description: 断言者地址筛选
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
 *         description: 成功获取断言列表
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
 *                         $ref: '#/components/schemas/Assertion'
 *                     total:
 *                       type: integer
 *                     nextCursor:
 *                       type: integer
 *                       nullable: true
 *       429:
 *         description: 请求过于频繁
 *       500:
 *         description: 服务器错误
 */

import { isAddress } from 'viem';
import { z } from 'zod';

import { createListHandler, listQuerySchema } from '@/server/apiResponse/listHandler';
import { ensureOracleSynced, listAssertions } from '@/server/oracle';

// 扩展基础 schema 的断言特定参数
const assertionFilterSchema = z.object({
  status: z.enum(['Pending', 'Disputed', 'Resolved']).optional().nullable(),
  chain: z.enum(['Polygon', 'PolygonAmoy', 'Arbitrum', 'Optimism', 'Local']).optional().nullable(),
  asserter: z
    .string()
    .optional()
    .nullable()
    .refine((value) => !value || isAddress(value), {
      message: 'invalid_address',
    }),
  ids: z.string().optional().nullable(),
});

// 组合完整的参数 schema
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const assertionParamsSchema = listQuerySchema.merge(assertionFilterSchema);
type AssertionParams = z.infer<typeof assertionParamsSchema>;

export const GET = createListHandler({
  rateLimitConfig: {
    key: 'assertions_get',
    limit: 120,
    windowMs: 60_000,
  },
  cacheConfig: {
    ttlMs: 5_000,
    keyPrefix: 'assertions',
  },
  paramsSchema: assertionFilterSchema,
  syncFn: async (instanceId?: string) => {
    await ensureOracleSynced(instanceId);
  },
  fetchFn: async (params: AssertionParams, instanceId?: string) => {
    return listAssertions(
      {
        status: params.status ?? undefined,
        chain: params.chain ?? undefined,
        q: params.q ?? undefined,
        limit: params.limit,
        cursor: params.cursor,
        asserter: params.asserter ?? undefined,
        ids: params.ids ? params.ids.split(',') : undefined,
      },
      instanceId,
    );
  },
});
