import type { NextRequest } from 'next/server';

import { getPriceHistory, getLatestPrices } from '@/features/oracle/services/priceHistoryCollector';
import { ok, error } from '@/lib/api/apiResponse';
import { hasDatabase } from '@/lib/database/db';

export async function GET(request: NextRequest) {
  try {
    if (!hasDatabase()) {
      return error({ code: 'DATABASE_UNAVAILABLE', message: 'Database not available' }, 503);
    }

    const { searchParams } = new URL(request.url);
    const protocol = searchParams.get('protocol');
    const symbol = searchParams.get('symbol');
    const startTime = searchParams.get('startTime');
    const endTime = searchParams.get('endTime');
    const limit = parseInt(searchParams.get('limit') || '1000', 10);
    const latest = searchParams.get('latest') === 'true';

    if (latest) {
      const prices = await getLatestPrices(protocol ?? undefined, symbol ?? undefined);
      return ok(prices, { count: prices.length });
    }

    if (!protocol || !symbol) {
      return error(
        { code: 'MISSING_PARAMETERS', message: 'Missing required parameters: protocol and symbol' },
        400,
      );
    }

    const history = await getPriceHistory(protocol, symbol, {
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      limit,
    });

    return ok(history, { protocol, symbol, count: history.length });
  } catch (err) {
    return error(
      {
        code: 'PRICE_HISTORY_FETCH_FAILED',
        message: 'Failed to fetch price history',
        details: err instanceof Error ? err.message : 'Unknown error',
      },
      500,
    );
  }
}
