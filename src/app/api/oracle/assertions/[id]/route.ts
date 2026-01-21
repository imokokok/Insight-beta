import {
  getAssertion,
  getDisputeByAssertionId,
  getOracleEnv,
  readOracleConfig,
  redactOracleConfig,
  getBondData,
} from "@/server/oracle";
import { cachedJson, error, handleApi, rateLimit } from "@/server/apiResponse";
import { verifyAdmin } from "@/server/adminAuth";
import { env } from "@/lib/env";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: "assertion_detail_get",
      limit: 120,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const { id } = await params;
    const url = new URL(request.url);
    const instanceId = url.searchParams.get("instanceId");

    const admin = await verifyAdmin(request, {
      strict: false,
      scope: "oracle_config_write",
    });

    const compute = async (includeSecrets: boolean) => {
      const assertion = instanceId
        ? await getAssertion(id, instanceId)
        : await getAssertion(id);
      if (!assertion) return error({ code: "not_found" }, 404);

      const dispute = instanceId
        ? await getDisputeByAssertionId(id, instanceId)
        : await getDisputeByAssertionId(id);
      const config = instanceId
        ? await readOracleConfig(instanceId)
        : await readOracleConfig();
      const degraded = ["1", "true"].includes(
        (env.INSIGHT_VOTING_DEGRADATION || "").toLowerCase(),
      );
      const voteTrackingEnabled =
        ["1", "true"].includes(
          (env.INSIGHT_ENABLE_VOTING || "").toLowerCase(),
        ) &&
        !["1", "true"].includes(
          (env.INSIGHT_DISABLE_VOTE_TRACKING || "").toLowerCase(),
        );

      const envConfig = instanceId
        ? await getOracleEnv(instanceId)
        : await getOracleEnv();
      const { bondWei, bondEth } = await getBondData(
        envConfig.rpcUrl,
        envConfig.contractAddress,
      );

      return {
        assertion,
        dispute,
        config: includeSecrets ? config : redactOracleConfig(config),
        bondWei,
        bondEth,
        voteTrackingEnabled: voteTrackingEnabled && !degraded,
      };
    };

    if (admin.ok) return await compute(true);
    const cacheKey = `oracle_api:${url.pathname}${url.search}`;
    return await cachedJson(cacheKey, 5_000, () => compute(false));
  });
}
