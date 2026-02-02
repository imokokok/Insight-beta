import { NextRequest, NextResponse } from 'next/server';
import { manipulationDetectionService } from '@/lib/services/manipulationDetectionService';
import { createSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';
import type { OracleProtocol, SupportedChain } from '@/lib/types';

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
    const body: StartMonitorBody = await request.json().catch(() => ({}));
    const { protocol, symbol, chain, allFeeds } = body;

    await manipulationDetectionService.initialize();

    if (allFeeds) {
      const supabase = createSupabaseClient();
      const { data: feeds, error } = await supabase
        .from('price_feeds')
        .select('protocol, symbol, chain')
        .eq('is_active', true);

      if (error) {
        logger.error('Failed to fetch feeds', { error: error.message });
        return NextResponse.json(
          { error: 'Failed to fetch feeds' },
          { status: 500 }
        );
      }

      for (const feed of (feeds as FeedRow[] || [])) {
        await manipulationDetectionService.startMonitoring(
          feed.protocol as OracleProtocol,
          feed.symbol,
          feed.chain as SupportedChain,
          10000
        );
      }

      return NextResponse.json({
        success: true,
        message: `Started monitoring ${feeds?.length || 0} feeds`,
      });
    }

    if (protocol && symbol && chain) {
      await manipulationDetectionService.startMonitoring(
        protocol as OracleProtocol,
        symbol,
        chain as SupportedChain,
        10000
      );

      return NextResponse.json({
        success: true,
        message: `Started monitoring ${protocol}:${chain}:${symbol}`,
      });
    }

    return NextResponse.json(
      { error: 'Missing required parameters: protocol, symbol, chain or allFeeds' },
      { status: 400 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error starting monitor', { error: errorMessage });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
