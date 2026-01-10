import { readOracleConfig } from "@/server/oracleConfig";
import { readOracleState } from "@/server/oracleState";
import { isOracleSyncing } from "@/server/oracleIndexer";
import { handleApi, rateLimit } from "@/server/apiResponse";

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = rateLimit(request, { key: "oracle_status_get", limit: 240, windowMs: 60_000 });
    if (limited) return limited;

    const config = await readOracleConfig();
    const state = await readOracleState();
    return {
      config,
      state: {
        chain: state.chain,
        contractAddress: state.contractAddress,
        lastProcessedBlock: state.lastProcessedBlock.toString(10),
        assertions: Object.keys(state.assertions).length,
        disputes: Object.keys(state.disputes).length,
        syncing: isOracleSyncing(),
        sync: state.sync
      }
    };
  });
}
