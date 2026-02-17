import { ok } from '@/lib/api/apiResponse';

export async function GET() {
  return ok({
    totalProtocols: 12,
    totalPriceFeeds: 342,
    activeAlerts: 3,
    avgLatency: 520,
    totalValueSecured: '$2.3B',
    priceUpdates24h: 12450,
    networkUptime: 99.9,
    staleFeeds: 2,
  });
}
