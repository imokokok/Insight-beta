import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { handleApi, rateLimit, requireAdmin, verifyAdmin } from '@/server/apiResponse';
import { writeUMAConfig, readUMAConfig, type UMAConfig } from '@/server/oracle/umaConfig';

const RATE_LIMITS = {
  GET: { key: 'uma_config_get', limit: 120, windowMs: 60_000 },
  PUT: { key: 'uma_config_put', limit: 20, windowMs: 60_000 },
} as const;

const ALLOWED_FIELDS = [
  'chain',
  'rpcUrl',
  'optimisticOracleV2Address',
  'optimisticOracleV3Address',
  'startBlock',
  'maxBlockRange',
  'votingPeriodHours',
  'confirmationBlocks',
  'enabled',
] as const;

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.GET);
      if (limited) return limited;

      const url = new URL(request.url);
      const instanceId = url.searchParams.get('instanceId') || 'uma-mainnet';

      const admin = await verifyAdmin(request, { strict: false, scope: 'uma_config_write' });

      const config = await readUMAConfig(instanceId);
      if (!config) {
        return { error: 'Config not found' };
      }

      if (admin.ok) {
        return config;
      } else {
        return {
          id: config.id,
          chain: config.chain,
          enabled: config.enabled,
          startBlock: config.startBlock,
          maxBlockRange: config.maxBlockRange,
        };
      }
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('UMA config GET failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
      durationMs,
    });
    throw error;
  }
}

export async function PUT(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.PUT);
      if (limited) return limited;

      const auth = await requireAdmin(request, { strict: true, scope: 'uma_config_write' });
      if (auth) return auth;

      const url = new URL(request.url);
      const instanceId = url.searchParams.get('instanceId') || 'uma-mainnet';

      const body = await request.json();
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        throw Object.assign(new Error('invalid_request_body'), { status: 400 });
      }

      const safeBody: Partial<UMAConfig> = {};
      for (const field of ALLOWED_FIELDS) {
        if (field in body) {
          (safeBody as Record<string, unknown>)[field] = body[field];
        }
      }

      const updated = await writeUMAConfig(safeBody, instanceId);

      const durationMs = Date.now() - startTime;
      logger.info('UMA config updated', {
        requestId,
        instanceId,
        fieldsUpdated: Object.keys(safeBody),
        durationMs,
      });

      return updated;
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('UMA config PUT failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
      durationMs,
    });
    if (error instanceof SyntaxError) {
      throw Object.assign(new Error('invalid_request_body'), {
        status: 400,
        details: { message: 'Failed to parse JSON' },
      });
    }
    throw error;
  }
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
