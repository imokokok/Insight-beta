import type { NextRequest } from 'next/server';

import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { crossChainAnalysisService } from '@/features/oracle/services/crossChainAnalysisService';
import { logger } from '@/shared/logger';
import { apiSuccess, apiError, getQueryParam } from '@/shared/utils';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

const VALID_SYMBOLS = ['BTC', 'ETH', 'SOL', 'LINK', 'AVAX', 'MATIC', 'UNI', 'AAVE'];
const VALID_CHAINS: SupportedChain[] = [
  'ethereum',
  'bsc',
  'polygon',
  'avalanche',
  'arbitrum',
  'optimism',
  'base',
  'solana',
  'near',
  'fantom',
  'celo',
  'gnosis',
  'linea',
  'scroll',
  'mantle',
  'mode',
  'blast',
  'aptos',
  'polygonAmoy',
  'sepolia',
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

  const chains = chainsParam.split(',').map((c) => c.trim().toLowerCase());
  const invalidChains = chains.filter((c) => !VALID_CHAINS.includes(c as SupportedChain));

  if (invalidChains.length > 0) {
    return null;
  }

  return chains as SupportedChain[];
}

async function handleGet(request: NextRequest) {
  const symbol = getQueryParam(request, 'symbol');
  const chainsParam = getQueryParam(request, 'chains');

  const validatedSymbol = validateSymbol(symbol);
  if (validatedSymbol === null) {
    return apiError(`Invalid symbol. Valid symbols: ${VALID_SYMBOLS.join(', ')}`, 400);
  }

  const chains = chainsParam !== null ? validateChains(chainsParam) : null;
  if (chainsParam !== null && chains === null) {
    return apiError('Invalid chains parameter', 400);
  }

  const comparison = await crossChainAnalysisService.comparePrices(
    validatedSymbol,
    chains ?? undefined,
  );

  logger.info('Cross-chain comparison completed', {
    symbol: symbol!.toUpperCase(),
    chainsCount: comparison.pricesByChain.length,
    priceRangePercent: comparison.statistics.priceRangePercent,
  });

  return apiSuccess({
    comparison,
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
