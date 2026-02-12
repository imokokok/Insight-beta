import type { NextRequest } from 'next/server';

import { apiSuccess, apiError, withErrorHandler, getQueryParam } from '@/shared/utils';
import { crossChainAnalysisService } from '@/services/oracle/crossChainAnalysisService';

export const GET = withErrorHandler(async (request: NextRequest) => {
  const symbol = getQueryParam(request, 'symbol');
  const severity = getQueryParam(request, 'severity');

  if (!symbol) {
    return apiError('Symbol is required', 400);
  }

  const alerts = await crossChainAnalysisService.detectDeviationAlerts(symbol);

  const filteredAlerts = severity
    ? alerts.filter(a => a.severity === severity)
    : alerts;

  return apiSuccess({
    symbol,
    alerts: filteredAlerts,
    summary: {
      total: filteredAlerts.length,
      critical: filteredAlerts.filter(a => a.severity === 'critical').length,
      warning: filteredAlerts.filter(a => a.severity === 'warning').length,
      info: filteredAlerts.filter(a => a.severity === 'info').length,
      active: filteredAlerts.filter(a => a.status === 'active').length,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});
