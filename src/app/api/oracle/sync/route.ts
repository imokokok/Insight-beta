import { ensureOracleSynced } from "@/server/oracleIndexer";
import { readOracleConfig } from "@/server/oracleConfig";
import { readOracleState } from "@/server/oracleState";
import { error, handleApi, requireAdmin } from "@/server/apiResponse";

export async function GET() {
  return handleApi(async () => {
    const state = await readOracleState();
    return {
      chain: state.chain,
      contractAddress: state.contractAddress,
      lastProcessedBlock: state.lastProcessedBlock.toString(10),
      assertions: Object.keys(state.assertions).length,
      disputes: Object.keys(state.disputes).length,
      sync: state.sync
    };
  });
}

export async function POST(request: Request) {
  return handleApi(async () => {
    const auth = requireAdmin(request);
    if (auth) return auth;

    const config = await readOracleConfig();
    if (!config.rpcUrl || !config.contractAddress) {
      return error("missing_config", 400);
    }
    let result: { updated: boolean };
    try {
      result = await ensureOracleSynced();
    } catch (e) {
      const code = e instanceof Error ? e.message : "sync_failed";
      if (code === "rpc_unreachable") return error(code, 502);
      if (code === "contract_not_found") return error(code, 400);
      if (code === "sync_failed") return error(code, 502);
      return error("sync_failed", 502);
    }
    const state = await readOracleState();
    return {
      updated: result.updated,
      chain: state.chain,
      contractAddress: state.contractAddress,
      lastProcessedBlock: state.lastProcessedBlock.toString(10),
      assertions: Object.keys(state.assertions).length,
      disputes: Object.keys(state.disputes).length,
      sync: state.sync
    };
  });
}
