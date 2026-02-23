import { crossChainAnalysisService } from '@/features/oracle/services/crossChainAnalysisService';
import { apiSuccess } from '@/lib/api/apiResponse';
import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';

async function handleGet() {
  const dashboard = await crossChainAnalysisService.getDashboardData();

  return apiSuccess({
    dashboard,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
