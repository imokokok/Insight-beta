import {
  getOwnerData,
  getSyncState,
  getOracleEnv,
  isOracleSyncing,
  readOracleConfig,
  readOracleState,
  redactOracleConfig,
} from "@/server/oracle";
import { cachedJson, handleApi, rateLimit } from "@/server/apiResponse";
import { verifyAdmin } from "@/server/adminAuth";

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, {
      key: "oracle_status_get",
      limit: 240,
      windowMs: 60_000,
    });
    if (limited) return limited;

    const admin = await verifyAdmin(request, {
      strict: false,
      scope: "oracle_config_write",
    });
    const url = new URL(request.url);

    const compute = async (includeSecrets: boolean) => {
      const config = await readOracleConfig();
      const envConfig = await getOracleEnv();
      const state = await readOracleState();
      const syncState = await getSyncState();
      const latestBlock = syncState.latestBlock;
      const safeBlock = syncState.safeBlock;
      const lagBlocks =
        latestBlock !== null && latestBlock !== undefined
          ? latestBlock - syncState.lastProcessedBlock
          : null;
      const configErrors: string[] = [];
      if (!(envConfig.rpcUrl || config.rpcUrl)) {
        configErrors.push("missing_rpc_url");
      }
      if (!(envConfig.contractAddress || config.contractAddress)) {
        configErrors.push("missing_contract_address");
      }
      const lastError = state.sync?.lastError ?? null;
      if (
        lastError === "contract_not_found" ||
        lastError === "invalid_chain" ||
        lastError === "missing_config"
      ) {
        if (!configErrors.includes(lastError)) configErrors.push(lastError);
      }
      const ownerInfo = await getOwnerData(
        envConfig.rpcUrl || config.rpcUrl,
        String(envConfig.contractAddress || config.contractAddress || ""),
      );
      return {
        config: includeSecrets ? config : redactOracleConfig(config),
        state: {
          chain: state.chain || envConfig.chain,
          contractAddress: state.contractAddress || envConfig.contractAddress,
          lastProcessedBlock: state.lastProcessedBlock.toString(10),
          latestBlock:
            latestBlock !== null && latestBlock !== undefined
              ? latestBlock.toString(10)
              : null,
          safeBlock:
            safeBlock !== null && safeBlock !== undefined
              ? safeBlock.toString(10)
              : null,
          lagBlocks: lagBlocks !== null ? lagBlocks.toString(10) : null,
          consecutiveFailures: syncState.consecutiveFailures ?? 0,
          rpcActiveUrl: includeSecrets
            ? (syncState.rpcActiveUrl ?? null)
            : null,
          rpcStats: includeSecrets ? (syncState.rpcStats ?? null) : null,
          assertions: Object.keys(state.assertions).length,
          disputes: Object.keys(state.disputes).length,
          syncing: isOracleSyncing(),
          sync: state.sync,
          configError: configErrors[0] ?? null,
          configErrors,
          owner: ownerInfo.owner,
          ownerIsContract: ownerInfo.isContractOwner,
        },
      };
    };

    if (admin.ok) return await compute(true);
    const cacheKey = `oracle_api:${url.pathname}${url.search}`;
    return await cachedJson(cacheKey, 2_000, () => compute(false));
  });
}
