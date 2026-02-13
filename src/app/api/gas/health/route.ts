import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { gasPriceService } from '@/services/gas';
import { apiSuccess } from '@/shared/utils';

async function handleGet() {
  const health = gasPriceService.getProviderHealth();

  return apiSuccess({
    providers: health,
    meta: {
      totalProviders: health.length,
      healthyCount: health.filter((h) => h.status === 'healthy').length,
      degradedCount: health.filter((h) => h.status === 'degraded').length,
      unhealthyCount: health.filter((h) => h.status === 'unhealthy').length,
    },
  });
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
