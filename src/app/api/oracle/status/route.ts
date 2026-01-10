import { getSyncState, isOracleSyncing, readOracleConfig, readOracleState } from "@/server/oracle";
import { handleApi, rateLimit } from "@/server/apiResponse";

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = rateLimit(request, { key: "oracle_status_get", limit: 240, windowMs: 60_000 });
    if (limited) return limited;

    const config = await readOracleConfig();
    const state = await readOracleState();
    const syncState = await getSyncState();
    const latestBlock = syncState.latestBlock;
    const safeBlock = syncState.safeBlock;
    const lagBlocks =
      latestBlock !== null && latestBlock !== undefined ? latestBlock - syncState.lastProcessedBlock : null;
    return {
      config,
      state: {
        chain: state.chain,
        contractAddress: state.contractAddress,
        lastProcessedBlock: state.lastProcessedBlock.toString(10),
        latestBlock: latestBlock !== null && latestBlock !== undefined ? latestBlock.toString(10) : null,
        safeBlock: safeBlock !== null && safeBlock !== undefined ? safeBlock.toString(10) : null,
        lagBlocks: lagBlocks !== null ? lagBlocks.toString(10) : null,
        consecutiveFailures: syncState.consecutiveFailures ?? 0,
        rpcActiveUrl: syncState.rpcActiveUrl ?? null,
        rpcStats: syncState.rpcStats ?? null,
        assertions: Object.keys(state.assertions).length,
        disputes: Object.keys(state.disputes).length,
        syncing: isOracleSyncing(),
        sync: state.sync
      }
    };
  });
}
