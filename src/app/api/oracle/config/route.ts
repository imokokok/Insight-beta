import { readOracleConfig, validateOracleConfigPatch, writeOracleConfig, type OracleConfig } from "@/server/oracleConfig";
import { error, handleApi, requireAdmin } from "@/server/apiResponse";

export async function GET() {
  return handleApi(() => readOracleConfig());
}

export async function PUT(request: Request) {
  return handleApi(async () => {
    const auth = requireAdmin(request);
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
      return writeOracleConfig(patch);
    } catch (e) {
      const code = e instanceof Error ? e.message : "unknown_error";
      return error(code, 400);
    }
  });
}
