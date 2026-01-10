import { readOracleConfig, redactOracleConfig, validateOracleConfigPatch, writeOracleConfig, type OracleConfig } from "@/server/oracle";
import { error, getAdminActor, handleApi, invalidateCachedJson, rateLimit, requireAdmin } from "@/server/apiResponse";
import { appendAuditLog } from "@/server/observability";
import { verifyAdmin } from "@/server/adminAuth";

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, { key: "oracle_config_get", limit: 240, windowMs: 60_000 });
    if (limited) return limited;
    const config = await readOracleConfig();
    const admin = await verifyAdmin(request, { strict: false, scope: "oracle_config_write" });
    return admin.ok ? config : redactOracleConfig(config);
  });
}

export async function PUT(request: Request) {
  return handleApi(request, async () => {
    const limited = await rateLimit(request, { key: "oracle_config_put", limit: 30, windowMs: 60_000 });
    if (limited) return limited;

    const auth = await requireAdmin(request, { strict: true, scope: "oracle_config_write" });
    if (auth) return auth;

    const parsed = (await request.json().catch(() => null)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return error({ code: "invalid_request_body" }, 400);
    }
    const body = parsed as Partial<OracleConfig>;
    try {
      const patch = validateOracleConfigPatch({
        rpcUrl: body.rpcUrl,
        contractAddress: body.contractAddress,
        chain: body.chain,
        startBlock: body.startBlock,
        maxBlockRange: body.maxBlockRange,
        votingPeriodHours: body.votingPeriodHours,
        confirmationBlocks: body.confirmationBlocks
      });
      const updated = await writeOracleConfig(patch);
      const actor = getAdminActor(request);
      await appendAuditLog({
        actor,
        action: "oracle_config_updated",
        entityType: "oracle",
        entityId: updated.contractAddress || null,
        details: patch
      });
      await invalidateCachedJson("oracle_api:/api/oracle");
      return updated;
    } catch (e) {
      const code = e instanceof Error ? e.message : "unknown_error";
      const field = e && typeof e === "object" && "field" in e ? (e as { field?: unknown }).field : undefined;
      if (typeof field === "string") {
        return error({ code, details: { field } }, 400);
      }
      return error({ code }, 400);
    }
  });
}
