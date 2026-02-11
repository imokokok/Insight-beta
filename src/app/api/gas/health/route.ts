import { NextResponse } from 'next/server';

import { gasPriceService } from '@/server/gas';

export async function GET() {
  try {
    const health = gasPriceService.getProviderHealth();

    return NextResponse.json({
      ok: true,
      data: health,
      meta: {
        totalProviders: health.length,
        healthyCount: health.filter(h => h.status === 'healthy').length,
        degradedCount: health.filter(h => h.status === 'degraded').length,
        unhealthyCount: health.filter(h => h.status === 'unhealthy').length,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : 'Failed to fetch provider health',
      },
      { status: 500 }
    );
  }
}
