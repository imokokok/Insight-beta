import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { getPriceHistory, getLatestPrices } from '@/features/oracle/services/priceHistoryCollector';
import { hasDatabase } from '@/lib/database/db';

export async function GET(request: NextRequest) {
  try {
    if (!hasDatabase()) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
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
      return NextResponse.json({
        success: true,
        count: prices.length,
        data: prices,
      });
    }

    if (!protocol || !symbol) {
      return NextResponse.json(
        { error: 'Missing required parameters: protocol and symbol' },
        { status: 400 },
      );
    }

    const history = await getPriceHistory(protocol, symbol, {
      startTime: startTime ? new Date(startTime) : undefined,
      endTime: endTime ? new Date(endTime) : undefined,
      limit,
    });

    return NextResponse.json({
      success: true,
      protocol,
      symbol,
      count: history.length,
      data: history,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to fetch price history',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
