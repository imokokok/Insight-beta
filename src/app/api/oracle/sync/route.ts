import { ensureOracleSynced, getOracleEnv, isTableEmpty, readOracleState } from '@/server/oracle';
import {
  error,
  getAdminActor,
  handleApi,
  invalidateCachedJson,
  rateLimit,
  requireAdmin,
} from '@/server/apiResponse';
import { appendAuditLog } from '@/server/observability';
import { revalidateTag } from 'next/cache';
import { env } from '@/lib/config/env';
import { timingSafeEqualString } from '@/server/adminAuth';
import { DEFAULT_ORACLE_INSTANCE_ID } from '@/server/oracleConfig';

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
      key: 'oracle_sync_get',
      limit: 240,
      windowMs: 60_000,
    });
    if (limited) return limited;
    const url = new URL(request.url);
    const instanceId = url.searchParams.get('instanceId');
    const state = instanceId ? await readOracleState(instanceId) : await readOracleState();
    const isDemo = instanceId
      ? await isTableEmpty('assertions', instanceId)
      : await isTableEmpty('assertions');
    return {
      chain: state.chain,
      contractAddress: state.contractAddress,
      mode: isDemo ? 'demo' : 'real',
      lastProcessedBlock: state.lastProcessedBlock.toString(10),
      assertions: Object.keys(state.assertions).length,
      disputes: Object.keys(state.disputes).length,
      sync: state.sync,
    };
  });
}

export async function POST(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: 'oracle_sync_post',
      limit: 10,
      windowMs: 60_000,
    });
    if (limited) return limited;
    const url = new URL(request.url);
    const instanceId = url.searchParams.get('instanceId');
    const normalizedInstanceId =
      (instanceId ?? DEFAULT_ORACLE_INSTANCE_ID).trim() || DEFAULT_ORACLE_INSTANCE_ID;

    if (!isCronAuthorized(request)) {
      const auth = await requireAdmin(request, {
        strict: true,
        scope: 'oracle_sync_trigger',
      });
      if (auth) return auth;
    }

    const envConfig = instanceId ? await getOracleEnv(instanceId) : await getOracleEnv();
    if (!envConfig.rpcUrl || !envConfig.contractAddress) {
      return error({ code: 'missing_config' }, 400);
    }
    let result: { updated: boolean };
    try {
      result = instanceId ? await ensureOracleSynced(instanceId) : await ensureOracleSynced();
    } catch (e) {
      const code = e instanceof Error ? e.message : 'sync_failed';
      if (code === 'rpc_unreachable') return error({ code }, 502);
      if (code === 'contract_not_found') return error({ code }, 400);
      if (code === 'sync_failed') return error({ code }, 502);
      return error({ code: 'sync_failed' }, 502);
    }
    const state = instanceId ? await readOracleState(instanceId) : await readOracleState();
    const actor = getAdminActor(request);
    await appendAuditLog({
      actor,
      action: 'oracle_sync_triggered',
      entityType: 'oracle',
      entityId: state.contractAddress,
      details: {
        updated: result.updated,
        lastProcessedBlock: state.lastProcessedBlock.toString(10),
      },
    });
    if (result.updated) {
      // Next.js 16 revalidateTag requires options as second parameter
      const revalidateOptions = { revalidate: 0 } as any;
      revalidateTag('oracle-stats', revalidateOptions);
      revalidateTag(`oracle-stats:${normalizedInstanceId}`, revalidateOptions);
      revalidateTag('oracle-leaderboard', revalidateOptions);
      revalidateTag(`oracle-leaderboard:${normalizedInstanceId}`, revalidateOptions);
      revalidateTag('user-stats', revalidateOptions);
      revalidateTag(`user-stats:${normalizedInstanceId}`, revalidateOptions);
      await invalidateCachedJson('oracle_api:/api/oracle');
    }
    const isDemo = instanceId
      ? await isTableEmpty('assertions', instanceId)
      : await isTableEmpty('assertions');
    return {
      updated: result.updated,
      chain: state.chain,
      contractAddress: state.contractAddress,
      mode: isDemo ? 'demo' : 'real',
      lastProcessedBlock: state.lastProcessedBlock.toString(10),
      assertions: Object.keys(state.assertions).length,
      disputes: Object.keys(state.disputes).length,
      sync: state.sync,
    };
  });
}
