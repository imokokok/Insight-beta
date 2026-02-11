import type { NextRequest } from 'next/server';

import { logger } from '@/lib/logger';
import { apiSuccess, apiError, withErrorHandler, getQueryParam } from '@/lib/utils';
import { crossChainAnalysisService } from '@/server/oracle/crossChainAnalysisService';

const VALID_SYMBOLS = ['BTC', 'ETH', 'SOL', 'LINK', 'AVAX', 'MATIC', 'UNI', 'AAVE'];

function validateSymbol(symbol: string | null): string | null {
  if (!symbol || typeof symbol !== 'string') {
    return null;
  }
  const upperSymbol = symbol.toUpperCase().trim();
  if (!VALID_SYMBOLS.includes(upperSymbol)) {
    return null;
  }
  return upperSymbol;
}

function validateThreshold(threshold: string | null): number | null {
  if (!threshold) return null;
  const value = parseFloat(threshold);
  if (isNaN(value) || value < 0 || value > 100) {
    return null;
  }
  return value;
}

export const GET = withErrorHandler(async (request: NextRequest) => {
  const symbol = getQueryParam(request, 'symbol');
  const thresholdParam = getQueryParam(request, 'threshold');

  const validatedSymbol = validateSymbol(symbol);
  if (validatedSymbol === null) {
    return apiError(
      `Invalid symbol. Valid symbols: ${VALID_SYMBOLS.join(', ')}`,
      400
    );
  }

  const threshold = validateThreshold(thresholdParam);

  const opportunities = await crossChainAnalysisService.detectArbitrageOpportunities(validatedSymbol);

  const filteredOpportunities = threshold !== null
    ? opportunities.filter(o => o.priceDiffPercent >= threshold)
    : opportunities;

  const summary = {
    total: filteredOpportunities.length,
    actionable: filteredOpportunities.filter(o => o.isActionable).length,
    avgProfitPercent: filteredOpportunities.length > 0
      ? filteredOpportunities.reduce((sum, o) => sum + o.potentialProfitPercent, 0) / filteredOpportunities.length
      : 0,
    highRisk: filteredOpportunities.filter(o => o.riskLevel === 'high').length,
    mediumRisk: filteredOpportunities.filter(o => o.riskLevel === 'medium').length,
    lowRisk: filteredOpportunities.filter(o => o.riskLevel === 'low').length,
    thresholdApplied: threshold,
  };

  logger.info('Arbitrage detection completed', {
    symbol: validatedSymbol,
    totalOpportunities: opportunities.length,
    filteredOpportunities: filteredOpportunities.length,
    threshold,
  });

  return apiSuccess({
    symbol: validatedSymbol,
    opportunities: filteredOpportunities,
    summary,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});
