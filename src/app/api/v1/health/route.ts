/**
 * Health Check API (v1)
 *
 * 版本化的健康检查端点，支持多种健康检查探针
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { withApiVersion, type ApiVersion } from '@/lib/api/apiVersion';
import { error, rateLimit } from '@/server/apiResponse';
import { hasDatabase, query } from '@/server/db';
import { env, getEnvReport } from '@/lib/config/env';
import { requireAdmin } from '@/server/apiResponse';
import { readJsonFile } from '@/server/kvStore';
import { getOracleEnv, getSyncState, listOracleInstances } from '@/server/oracle';
import { readAlertRules } from '@/server/observability';

async function getOracleHealth(includeSync: boolean) {
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
        latestBlock: latestBlock?.toString(10) ?? null,
        safeBlock: syncState.safeBlock?.toString(10) ?? null,
        lastProcessedBlock: syncState.lastProcessedBlock.toString(10),
        lastSuccessProcessedBlock: syncState.lastSuccessProcessedBlock?.toString(10) ?? null,
        lagBlocks: lagBlocks?.toString(10) ?? null,
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

async function handler(request: NextRequest, version: ApiVersion) {
  const limited = await rateLimit(request, {
    key: 'health_get',
    limit: 240,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const url = new URL(request.url);
  const probe = (url.searchParams.get('probe') ?? '').toLowerCase();

  if (probe === 'liveness') {
    return NextResponse.json({
      status: 'ok',
      probe: 'liveness',
      version,
      timestamp: new Date().toISOString(),
    });
  }

  const isProd = process.env.NODE_ENV === 'production';
  const demoModeEnabled = env.INSIGHT_DEMO_MODE;

  if (probe === 'readiness') {
    const databaseStatus = hasDatabase()
      ? await query('SELECT 1 as ok')
          .then((res) => (res.rows[0]?.ok === 1 ? 'connected' : 'disconnected'))
          .catch(() => 'disconnected')
      : 'not_configured';

    const embeddedWorkerDisabled = env.INSIGHT_DISABLE_EMBEDDED_WORKER;
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
    const oracleReady = !isProd || oracleHealth.issues.length === 0;
    const ready =
      (databaseStatus === 'connected' || (!isProd && databaseStatus === 'not_configured')) &&
      workerOk &&
      databaseReady &&
      demoReady &&
      oracleReady;

    if (!ready) return error({ code: 'not_ready' }, 503);

    return NextResponse.json({
      status: 'ok',
      probe: 'readiness',
      version,
      timestamp: new Date().toISOString(),
    });
  }

  // Default: full health check
  const databaseStatus = hasDatabase()
    ? await query('SELECT 1 as ok')
        .then((res) => (res.rows[0]?.ok === 1 ? 'connected' : 'disconnected'))
        .catch(() => 'disconnected')
    : 'not_configured';

  const embeddedWorkerDisabled = env.INSIGHT_DISABLE_EMBEDDED_WORKER;
  const heartbeat = embeddedWorkerDisabled ? null : await readJsonFile('worker/heartbeat/v1', null);
  const at = heartbeat && typeof heartbeat === 'object' ? (heartbeat as { at?: unknown }).at : null;
  const atMs = typeof at === 'string' ? Date.parse(at) : NaN;
  const workerOk = embeddedWorkerDisabled || (Number.isFinite(atMs) && Date.now() - atMs <= 90_000);

  const envReport = getEnvReport();
  const auth = await requireAdmin(request, {
    strict: false,
    scope: 'audit_read',
  });
  const includeEnv = auth === null;
  const oracleHealth = await getOracleHealth(true);
  const alertRules = isProd ? await readAlertRules() : [];
  const enabledAlertRules = alertRules.filter((rule) => rule.enabled);

  const issues: string[] = [];
  if (databaseStatus === 'disconnected') issues.push('database_disconnected');
  if (isProd && databaseStatus === 'not_configured') issues.push('database_not_configured');
  if (isProd && demoModeEnabled) issues.push('demo_mode_enabled');
  if (!workerOk) issues.push('worker_stale');
  if (includeEnv && !envReport.ok) issues.push('env_invalid');

  issues.push(...oracleHealth.issues);

  return NextResponse.json({
    status: issues.length === 0 ? 'ok' : 'degraded',
    version,
    timestamp: new Date().toISOString(),
    issues,
    database: databaseStatus,
    worker: includeEnv ? { ok: workerOk, heartbeat } : null,
    oracle: includeEnv ? { instances: oracleHealth.instances } : null,
    alerts: includeEnv ? { enabled: enabledAlertRules.length } : null,
  });
}

export const GET = withApiVersion(handler);
