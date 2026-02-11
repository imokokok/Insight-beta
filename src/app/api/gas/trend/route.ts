import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';
import { gasPriceService } from '@/server/gas';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get('chain') as SupportedChain | null;
    const priceLevel = searchParams.get('priceLevel') as 'slow' | 'average' | 'fast' | 'fastest' | null;

    if (!chain) {
      return NextResponse.json(
        { ok: false, error: 'Chain parameter is required' },
        { status: 400 }
      );
    }

    if (!priceLevel) {
      return NextResponse.json(
        { ok: false, error: 'Price level parameter is required' },
        { status: 400 }
      );
    }

    const trend = gasPriceService.getTrend(chain, priceLevel);

    return NextResponse.json({
      ok: true,
      data: trend,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to fetch gas price trend',
      },
      { status: 500 }
    );
  }
}
