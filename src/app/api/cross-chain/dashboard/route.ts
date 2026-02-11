import { apiSuccess, withErrorHandler } from '@/lib/utils';
import { crossChainAnalysisService } from '@/server/oracle/crossChainAnalysisService';

export const GET = withErrorHandler(async () => {
  const dashboard = await crossChainAnalysisService.getDashboardData();

  return apiSuccess({
    dashboard,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});
