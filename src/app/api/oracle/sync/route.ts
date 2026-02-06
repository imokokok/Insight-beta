import { revalidateTag } from 'next/cache';

import { env } from '@/lib/config/env';
import { timingSafeEqualString } from '@/server/adminAuth';
import {
  error,
  getAdminActor,
  handleApi,
  invalidateCachedJson,
  rateLimit,
  requireAdmin,
} from '@/server/apiResponse';
import { appendAuditLog } from '@/server/observability';
import { ensureOracleSynced, getOracleEnv, isTableEmpty, readOracleState } from '@/server/oracle';
import { DEFAULT_ORACLE_INSTANCE_ID } from '@/server/oracleConfig';

function isCronAuthorized(request: Request): boolean {
  const secret = (env.INSIGHT_CRON_SECRET?.trim() || env.CRON_SECRET?.trim() || '').trim();
  if (!secret || secret.length < 16) {
    // 如果密钥未设置或太短，拒绝所有 cron 请求（安全默认）
    return false;
  }

  // 检查专用 cron 密钥头
  const gotHeader = request.headers.get('x-oracle-monitor-cron-secret')?.trim() ?? '';
  if (gotHeader) {
    return timingSafeEqualString(gotHeader, secret);
  }

  // 检查 Authorization Bearer token
  const auth = request.headers.get('authorization')?.trim() ?? '';
  if (!auth) return false;
  if (!auth.toLowerCase().startsWith('bearer ')) return false;
  const token = auth.slice(7).trim();
  if (!token) return false;
  return timingSafeEqualString(token, secret);
}

/**
 * 验证请求是否具有同步权限
 * 必须满足以下条件之一：
 * 1. 有效的 cron 密钥
 * 2. 有效的管理员权限
 */
async function verifySyncPermission(
  request: Request,
): Promise<{ authorized: boolean; response?: Response }> {
  // 首先检查 cron 授权
  if (isCronAuthorized(request)) {
    return { authorized: true };
  }

  // 然后检查管理员权限
  const authResult = await requireAdmin(request, {
    strict: true,
    scope: 'oracle_sync_trigger',
  });

  if (authResult) {
    return { authorized: false, response: authResult };
  }

  return { authorized: true };
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

    // 验证同步权限
    const permissionCheck = await verifySyncPermission(request);
    if (!permissionCheck.authorized) {
      return permissionCheck.response || error({ code: 'unauthorized' }, 401);
    }

    const envConfig = instanceId ? await getOracleEnv(instanceId) : await getOracleEnv();
    if (!envConfig.rpcUrl || !envConfig.contractAddress) {
      return error({ code: 'missing_config' }, 400);
    }
    let result: { updated: boolean };
    try {
      result = instanceId ? await ensureOracleSynced(instanceId) : await ensureOracleSynced();
    } catch (err: unknown) {
      const code = err instanceof Error ? err.message : 'sync_failed';
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
      const revalidateOptions = { revalidate: 0 } as unknown as Parameters<typeof revalidateTag>[1];
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
