import { readOracleConfig } from "@/server/oracleConfig";
import { readOracleState } from "@/server/oracleState";
import { isOracleSyncing } from "@/server/oracleIndexer";
import { handleApi } from "@/server/apiResponse";

export async function GET() {
  return handleApi(async () => {
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
