import { withMiddleware, STRICT_RATE_LIMIT } from '@/lib/api/middleware';
import { gasPriceService } from '@/services/gas';
import { apiSuccess } from '@/shared/utils';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

async function handlePost(request: Request) {
  const body = (await request.json()) as { chains?: SupportedChain[] };

  await gasPriceService.warmCache(body.chains);

  return apiSuccess({
    message: 'Gas price cache warmed up successfully',
  });
}

export const POST = withMiddleware({
  rateLimit: STRICT_RATE_LIMIT,
  validate: { allowedMethods: ['POST'] },
})(handlePost);
