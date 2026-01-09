import { getOracleStats } from "@/server/oracleStore";
import { ensureOracleSynced } from "@/server/oracleIndexer";
import { handleApi } from "@/server/apiResponse";

export async function GET(request: Request) {
  return handleApi(async () => {
    const url = new URL(request.url);
    if (url.searchParams.get("sync") === "1") {
      await ensureOracleSynced();
    }
    return await getOracleStats();
  });
}
