import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';
import { gasPriceService } from '@/server/gas';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chain = searchParams.get('chain') as SupportedChain | null;
    const provider = searchParams.get('provider') as 'etherscan' | 'gasnow' | 'blocknative' | 'ethgasstation' | 'gasprice' | null;

    if (!chain) {
      return NextResponse.json(
        { ok: false, error: 'Chain parameter is required' },
        { status: 400 }
      );
    }

    const gasPrice = await gasPriceService.getGasPrice(chain, provider ?? undefined);

    return NextResponse.json({
      ok: true,
      data: gasPrice,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to fetch gas price',
      },
      { status: 500 }
    );
  }
}
