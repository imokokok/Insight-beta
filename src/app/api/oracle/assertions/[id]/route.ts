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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
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

    const compute = async () => {
      const assertion = await getAssertion(id);
      if (!assertion) return error({ code: "not_found" }, 404);

      const dispute = await getDisputeByAssertionId(id);
      const admin = await verifyAdmin(request, {
        strict: false,
        scope: "oracle_config_write",
      });
      const config = await readOracleConfig();

      const envConfig = await getOracleEnv();
      const { bondWei, bondEth } = await getBondData(
        envConfig.rpcUrl,
        envConfig.contractAddress
      );

      return {
        assertion,
        dispute,
        config: admin.ok ? config : redactOracleConfig(config),
        bondWei,
        bondEth,
      };
    };

    const cacheKey = `oracle_api:${url.pathname}`;
    return await cachedJson(cacheKey, 5_000, compute);
  });
}
