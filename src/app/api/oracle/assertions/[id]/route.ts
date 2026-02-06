import { env } from '@/lib/config/env';
import { verifyAdmin } from '@/server/adminAuth';
import { cachedJson, error, handleApi, rateLimit } from '@/server/apiResponse';
import {
  getAssertion,
  getDisputeByAssertionId,
  readOracleConfig,
  redactOracleConfig,
} from '@/server/oracle';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: 'assertion_detail_get',
      limit: 120,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const { id } = await params;
    const url = new URL(request.url);
    const instanceId = url.searchParams.get('instanceId');

    const admin = await verifyAdmin(request, {
      strict: false,
      scope: 'oracle_config_write',
    });

    const compute = async (includeSecrets: boolean) => {
      const assertion = instanceId ? await getAssertion(id, instanceId) : await getAssertion(id);
      if (!assertion) return error({ code: 'not_found' }, 404);

      const dispute = instanceId
        ? await getDisputeByAssertionId(id, instanceId)
        : await getDisputeByAssertionId(id);
      const config = instanceId ? await readOracleConfig(instanceId) : await readOracleConfig();
      const degraded = env.INSIGHT_VOTING_DEGRADATION;
      const voteTrackingEnabled = env.INSIGHT_ENABLE_VOTING && !env.INSIGHT_DISABLE_VOTE_TRACKING;

      return {
        assertion,
        dispute,
        config: includeSecrets ? config : redactOracleConfig(config),
        bondWei: null,
        bondEth: null,
        voteTrackingEnabled: voteTrackingEnabled && !degraded,
      };
    };

    if (admin.ok) return await compute(true);
    const cacheKey = `oracle_api:${url.pathname}${url.search}`;
    return await cachedJson(cacheKey, 5_000, () => compute(false));
  });
}
