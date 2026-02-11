import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';
import { gasPriceService } from '@/server/gas';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const chainsParam = searchParams.get('chains');

    if (!chainsParam) {
      return NextResponse.json(
        { ok: false, error: 'Chains parameter is required' },
        { status: 400 }
      );
    }

    const chains = chainsParam.split(',').map(c => c.trim()) as SupportedChain[];
    const gasPrices = await gasPriceService.getGasPricesForChains(chains);

    const result = Array.from(gasPrices.entries()).map(([, data]) => ({
      ...data,
    }));

    return NextResponse.json({
      ok: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to fetch gas prices',
      },
      { status: 500 }
    );
  }
}
