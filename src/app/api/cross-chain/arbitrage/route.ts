import { NextRequest, NextResponse } from 'next/server';
import { crossChainAnalysisService } from '@/server/oracle/crossChainAnalysisService';
import { logger } from '@/lib/logger';

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

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const thresholdParam = searchParams.get('threshold');

  try {
    const validatedSymbol = validateSymbol(symbol);
    if (validatedSymbol === null) {
      return NextResponse.json(
        { 
          error: `Invalid symbol. Valid symbols: ${VALID_SYMBOLS.join(', ')}`, 
          code: 'INVALID_SYMBOL' 
        },
        { status: 400 }
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

    return NextResponse.json({
      success: true,
      data: {
        symbol: validatedSymbol,
        opportunities: filteredOpportunities,
        summary,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Arbitrage detection error:', {
      error: error instanceof Error ? error.message : String(error),
      symbol,
      threshold: thresholdParam,
    });

    const errorMessage = error instanceof Error ? error.message : 'Failed to detect arbitrage opportunities';
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: 'ARBITRAGE_ERROR',
      },
      { status: 500 }
    );
  }
}
