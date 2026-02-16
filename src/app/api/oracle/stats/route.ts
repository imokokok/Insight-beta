import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    ok: true,
    data: {
      totalProtocols: 12,
      totalPriceFeeds: 342,
      activeAlerts: 3,
      avgLatency: 520,
      totalValueSecured: '$2.3B',
      priceUpdates24h: 12450,
      networkUptime: 99.9,
      staleFeeds: 2,
    },
  });
}
