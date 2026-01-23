import { NextRequest } from "next/server";
import { handleApi } from "@/server/apiResponse";
import { generateExportFilename, type ExportFormat } from "@/lib/export";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handleApi(request, async () => {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as "assertions" | "disputes" | "alerts";
    const format = (searchParams.get("format") as ExportFormat) || "csv";
    const instanceId = searchParams.get("instanceId") || undefined;
    const status = searchParams.get("status") || undefined;
    const chain = searchParams.get("chain") || undefined;
    const limit = Number(searchParams.get("limit")) || 1000;

    if (!type) {
      return { error: "missing_type" };
    }

    let data: unknown[] = [];

    switch (type) {
      case "assertions": {
        const params = new URLSearchParams();
        if (instanceId) params.set("instanceId", instanceId);
        if (status) params.set("status", status);
        if (chain) params.set("chain", chain);
        params.set("limit", String(limit));

        const response = await fetch(
          `${process.env.INSIGHT_BASE_URL || "http://localhost:3000"}/api/oracle/assertions?${params.toString()}`,
        );
        const result = await response.json();
        data = result.items || [];
        break;
      }
      case "disputes": {
        const params = new URLSearchParams();
        if (instanceId) params.set("instanceId", instanceId);
        if (status) params.set("status", status);
        if (chain) params.set("chain", chain);
        params.set("limit", String(limit));

        const response = await fetch(
          `${process.env.INSIGHT_BASE_URL || "http://localhost:3000"}/api/oracle/disputes?${params.toString()}`,
        );
        const result = await response.json();
        data = result.items || [];
        break;
      }
      case "alerts": {
        const params = new URLSearchParams();
        if (instanceId) params.set("instanceId", instanceId);
        if (status) params.set("status", status);
        params.set("limit", String(limit));

        const response = await fetch(
          `${process.env.INSIGHT_BASE_URL || "http://localhost:3000"}/api/oracle/alerts?${params.toString()}`,
        );
        const result = await response.json();
        data = result.items || [];
        break;
      }
      default:
        return { error: "invalid_type" };
    }

    const filename = generateExportFilename(type, format);

    return {
      ok: true,
      data,
      filename,
      format,
    };
  });
}