import { gasPriceService } from '@/services/gas';
import { apiSuccess, withErrorHandler } from '@/shared/utils';
import type { SupportedChain } from '@/types/unifiedOracleTypes';

export const POST = withErrorHandler(async (request: Request) => {
  const body = (await request.json()) as { chains?: SupportedChain[] };

  await gasPriceService.warmCache(body.chains);

  return apiSuccess({
    message: 'Gas price cache warmed up successfully',
  });
});
