import { error, handleApi, rateLimit } from '@/server/apiResponse';
import { hasDatabase, query } from '@/server/db';
import { env, getEnvReport } from '@/lib/config/env';
import { requireAdmin } from '@/server/apiResponse';
import { readJsonFile } from '@/server/kvStore';
import { getOracleEnv, getSyncState, listOracleInstances } from '@/server/oracle';
import { readAlertRules } from '@/server/observability';

type OracleHealthInstance = {
  id: string;
  chain: string;
  rpcConfigured: boolean;
  contractConfigured: boolean;
  rpcActiveUrl?: string | null;
  rpcStats?: unknown;
  lastAttemptAt?: string | null;
  lastSuccessAt?: string | null;
  lastDurationMs?: number | null;
  lastError?: string | null;
  latestBlock?: string | null;
  safeBlock?: string | null;
  lastProcessedBlock?: string | null;
  lastSuccessProcessedBlock?: string | null;
  lagBlocks?: string | null;
  consecutiveFailures?: number;
};

function readSloNumber(raw: string, fallback: number, opts?: { min?: number }) {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  const min = opts?.min ?? 0;
  return Math.max(min, n);
}

function minutesSince(iso: string | null) {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const diff = Date.now() - ms;
  if (!Number.isFinite(diff) || diff < 0) return null;
  return Math.round(diff / 60_000);
}

function getOracleSloIssues(instances: OracleHealthInstance[]) {
  const issues: string[] = [];
  const maxLagBlocks = readSloNumber(env.INSIGHT_SLO_MAX_LAG_BLOCKS, 200, {
    min: 0,
  });
  const maxSyncStalenessMinutes = readSloNumber(env.INSIGHT_SLO_MAX_SYNC_STALENESS_MINUTES, 30, {
    min: 1,
  });
  for (const inst of instances) {
    const lagNum = typeof inst.lagBlocks === 'string' ? Number(inst.lagBlocks) : null;
    const staleMin = minutesSince(inst.lastSuccessAt ?? null);
    if (lagNum !== null && Number.isFinite(lagNum) && lagNum > maxLagBlocks)
      issues.push(`oracle:${inst.id}:slo_lag_blocks_breached`);
    if (staleMin !== null && Number.isFinite(staleMin) && staleMin > maxSyncStalenessMinutes)
      issues.push(`oracle:${inst.id}:slo_sync_staleness_breached`);
  }
  return issues;
}

async function getOracleHealth(includeSync: boolean): Promise<{
  issues: string[];
  instances: OracleHealthInstance[];
}> {
  const instances = await listOracleInstances();
  const enabled = instances.filter((inst) => inst.enabled);
  const resolved = await Promise.all(
    enabled.map(async (inst) => {
      const envConfig = await getOracleEnv(inst.id);
      const rpcConfigured = Boolean(envConfig.rpcUrl);
      const contractConfigured = Boolean(envConfig.contractAddress);
      if (!includeSync) {
        return {
          id: inst.id,
          chain: envConfig.chain || inst.chain,
          rpcConfigured,
          contractConfigured,
        };
      }
      const syncState = await getSyncState(inst.id);
      const latestBlock = syncState.latestBlock;
      const lagBlocks =
        latestBlock !== null && latestBlock !== undefined
          ? latestBlock - syncState.lastProcessedBlock
          : null;
      return {
        id: inst.id,
        chain: envConfig.chain || inst.chain,
        rpcConfigured,
        contractConfigured,
        rpcActiveUrl: syncState.rpcActiveUrl ?? null,
        rpcStats: syncState.rpcStats ?? null,
        lastAttemptAt: syncState.sync.lastAttemptAt ?? null,
        lastSuccessAt: syncState.sync.lastSuccessAt ?? null,
        lastDurationMs: syncState.sync.lastDurationMs ?? null,
        lastError: syncState.sync.lastError ?? null,
        latestBlock:
          latestBlock !== null && latestBlock !== undefined ? latestBlock.toString(10) : null,
        safeBlock:
          syncState.safeBlock !== null && syncState.safeBlock !== undefined
            ? syncState.safeBlock.toString(10)
            : null,
        lastProcessedBlock: syncState.lastProcessedBlock.toString(10),
        lastSuccessProcessedBlock:
          syncState.lastSuccessProcessedBlock !== null &&
          syncState.lastSuccessProcessedBlock !== undefined
            ? syncState.lastSuccessProcessedBlock.toString(10)
            : null,
        lagBlocks: lagBlocks !== null ? lagBlocks.toString(10) : null,
        consecutiveFailures: syncState.consecutiveFailures ?? 0,
      };
    }),
  );
  const issues: string[] = [];
  for (const inst of resolved) {
    if (!inst.rpcConfigured) {
      issues.push(`oracle:${inst.id}:missing_rpc_url`);
    }
    if (!inst.contractConfigured) {
      issues.push(`oracle:${inst.id}:missing_contract_address`);
    }
  }
  return { issues, instances: resolved };
}

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
    if (probe === 'liveness') {
      return {
        status: 'ok',
        probe: 'liveness',
        timestamp: new Date().toISOString(),
      };
    }
    const isProd = process.env.NODE_ENV === 'production';
    const demoModeEnabled = ['1', 'true'].includes(env.INSIGHT_DEMO_MODE.toLowerCase());
    if (probe === 'readiness') {
      const databaseStatus = hasDatabase()
        ? await query('SELECT 1 as ok')
            .then((res) => (res.rows[0]?.ok === 1 ? ('connected' as const) : 'disconnected'))
            .catch(() => 'disconnected' as const)
        : ('not_configured' as const);

      const embeddedWorkerDisabled = ['1', 'true'].includes(
        env.INSIGHT_DISABLE_EMBEDDED_WORKER.toLowerCase(),
      );
      const heartbeat = embeddedWorkerDisabled
        ? null
        : await readJsonFile('worker/heartbeat/v1', null);
      const at =
        heartbeat && typeof heartbeat === 'object' ? (heartbeat as { at?: unknown }).at : null;
      const atMs = typeof at === 'string' ? Date.parse(at) : NaN;
      const workerOk =
        embeddedWorkerDisabled || (Number.isFinite(atMs) && Date.now() - atMs <= 90_000);

      const databaseReady = !isProd || databaseStatus === 'connected';
      const demoReady = !isProd || !demoModeEnabled;
      const oracleHealth = await getOracleHealth(true);
      const sloIssues = isProd ? getOracleSloIssues(oracleHealth.instances) : [];
      const oracleReady = !isProd || (oracleHealth.issues.length === 0 && sloIssues.length === 0);
      const ready =
        (databaseStatus === 'connected' || (!isProd && databaseStatus === 'not_configured')) &&
        workerOk &&
        databaseReady &&
        demoReady &&
        oracleReady;

      if (!ready) return error({ code: 'not_ready' }, 503);

      return {
        status: 'ok',
        probe: 'readiness',
        timestamp: new Date().toISOString(),
      };
    }
    if (probe === 'validation') {
      const databaseStatus = hasDatabase()
        ? await query('SELECT 1 as ok')
            .then((res) => (res.rows[0]?.ok === 1 ? ('connected' as const) : 'disconnected'))
            .catch(() => 'disconnected' as const)
        : ('not_configured' as const);

      const embeddedWorkerDisabled = ['1', 'true'].includes(
        env.INSIGHT_DISABLE_EMBEDDED_WORKER.toLowerCase(),
      );
      const heartbeat = embeddedWorkerDisabled
        ? null
        : await readJsonFile('worker/heartbeat/v1', null);
      const at =
        heartbeat && typeof heartbeat === 'object' ? (heartbeat as { at?: unknown }).at : null;
      const atMs = typeof at === 'string' ? Date.parse(at) : NaN;
      const workerOk =
        embeddedWorkerDisabled || (Number.isFinite(atMs) && Date.now() - atMs <= 90_000);

      const envReport = getEnvReport();
      const auth = await requireAdmin(request, {
        strict: false,
        scope: 'audit_read',
      });
      const includeEnv = auth === null;
      const oracleHealth = await getOracleHealth(true);
      const alertRules = isProd ? await readAlertRules() : [];
      const enabledAlertRules = alertRules.filter((rule) => rule.enabled);
      const webhookEnabled = enabledAlertRules.some((rule) => rule.channels?.includes('webhook'));
      const emailEnabled = enabledAlertRules.some((rule) => rule.channels?.includes('email'));
      const telegramEnabled = enabledAlertRules.some((rule) => rule.channels?.includes('telegram'));
      const hasEmailRecipient = enabledAlertRules.some(
        (rule) => rule.channels?.includes('email') && Boolean(rule.recipient),
      );
      const issues: string[] = [];
      if (databaseStatus === 'disconnected') issues.push('database_disconnected');
      if (isProd && databaseStatus === 'not_configured') issues.push('database_not_configured');
      if (isProd && demoModeEnabled) issues.push('demo_mode_enabled');
      if (!workerOk) issues.push('worker_stale');
      if (includeEnv && !envReport.ok) issues.push('env_invalid');
      if (isProd && webhookEnabled && !env.INSIGHT_WEBHOOK_URL)
        issues.push('INSIGHT_WEBHOOK_URL: required_for_webhook_alerts');
      if (isProd && emailEnabled) {
        const smtpOk =
          Boolean(env.INSIGHT_SMTP_HOST) &&
          Boolean(env.INSIGHT_SMTP_PORT) &&
          Boolean(env.INSIGHT_SMTP_USER) &&
          Boolean(env.INSIGHT_SMTP_PASS) &&
          Boolean(env.INSIGHT_FROM_EMAIL);
        if (!smtpOk) issues.push('INSIGHT_SMTP: required_for_email_alerts');
        if (!hasEmailRecipient && !env.INSIGHT_DEFAULT_EMAIL)
          issues.push('INSIGHT_DEFAULT_EMAIL: required_for_email_alerts');
      }
      if (
        isProd &&
        telegramEnabled &&
        (!env.INSIGHT_TELEGRAM_BOT_TOKEN || !env.INSIGHT_TELEGRAM_CHAT_ID)
      )
        issues.push('INSIGHT_TELEGRAM: required_for_telegram_alerts');
      issues.push(...oracleHealth.issues);
      issues.push(...getOracleSloIssues(oracleHealth.instances));

      return {
        status: issues.length === 0 ? 'ok' : 'degraded',
        probe: 'validation',
        timestamp: new Date().toISOString(),
        issues,
        database: databaseStatus,
        env: includeEnv ? envReport : { ok: false, issues: [] },
        worker: includeEnv ? heartbeat : null,
        oracle: includeEnv ? { instances: oracleHealth.instances } : null,
      };
    }
    const envReport = getEnvReport();
    const auth = await requireAdmin(request, {
      strict: false,
      scope: 'audit_read',
    });
    const includeEnv = auth === null;
    const worker = includeEnv ? await readJsonFile('worker/heartbeat/v1', null) : null;

    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: hasDatabase()
        ? await query('SELECT 1 as ok')
            .then((res) => (res.rows[0]?.ok === 1 ? 'connected' : 'disconnected'))
            .catch(() => 'disconnected')
        : 'not_configured',
      environment: process.env.NODE_ENV,
      env: includeEnv ? envReport : { ok: false, issues: [] },
      worker: includeEnv ? worker : null,
    };
  });
}
