import { fetchDiscovery } from '@/features/explore/api';
import { ok } from '@/lib/api/apiResponse';

export async function GET() {
  const data = await fetchDiscovery();
  return ok(data.items, {
    total: data.total,
    meta: data.meta,
  });
}
