import { handleApi } from "@/server/apiResponse";
import { query } from "@/server/db";

export async function GET() {
  return handleApi(async () => {
    // Check DB connection
    const res = await query("SELECT 1 as ok");
    const dbOk = res.rows[0].ok === 1;

    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      database: dbOk ? "connected" : "disconnected",
      environment: process.env.NODE_ENV
    };
  });
}
