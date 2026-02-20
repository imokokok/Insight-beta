import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { apiSuccess } from '@/shared/utils';

interface CorrelationData {
  chain1: string;
  chain2: string;
  correlation: number;
  sampleSize: number;
}

interface CorrelationMatrixResponse {
  chains: string[];
  matrix: number[][];
  correlations: CorrelationData[];
  meta: {
    symbol: string;
    timeRange: string;
    timestamp: string;
  };
}

const SUPPORTED_CHAINS = [
  'ethereum',
  'bsc',
  'polygon',
  'avalanche',
  'arbitrum',
  'optimism',
  'base',
];

function generateCorrelationMatrix(symbol: string, timeRange: string): CorrelationMatrixResponse {
  const chains = SUPPORTED_CHAINS.slice(0, 5 + Math.floor(Math.random() * 3));
  const size = chains.length;
  const matrix: number[][] = Array.from({ length: size }, () => Array(size).fill(0));
  const correlations: CorrelationData[] = [];

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      if (i === j) {
        matrix[i]![j] = 1.0;
      } else if (j > i) {
        const baseCorr = 0.85 + Math.random() * 0.14;
        matrix[i]![j] = baseCorr;
        matrix[j]![i] = baseCorr;

        const chain1 = chains[i];
        const chain2 = chains[j];
        if (chain1 && chain2) {
          correlations.push({
            chain1,
            chain2,
            correlation: baseCorr,
            sampleSize: Math.floor(Math.random() * 500) + 100,
          });
        }
      }
    }
  }

  return {
    chains,
    matrix,
    correlations,
    meta: {
      symbol,
      timeRange,
      timestamp: new Date().toISOString(),
    },
  };
}

async function handleGet(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol') || 'BTC';
  const timeRange = searchParams.get('timeRange') || '7d';

  const data = generateCorrelationMatrix(symbol, timeRange);

  return apiSuccess(data);
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
