import type { SupportedChain } from '@/lib/types/unifiedOracleTypes';
import { apiSuccess, withErrorHandler } from '@/lib/utils';
import { gasPriceService } from '@/server/gas';

export const POST = withErrorHandler(async (request: Request) => {
  const body = await request.json() as { chains?: SupportedChain[] };

  await gasPriceService.warmCache(body.chains);

  return apiSuccess({
    message: 'Gas price cache warmed up successfully',
  });
});
