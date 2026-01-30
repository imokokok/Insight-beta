import { getAuditStatistics, type AuditAction } from '@/lib/monitoring/auditLogger';
import { handleApi, rateLimit, requireAdmin } from '@/server/apiResponse';

/**
 * @swagger
 * /api/audit/stats:
 *   get:
 *     summary: 获取审计统计
 *     description: 获取审计日志的统计信息，包括操作分布、成功率等
 *     tags:
 *       - Audit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 统计开始时间
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 统计结束时间
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: 按操作类型筛选
 *       - in: query
 *         name: actor
 *         schema:
 *           type: string
 *         description: 按操作者筛选
 *     responses:
 *       200:
 *         description: 成功获取审计统计
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
 *                     total:
 *                       type: integer
 *                       description: 总日志数
 *                     byAction:
 *                       type: object
 *                       description: 按操作类型统计
 *                     bySeverity:
 *                       type: object
 *                       description: 按严重程度统计
 *                     byActorType:
 *                       type: object
 *                       description: 按操作者类型统计
 *                     successRate:
 *                       type: number
 *                       description: 成功率(%)
 *                     criticalEvents:
 *                       type: integer
 *                       description: 关键事件数
 *                     timeRange:
 *                       type: object
 *                       properties:
 *                         start:
 *                           type: string
 *                           format: date-time
 *                         end:
 *                           type: string
 *                           format: date-time
 *                     topActions:
 *                       type: array
 *                       description: 最频繁的操作
 *                     topActors:
 *                       type: array
 *                       description: 最活跃的操作者
 *       401:
 *         description: 未授权
 *       429:
 *         description: 请求过于频繁
 */
export async function GET(request: Request) {
  return handleApi(request, async () => {
    // Rate limiting
    const limited = await rateLimit(request, {
      key: 'audit_stats_get',
      limit: 60,
      windowMs: 60_000,
    });
    if (limited) return limited;

    // Require admin access
    const auth = await requireAdmin(request, {
      strict: true,
      scope: 'audit_read',
    });
    if (auth) return auth;

    const url = new URL(request.url);
    const actionParam = url.searchParams.get('action');
    const filter = {
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
      action: actionParam ? (actionParam as AuditAction) : undefined,
      actor: url.searchParams.get('actor') || undefined,
    };

    const stats = getAuditStatistics(filter);

    return {
      success: true,
      data: stats,
    };
  });
}
