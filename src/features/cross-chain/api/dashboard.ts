import { crossChainAnalysisService } from '@/features/oracle/services/crossChainAnalysisService';

export interface DashboardResponse {
  dashboard: Awaited<ReturnType<typeof crossChainAnalysisService.getDashboardData>>;
  meta: {
    timestamp: string;
  };
}

export async function fetchCrossChainDashboard(): Promise<DashboardResponse> {
  const dashboard = await crossChainAnalysisService.getDashboardData();

  return {
    dashboard,
    meta: {
      timestamp: new Date().toISOString(),
    },
  };
}
