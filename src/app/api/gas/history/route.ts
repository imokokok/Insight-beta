import type { NextRequest } from 'next/server';

import { NextResponse } from 'next/server';

import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';
import { gasPriceService } from '@/server/gas';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get('chain') as SupportedChain | null;
    const provider = searchParams.get('provider') as 'etherscan' | 'gasnow' | 'blocknative' | 'ethgasstation' | 'gasprice' | null;
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    if (!chain) {
      return NextResponse.json(
        { ok: false, error: 'Chain parameter is required' },
        { status: 400 }
      );
    }

    const history = gasPriceService.getHistory(
      chain,
      provider ?? undefined,
      Math.min(limit, 1000)
    );

    return NextResponse.json({
      ok: true,
      data: history,
      meta: {
        count: history.length,
        chain,
        provider,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to fetch gas price history',
      },
      { status: 500 }
    );
  }
}
