import { crossChainAnalysisService } from '@/services/oracle/crossChainAnalysisService';
import { apiSuccess, withErrorHandler } from '@/shared/utils';

export const GET = withErrorHandler(async () => {
  const dashboard = await crossChainAnalysisService.getDashboardData();

  return apiSuccess({
    dashboard,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});
