import { z } from 'zod';

import { cachedJson, handleApi, rateLimit, requireAdmin } from '@/server/apiResponse';
import { listAlerts } from '@/server/observability';
import { ensureOracleSynced } from '@/server/oracle';

/**
 * @swagger
 * /api/oracle/alerts:
 *   get:
 *     summary: 获取告警列表
 *     description: 获取系统告警列表，支持按状态、严重程度筛选
 *     tags:
 *       - Alerts
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [Open, Acknowledged, Resolved]
 *         description: 告警状态筛选
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [info, warning, critical]
 *         description: 严重程度筛选
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         description: 告警类型筛选
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *         description: 搜索关键词
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
 *         description: 成功获取告警列表
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
 *                         $ref: '#/components/schemas/Alert'
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

const alertParamsSchema = z.object({
  status: z.enum(['Open', 'Acknowledged', 'Resolved']).optional().nullable(),
  severity: z.enum(['info', 'warning', 'critical']).optional().nullable(),
  type: z.string().trim().max(100).optional().nullable(),
  q: z.string().optional().nullable(),
  limit: z.coerce.number().min(1).max(100).default(30),
  cursor: z.coerce.number().min(0).default(0),
  sync: z.enum(['0', '1']).optional(),
});

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: 'alerts_get',
      limit: 120,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const url = new URL(request.url);
    const instanceId = url.searchParams.get('instanceId')?.trim() || null;
    const rawParams = Object.fromEntries(url.searchParams);
    const params = alertParamsSchema.parse(rawParams);

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
      const { items, total, nextCursor } = await listAlerts({
        status: params.status ?? 'All',
        severity: params.severity ?? 'All',
        type: params.type ?? 'All',
        q: params.q,
        limit: params.limit,
        cursor: params.cursor,
        instanceId,
      });
      return { items, total, nextCursor };
    };

    if (params.sync === '1') return await compute();
    const cacheKey = `oracle_api:${url.pathname}${url.search}`;
    return await cachedJson(cacheKey, 10_000, compute);
  });
}
