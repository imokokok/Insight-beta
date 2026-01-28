import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { fetchUMAAssertion } from '@/server/oracle/umaState';
import { handleApi, rateLimit } from '@/server/apiResponse';
import { logger } from '@/lib/logger';

const RATE_LIMITS = {
  GET: { key: 'uma_assertion_get', limit: 120, windowMs: 60_000 },
} as const;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    return await handleApi(request, async () => {
      const limited = await rateLimit(request, RATE_LIMITS.GET);
      if (limited) return limited;

      const { id } = await params;
      const url = new URL(request.url);
      const instanceId = url.searchParams.get('instanceId') || 'uma-mainnet';

      const assertion = await fetchUMAAssertion(id, instanceId);

      if (!assertion) {
        return NextResponse.json({ error: 'Assertion not found', id }, { status: 404 });
      }

      const durationMs = Date.now() - startTime;
      logger.debug('UMA assertion fetched', { requestId, id, durationMs });

      return assertion;
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    logger.error('UMA assertion GET failed', {
      requestId,
      error: error instanceof Error ? error.message : 'Unknown',
      durationMs,
    });
    throw error;
  }
}
