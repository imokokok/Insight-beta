import { getAssertion, getDisputeByAssertionId, getOracleEnv, readOracleConfig, redactOracleConfig } from "@/server/oracle";
import { error, handleApi, rateLimit } from "@/server/apiResponse";
import { verifyAdmin } from "@/server/adminAuth";
import { createPublicClient, formatEther, http } from "viem";
import { oracleAbi } from "@/lib/oracleAbi";
import { parseRpcUrls } from "@/lib/utils";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, { key: "assertion_detail_get", limit: 120, windowMs: 60_000 });
    if (limited) return limited;

    const { id } = await params;
    const assertion = await getAssertion(id);
    if (!assertion) return error({ code: "not_found" }, 404);
    
    const dispute = await getDisputeByAssertionId(id);
    const admin = await verifyAdmin(request, { strict: false, scope: "oracle_config_write" });
    const config = await readOracleConfig();
    let bondWei: string | null = null;
    let bondEth: string | null = null;
    const envConfig = await getOracleEnv();
    const rpcUrl = envConfig.rpcUrl;
    const contractAddress = envConfig.contractAddress;
    if (rpcUrl && contractAddress) {
      try {
        const urls = parseRpcUrls(rpcUrl);
        for (const url of urls) {
          try {
            const client = createPublicClient({ transport: http(url) });
            const bond = await client.readContract({
              address: contractAddress as `0x${string}`,
              abi: oracleAbi,
              functionName: "getBond",
              args: []
            });
            bondWei = bond.toString(10);
            bondEth = formatEther(bond);
            break;
          } catch {
            continue;
          }
        }
      } catch {
        bondWei = null;
        bondEth = null;
      }
    }
    return { assertion, dispute, config: admin.ok ? config : redactOracleConfig(config), bondWei, bondEth };
  });
}
