import { NextRequest, NextResponse } from 'next/server';
import { crossChainAnalysisService } from '@/server/oracle/crossChainAnalysisService';
import { logger } from '@/lib/logger';
import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';

const VALID_SYMBOLS = ['BTC', 'ETH', 'SOL', 'LINK', 'AVAX', 'MATIC', 'UNI', 'AAVE'];
const VALID_CHAINS: SupportedChain[] = [
  'ethereum', 'bsc', 'polygon', 'avalanche', 
  'arbitrum', 'optimism', 'base', 'solana',
  'near', 'fantom', 'celo', 'gnosis',
  'linea', 'scroll', 'mantle', 'mode',
  'blast', 'aptos', 'polygonAmoy', 'sepolia',
];

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

function validateChains(chainsParam: string | null): SupportedChain[] | null {
  if (!chainsParam) return null;
  
  const chains = chainsParam.split(',').map(c => c.trim().toLowerCase());
  const invalidChains = chains.filter(c => !VALID_CHAINS.includes(c as SupportedChain));
  
  if (invalidChains.length > 0) {
    return null;
  }
  
  return chains as SupportedChain[];
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const chainsParam = searchParams.get('chains');

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

    const chains = chainsParam !== null ? validateChains(chainsParam) : null;
    if (chainsParam !== null && chains === null) {
      return NextResponse.json(
        { 
          error: 'Invalid chains parameter', 
          code: 'INVALID_CHAINS',
          validChains: VALID_CHAINS 
        },
        { status: 400 }
      );
    }

    const comparison = await crossChainAnalysisService.comparePrices(
      validatedSymbol,
      chains ?? undefined
    );

    logger.info('Cross-chain comparison completed', {
      symbol: symbol!.toUpperCase(),
      chainsCount: comparison.pricesByChain.length,
      priceRangePercent: comparison.statistics.priceRangePercent,
    });

    return NextResponse.json({
      success: true,
      data: comparison,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Cross-chain comparison error:', {
      error: error instanceof Error ? error.message : String(error),
      symbol,
      chains: chainsParam,
    });

    const errorMessage = error instanceof Error ? error.message : 'Failed to compare prices';
    const isValidationError = errorMessage.includes('Need at least 2 chains') || 
                             errorMessage.includes('No valid price data');

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        code: isValidationError ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
      },
      { status: isValidationError ? 400 : 500 }
    );
  }
}
