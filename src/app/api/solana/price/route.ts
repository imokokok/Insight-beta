/**
 * Solana Price API Route
 *
 * Solana 价格 API 端点
 */

import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

// ============================================================================
// GET /api/solana/price
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol parameter is required' }, { status: 400 });
    }

    // Return mock data for now
    return NextResponse.json({
      success: true,
      data: {
        symbol,
        price: 100.0,
        timestamp: Date.now(),
        source: 'mock',
      },
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
// POST /api/solana/price/batch
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbols } = body;

    if (!symbols || !Array.isArray(symbols) || symbols.length === 0) {
      return NextResponse.json({ error: 'Symbols array is required' }, { status: 400 });
    }

    if (symbols.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 symbols allowed per request' },
        { status: 400 },
      );
    }

    // Return mock data for now
    const priceFeeds = symbols.map((symbol) => ({
      symbol,
      price: 100.0,
      timestamp: Date.now(),
      source: 'mock',
    }));

    return NextResponse.json({
      success: true,
      data: priceFeeds,
    });
  } catch (error) {
    console.error('[Solana API] Error fetching batch prices:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch batch prices',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
