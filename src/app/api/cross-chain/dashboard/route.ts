import { fetchCrossChainDashboard } from '@/features/cross-chain/api';
import { apiSuccess } from '@/lib/api/apiResponse';
import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';

async function handleGet() {
  const response = await fetchCrossChainDashboard();
  return apiSuccess(response);
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
