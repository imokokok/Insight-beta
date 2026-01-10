import { readOracleConfig, validateOracleConfigPatch, writeOracleConfig, type OracleConfig } from "@/server/oracleConfig";
import { error, getAdminActor, handleApi, rateLimit, requireAdmin } from "@/server/apiResponse";
import { appendAuditLog } from "@/server/observability";

export async function GET(request: Request) {
  return handleApi(request, () => readOracleConfig());
}

export async function PUT(request: Request) {
  return handleApi(request, async () => {
    const limited = rateLimit(request, { key: "oracle_config_put", limit: 30, windowMs: 60_000 });
    if (limited) return limited;

    const auth = await requireAdmin(request, { strict: true, scope: "oracle_config_write" });
    if (auth) return auth;

    const parsed = (await request.json().catch(() => null)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return error("invalid_request_body", 400);
    }
    const body = parsed as Partial<OracleConfig>;
    try {
      const patch = validateOracleConfigPatch({
        rpcUrl: body.rpcUrl,
        contractAddress: body.contractAddress,
        chain: body.chain,
        startBlock: body.startBlock,
        maxBlockRange: body.maxBlockRange,
        votingPeriodHours: body.votingPeriodHours
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
