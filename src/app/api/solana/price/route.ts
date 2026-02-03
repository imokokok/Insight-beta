/**
 * Solana Price API Route
 *
 * Solana 价格 API 端点
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { solanaConnectionManager } from '@/lib/blockchain/solana/connection';
import { createSwitchboardClient } from '@/lib/blockchain/solana/switchboard';
import { createPythClient } from '@/lib/blockchain/solana/pyth';

// ============================================================================
// GET /api/solana/price
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const protocol = searchParams.get('protocol') || 'switchboard';
    const chain = (searchParams.get('chain') as 'solana' | 'solanaDevnet') || 'solana';

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
    }

    const connection = solanaConnectionManager.getConnection(chain);

    let priceFeed;

    if (protocol === 'switchboard') {
      const client = createSwitchboardClient(connection);
      priceFeed = await client.getPriceFeed(symbol);
    } else if (protocol === 'pyth') {
      const client = createPythClient(connection);
      priceFeed = await client.getPriceFeed(symbol);
    } else {
      return NextResponse.json(
        { error: 'Invalid protocol. Use "switchboard" or "pyth"' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: priceFeed,
    });
  } catch (error) {
    console.error('[Solana API] Error fetching price:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch price',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

// ============================================================================
// GET /api/solana/price/batch
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols, protocol = 'switchboard', chain = 'solana' } = body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: 'Symbols array is required' }, { status: 400 });
    }

    if (symbols.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 symbols allowed per request' },
        { status: 400 },
      );
    }

    const connection = solanaConnectionManager.getConnection(chain as 'solana' | 'solanaDevnet');

    let priceFeeds;

    if (protocol === 'switchboard') {
      const client = createSwitchboardClient(connection);
      priceFeeds = await client.getMultiplePriceFeeds(symbols);
    } else if (protocol === 'pyth') {
      const client = createPythClient(connection);
      priceFeeds = await client.getMultiplePriceFeeds(symbols);
    } else {
      return NextResponse.json(
        { error: 'Invalid protocol. Use "switchboard" or "pyth"' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data: priceFeeds,
    });
  } catch (error) {
    console.error('[Solana API] Error fetching batch prices:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch prices',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
