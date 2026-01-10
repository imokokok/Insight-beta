import { getAssertion, getDisputeByAssertionId, readOracleConfig } from "@/server/oracle";
import { error, handleApi, rateLimit } from "@/server/apiResponse";
import { createPublicClient, formatEther, http } from "viem";
import { oracleAbi } from "@/lib/oracleAbi";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  return handleApi(request, async () => {
    const limited = rateLimit(request, { key: "assertion_detail_get", limit: 120, windowMs: 60_000 });
    if (limited) return limited;

    const { id } = await params;
    const assertion = await getAssertion(id);
    if (!assertion) return error({ code: "not_found" }, 404);
    
    const dispute = await getDisputeByAssertionId(id);
    const config = await readOracleConfig();
    let bondWei: string | null = null;
    let bondEth: string | null = null;
    if (config.rpcUrl && config.contractAddress) {
      try {
        const client = createPublicClient({ transport: http(config.rpcUrl) });
        const bond = await client.readContract({
          address: config.contractAddress as `0x${string}`,
          abi: oracleAbi,
          functionName: "getBond",
          args: []
        });
        bondWei = bond.toString(10);
        bondEth = formatEther(bond);
      } catch {
        bondWei = null;
        bondEth = null;
      }
    }
    return { assertion, dispute, config, bondWei, bondEth };
  });
}
