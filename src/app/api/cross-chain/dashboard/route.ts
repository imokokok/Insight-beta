import { apiSuccess, withErrorHandler } from '@/shared/utils';
import { crossChainAnalysisService } from '@/services/oracle/crossChainAnalysisService';

export const GET = withErrorHandler(async () => {
  const dashboard = await crossChainAnalysisService.getDashboardData();

  return apiSuccess({
    dashboard,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});
