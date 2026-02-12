import { apiSuccess, withErrorHandler } from '@/shared/utils';
import { gasPriceService } from '@/services/gas';

export const GET = withErrorHandler(async () => {
  const health = gasPriceService.getProviderHealth();

  return apiSuccess({
    providers: health,
    meta: {
      totalProviders: health.length,
      healthyCount: health.filter(h => h.status === 'healthy').length,
      degradedCount: health.filter(h => h.status === 'degraded').length,
      unhealthyCount: health.filter(h => h.status === 'unhealthy').length,
    },
  });
});
