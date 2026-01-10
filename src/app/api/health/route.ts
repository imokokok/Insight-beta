import { handleApi } from "@/server/apiResponse";
import { hasDatabase, query } from "@/server/db";
import { getEnvReport } from "@/lib/env";

export async function GET(request: Request) {
  return handleApi(request, async () => {
    const envReport = getEnvReport();

    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      database: hasDatabase()
        ? await query("SELECT 1 as ok")
            .then((res) => (res.rows[0]?.ok === 1 ? "connected" : "disconnected"))
            .catch(() => "disconnected")
        : "not_configured",
      environment: process.env.NODE_ENV,
      env: envReport
    };
  });
}
