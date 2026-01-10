import { ensureOracleSynced } from "@/server/oracleIndexer";
import { readOracleConfig } from "@/server/oracleConfig";
import { readOracleState } from "@/server/oracleState";
import { error, getAdminActor, handleApi, rateLimit, requireAdmin } from "@/server/apiResponse";
import { appendAuditLog } from "@/server/observability";

export async function GET(request: Request) {
  return handleApi(request, async () => {
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
  return handleApi(request, async () => {
    const limited = rateLimit(request, { key: "oracle_sync_post", limit: 10, windowMs: 60_000 });
    if (limited) return limited;

    const auth = await requireAdmin(request, { strict: true, scope: "oracle_sync_trigger" });
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
    const actor = getAdminActor(request);
    await appendAuditLog({
      actor,
      action: "oracle_sync_triggered",
      entityType: "oracle",
      entityId: state.contractAddress,
      details: { updated: result.updated, lastProcessedBlock: state.lastProcessedBlock.toString(10) }
    });
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
