import { env, getEnvReport } from '@/lib/config/env';
import { error, handleApi, rateLimit, requireAdmin } from '@/server/apiResponse';
import { hasDatabase, query } from '@/server/db';
import { readAlertRules } from '@/server/observability';

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: 健康检查端点
 *     description: |
 *       提供多种健康检查探针：
 *       - liveness: 应用是否存活
 *       - readiness: 应用是否就绪
 *       - validation: 完整配置验证
 *     tags:
 *       - Health
 *     parameters:
 *       - in: query
 *         name: probe
 *         schema:
 *           type: string
 *           enum: [liveness, readiness, validation]
 *         description: 探针类型
 *     responses:
 *       200:
 *         description: 健康状态正常
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 probe:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       503:
 *         description: 服务未就绪
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */

// ============================================================================
// 数据库健康检查
// ============================================================================

async function checkDatabaseStatus(): Promise<'connected' | 'disconnected' | 'not_configured'> {
  if (!hasDatabase()) return 'not_configured';

  try {
    const result = await query('SELECT 1 as ok');
    return result.rows[0]?.ok === 1 ? 'connected' : 'disconnected';
  } catch {
    return 'disconnected';
  }
}

// ============================================================================
// 告警配置检查
// ============================================================================

async function checkAlertConfiguration(): Promise<{
  webhookEnabled: boolean;
  emailEnabled: boolean;
  telegramEnabled: boolean;
  hasEmailRecipient: boolean;
}> {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    return {
      webhookEnabled: false,
      emailEnabled: false,
      telegramEnabled: false,
      hasEmailRecipient: false,
    };
  }

  const alertRules = await readAlertRules();
  const enabledAlertRules = alertRules.filter((rule) => rule.enabled);

  return {
    webhookEnabled: enabledAlertRules.some((rule) => rule.channels?.includes('webhook')),
    emailEnabled: enabledAlertRules.some((rule) => rule.channels?.includes('email')),
    telegramEnabled: enabledAlertRules.some((rule) => rule.channels?.includes('telegram')),
    hasEmailRecipient: enabledAlertRules.some(
      (rule) => rule.channels?.includes('email') && Boolean(rule.recipient),
    ),
  };
}

function validateAlertConfig(
  alertConfig: Awaited<ReturnType<typeof checkAlertConfiguration>>,
): string[] {
  const issues: string[] = [];

  if (alertConfig.webhookEnabled && !env.INSIGHT_WEBHOOK_URL) {
    issues.push('INSIGHT_WEBHOOK_URL: required_for_webhook_alerts');
  }

  if (alertConfig.emailEnabled) {
    const smtpOk =
      Boolean(env.INSIGHT_SMTP_HOST) &&
      Boolean(env.INSIGHT_SMTP_PORT) &&
      Boolean(env.INSIGHT_SMTP_USER) &&
      Boolean(env.INSIGHT_SMTP_PASS) &&
      Boolean(env.INSIGHT_FROM_EMAIL);

    if (!smtpOk) issues.push('INSIGHT_SMTP: required_for_email_alerts');
    if (!alertConfig.hasEmailRecipient && !env.INSIGHT_DEFAULT_EMAIL) {
      issues.push('INSIGHT_DEFAULT_EMAIL: required_for_email_alerts');
    }
  }

  if (
    alertConfig.telegramEnabled &&
    (!env.INSIGHT_TELEGRAM_BOT_TOKEN || !env.INSIGHT_TELEGRAM_CHAT_ID)
  ) {
    issues.push('INSIGHT_TELEGRAM: required_for_telegram_alerts');
  }

  return issues;
}

// ============================================================================
// 探针处理器
// ============================================================================

async function handleLivenessProbe() {
  return {
    status: 'ok',
    probe: 'liveness',
    timestamp: new Date().toISOString(),
  };
}

async function handleReadinessProbe() {
  const isProd = process.env.NODE_ENV === 'production';
  const demoModeEnabled = env.INSIGHT_DEMO_MODE;

  const databaseStatus = await checkDatabaseStatus();

  const databaseReady = !isProd || databaseStatus === 'connected';
  const demoReady = !isProd || !demoModeEnabled;

  const ready =
    (databaseStatus === 'connected' || (!isProd && databaseStatus === 'not_configured')) &&
    databaseReady &&
    demoReady;

  if (!ready) return error({ code: 'not_ready' }, 503);

  return {
    status: 'ok',
    probe: 'readiness',
    timestamp: new Date().toISOString(),
  };
}

async function handleValidationProbe(request: Request) {
  const isProd = process.env.NODE_ENV === 'production';
  const demoModeEnabled = env.INSIGHT_DEMO_MODE;

  const [databaseStatus, alertConfig, envReport, auth] = await Promise.all([
    checkDatabaseStatus(),
    checkAlertConfiguration(),
    getEnvReport(),
    requireAdmin(request, { strict: false, scope: 'audit_read' }),
  ]);

  const includeEnv = auth === null;
  const issues: string[] = [];

  // 基础检查
  if (databaseStatus === 'disconnected') issues.push('database_disconnected');
  if (isProd && databaseStatus === 'not_configured') issues.push('database_not_configured');
  if (isProd && demoModeEnabled) issues.push('demo_mode_enabled');
  if (includeEnv && !envReport.ok) issues.push('env_invalid');

  // 告警配置检查
  issues.push(...validateAlertConfig(alertConfig));

  return {
    status: issues.length === 0 ? 'ok' : 'degraded',
    probe: 'validation',
    timestamp: new Date().toISOString(),
    issues,
    database: databaseStatus,
    env: includeEnv ? envReport : { ok: false, issues: [] },
  };
}

async function handleDefaultHealthCheck(request: Request) {
  const [envReport, auth, databaseStatus] = await Promise.all([
    getEnvReport(),
    requireAdmin(request, { strict: false, scope: 'audit_read' }),
    checkDatabaseStatus(),
  ]);

  const includeEnv = auth === null;

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: databaseStatus,
    environment: process.env.NODE_ENV,
    env: includeEnv ? envReport : { ok: false, issues: [] },
  };
}

// ============================================================================
// 主处理函数
// ============================================================================

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: 'health_get',
      limit: 240,
      windowMs: 60_000,
    });

    if (limited) return limited;

    const url = new URL(request.url);
    const probe = (url.searchParams.get('probe') ?? '').toLowerCase();

    switch (probe) {
      case 'liveness':
        return handleLivenessProbe();
      case 'readiness':
        return handleReadinessProbe();
      case 'validation':
        return handleValidationProbe(request);
      default:
        return handleDefaultHealthCheck(request);
    }
  });
}
