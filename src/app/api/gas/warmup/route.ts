import { NextResponse } from 'next/server';

import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';
import { gasPriceService } from '@/server/gas';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { chains?: SupportedChain[] };
    
    await gasPriceService.warmCache(body.chains);

    return NextResponse.json({
      ok: true,
      message: 'Gas price cache warmed up successfully',
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to warm up gas price cache',
      },
      { status: 500 }
    );
  }
}
