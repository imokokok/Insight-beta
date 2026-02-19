import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import {
  collectAllPrices,
  collectPricesForProtocol,
  cleanupOldPriceHistory,
} from '@/features/oracle/services/priceHistoryCollector';
import { SUPPORTED_PROTOCOLS } from '@/features/oracle/services/priceHistoryCollector';
import { hasDatabase } from '@/lib/database/db';
import { logger } from '@/shared/logger';

export async function POST(request: NextRequest) {
  try {
    if (!hasDatabase()) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const { protocol, symbols, cleanup = false, retentionDays = 90 } = body;

    if (cleanup) {
      const deletedCount = await cleanupOldPriceHistory(retentionDays);
      return NextResponse.json({
        success: true,
        message: `Cleaned up ${deletedCount} old records`,
        deletedCount,
      });
    }

    let result;

    if (protocol) {
      if (!SUPPORTED_PROTOCOLS.includes(protocol)) {
        return NextResponse.json(
          {
            error: `Unsupported protocol: ${protocol}. Supported: ${SUPPORTED_PROTOCOLS.join(', ')}`,
          },
          { status: 400 },
        );
      }
      result = await collectPricesForProtocol(protocol, symbols);
    } else {
      result = await collectAllPrices(symbols);
    }

    logger.info('Price collection completed', {
      totalAttempted: 'totalAttempted' in result ? result.totalAttempted : result.length,
      successful:
        'successful' in result ? result.successful : result.filter((r) => r.success).length,
      failed: 'failed' in result ? result.failed : result.filter((r) => !r.success).length,
    });

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (error) {
    logger.error('Price collection failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return NextResponse.json(
      {
        error: 'Failed to collect prices',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Price History Collection API',
    endpoints: {
      'POST /api/oracle/history/collect': {
        description: 'Collect and store prices from oracle protocols',
        body: {
          protocol: 'Optional: specific protocol (chainlink, pyth, redstone)',
          symbols: 'Optional: array of symbols to collect (default: BTC/USD, ETH/USD, etc.)',
          cleanup: 'Optional: set to true to cleanup old records',
          retentionDays: 'Optional: days to keep records (default: 90)',
        },
      },
    },
    supportedProtocols: SUPPORTED_PROTOCOLS,
  });
}
