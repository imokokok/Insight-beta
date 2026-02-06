import type { NextRequest } from 'next/server';

import { logger } from '@/lib/logger';
import { handleApi, rateLimit, requireAdmin } from '@/server/apiResponse';
import { listUMAConfigs } from '@/server/oracle/umaConfig';
import {
  startUMASyncTask,
  stopUMASyncTask,
  getUMASyncTaskStatus,
  reloadUMAInstances,
  addUMAInstance,
  removeUMAInstance,
} from '@/server/oracle/umaSyncTask';

const RATE_LIMITS = {
  GET: { key: 'uma_task_get', limit: 30, windowMs: 60_000 },
  POST: { key: 'uma_task_post', limit: 10, windowMs: 60_000 },
} as const;

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.GET);
      if (limited) return limited;

      const status = getUMASyncTaskStatus();
      const configs = await listUMAConfigs();

      return {
        task: status,
        availableInstances: configs.map((c) => ({ id: c.id, chain: c.chain, enabled: c.enabled })),
      };
    });
  } catch (error) {
    logger.error('UMA task status GET failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.POST);
      if (limited) return limited;

      const auth = await requireAdmin(request, { strict: true, scope: 'uma_admin' });
      if (auth) return auth;

      const body = await request.json();
      const { action, instanceId } = body;

      let result: { success: boolean; message: string };

      switch (action) {
        case 'start':
          startUMASyncTask();
          result = { success: true, message: 'UMA sync task started' };
          break;
        case 'stop':
          stopUMASyncTask();
          result = { success: true, message: 'UMA sync task stopped' };
          break;
        case 'reload': {
          const instanceIds = await reloadUMAInstances();
          result = { success: true, message: `Reloaded ${instanceIds.length} instances` };
          break;
        }
        case 'add':
          if (!instanceId) {
            throw Object.assign(new Error('instanceId required'), { status: 400 });
          }
          addUMAInstance(instanceId);
          result = { success: true, message: `Added instance ${instanceId}` };
          break;
        case 'remove':
          if (!instanceId) {
            throw Object.assign(new Error('instanceId required'), { status: 400 });
          }
          removeUMAInstance(instanceId);
          result = { success: true, message: `Removed instance ${instanceId}` };
          break;
        default:
          throw Object.assign(new Error('Invalid action'), { status: 400 });
      }

      logger.info('UMA task action executed', { requestId, action, instanceId, ...result });

      return result;
    });
  } catch (error) {
    logger.error('UMA task POST failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
    });
    throw error;
  }
}
