import { ensureOracleSynced, getOracleStats } from '@/server/oracle';
import { cachedJson, handleApi, rateLimit, requireAdmin } from '@/server/apiResponse';
import { env } from '@/lib/config/env';
import { timingSafeEqualString } from '@/server/adminAuth';

/**
 * @swagger
 * /api/oracle/stats:
 *   get:
 *     summary: 获取预言机统计
 *     description: 获取预言机的统计数据，包括 TVS、活跃争议数、24小时解决数等
 *     tags:
 *       - Oracle
 *     parameters:
 *       - in: query
 *         name: instanceId
 *         schema:
 *           type: string
 *         description: 预言机实例ID
 *       - in: query
 *         name: sync
 *         schema:
 *           type: string
 *           enum: ['0', '1']
 *         description: 是否强制同步数据（需要管理员权限或 Cron Secret）
 *     responses:
 *       200:
 *         description: 成功获取统计数据
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
 *                     tvsUsd:
 *                       type: number
 *                       description: 总质押价值（美元）
 *                     activeDisputes:
 *                       type: number
 *                       description: 活跃争议数
 *                     resolved24h:
 *                       type: number
 *                       description: 24小时内解决的争议数
 *                     avgResolutionMinutes:
 *                       type: number
 *                       description: 平均解决时间（分钟）
 *       401:
 *         description: 未授权（当请求同步时）
 *       429:
 *         description: 请求过于频繁
 *       500:
 *         description: 服务器错误
 */

function isCronAuthorized(request: Request) {
  const secret = (env.INSIGHT_CRON_SECRET.trim() || env.CRON_SECRET.trim()).trim();
  if (!secret) return false;
  const gotHeader = request.headers.get('x-oracle-monitor-cron-secret')?.trim() ?? '';
  if (gotHeader && timingSafeEqualString(gotHeader, secret)) return true;
  const auth = request.headers.get('authorization')?.trim() ?? '';
  if (!auth) return false;
  if (!auth.toLowerCase().startsWith('bearer ')) return false;
  const token = auth.slice(7).trim();
  if (!token) return false;
  return timingSafeEqualString(token, secret);
}

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: 'oracle_stats_get',
      limit: 120,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const url = new URL(request.url);
    const instanceId = url.searchParams.get('instanceId');
    const shouldSync = url.searchParams.get('sync') === '1';

    if (shouldSync) {
      if (!isCronAuthorized(request)) {
        const auth = await requireAdmin(request, {
          strict: true,
          scope: 'oracle_sync_trigger',
        });
        if (auth) return auth;
      }
      if (instanceId) await ensureOracleSynced(instanceId);
      else await ensureOracleSynced();
      return instanceId ? await getOracleStats(instanceId) : await getOracleStats();
    }

    const cacheKey = `oracle_api:${url.pathname}${url.search}`;
    return await cachedJson(cacheKey, 10_000, () =>
      instanceId ? getOracleStats(instanceId) : getOracleStats(),
    );
  });
}
