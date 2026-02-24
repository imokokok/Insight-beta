import { fetchMarketOverview } from '@/features/explore/api';
import { ok } from '@/lib/api/apiResponse';

export async function GET() {
  const response = await fetchMarketOverview();
  return ok(response.data, { meta: response.meta });
}
