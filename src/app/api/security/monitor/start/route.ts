import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { requireAdminWithToken } from '@/lib/api/apiResponse';
import { query } from '@/lib/database/db';
import { manipulationDetectionService } from '@/services/security/manipulationDetectionService';
import { logger } from '@/shared/logger';

interface StartMonitorBody {
  protocol?: string;
  symbol?: string;
  chain?: string;
  allFeeds?: boolean;
}

interface FeedRow {
  protocol: string;
  symbol: string;
  chain: string;
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminWithToken(request);
    if (auth) return auth;

    const body: StartMonitorBody = await request.json().catch(() => ({}));
    const { protocol, symbol, chain, allFeeds } = body;

    await manipulationDetectionService.initialize();

    if (allFeeds) {
      let feeds: FeedRow[] = [];

      try {
        const result = await query<FeedRow>(
          `SELECT protocol, symbol, chain FROM unified_price_feeds`,
        );
        feeds = result.rows;
      } catch (error) {
        logger.error('Failed to fetch feeds', {
          error: error instanceof Error ? error.message : String(error),
        });
        return NextResponse.json({ error: 'Failed to fetch feeds' }, { status: 500 });
      }

      for (const feed of feeds) {
        await manipulationDetectionService.startMonitoring(feed.protocol, feed.symbol);
      }

      return NextResponse.json({
        success: true,
        message: `Started monitoring ${feeds.length} feeds`,
      });
    }

    if (protocol && symbol && chain) {
      await manipulationDetectionService.startMonitoring(protocol, symbol);

      return NextResponse.json({
        success: true,
        message: `Started monitoring ${protocol}:${chain}:${symbol}`,
      });
    }

    return NextResponse.json(
      { error: 'Missing required parameters: protocol, symbol, chain or allFeeds' },
      { status: 400 },
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error starting monitor', { error: errorMessage });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
