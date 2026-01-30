import { getAuditLogger, type AuditFilter, type AuditAction } from '@/lib/monitoring/auditLogger';
import { handleApi, rateLimit, requireAdmin } from '@/server/apiResponse';

/**
 * @swagger
 * /api/audit/logs:
 *   get:
 *     summary: 获取审计日志
 *     description: 查询系统审计日志，支持多种筛选条件
 *     tags:
 *       - Audit
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: action
 *         schema:
 *           type: string
 *         description: 操作类型筛选
 *       - in: query
 *         name: actor
 *         schema:
 *           type: string
 *         description: 操作者筛选
 *       - in: query
 *         name: severity
 *         schema:
 *           type: string
 *           enum: [info, warning, critical]
 *         description: 严重程度筛选
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 开始时间
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         description: 结束时间
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: 返回数量限制
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *         description: 分页偏移量
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索关键词
 *     responses:
 *       200:
 *         description: 成功获取审计日志
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       action:
 *                         type: string
 *                       actor:
 *                         type: string
 *                       severity:
 *                         type: string
 *                       success:
 *                         type: boolean
 *       401:
 *         description: 未授权
 *       429:
 *         description: 请求过于频繁
 */
export async function GET(request: Request) {
  return handleApi(request, async () => {
    // Rate limiting
    const limited = await rateLimit(request, {
      key: 'audit_logs_get',
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
    const filter: AuditFilter = {
      action: actionParam ? (actionParam as AuditAction) : undefined,
      actor: url.searchParams.get('actor') || undefined,
      severity: (url.searchParams.get('severity') as AuditFilter['severity']) || undefined,
      startDate: url.searchParams.get('startDate') || undefined,
      endDate: url.searchParams.get('endDate') || undefined,
      limit: parseInt(url.searchParams.get('limit') || '100', 10),
      offset: parseInt(url.searchParams.get('offset') || '0', 10),
      search: url.searchParams.get('search') || undefined,
    };

    const logger = getAuditLogger();
    const logs = logger.query(filter);

    return {
      success: true,
      data: logs,
      meta: {
        total: logger.getLogCount(),
        limit: filter.limit,
        offset: filter.offset,
      },
    };
  });
}

/**
 * @swagger
 * /api/audit/logs:
 *   post:
 *     summary: 创建审计日志
 *     description: 手动创建审计日志条目（通常由系统自动调用）
 *     tags:
 *       - Audit
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - action
 *               - actor
 *               - details
 *             properties:
 *               action:
 *                 type: string
 *               actor:
 *                 type: string
 *               actorType:
 *                 type: string
 *                 enum: [user, admin, system, anonymous]
 *               severity:
 *                 type: string
 *                 enum: [info, warning, critical]
 *               details:
 *                 type: object
 *               success:
 *                 type: boolean
 *               errorMessage:
 *                 type: string
 *     responses:
 *       201:
 *         description: 日志创建成功
 *       400:
 *         description: 请求参数错误
 *       401:
 *         description: 未授权
 */
export async function POST(request: Request) {
  return handleApi(request, async () => {
    // Rate limiting
    const limited = await rateLimit(request, {
      key: 'audit_logs_post',
      limit: 120,
      windowMs: 60_000,
    });
    if (limited) return limited;

    // Require admin access
    const auth = await requireAdmin(request, {
      strict: true,
      scope: 'audit_read',
    });
    if (auth) return auth;

    const body = await request.json();
    const logger = getAuditLogger();

    logger.log({
      action: body.action,
      actor: body.actor,
      actorType: body.actorType || 'system',
      severity: body.severity || 'info',
      details: body.details || {},
      success: body.success ?? true,
      errorMessage: body.errorMessage,
      ip: request.headers.get('x-forwarded-for') || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    return {
      success: true,
      message: 'Audit log created',
    };
  });
}
