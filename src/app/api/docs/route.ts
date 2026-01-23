import { NextRequest, NextResponse } from "next/server";
import { generateOracleAPIDoc } from "@/lib/apiDocGenerator";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") || "json";

  const spec = generateOracleAPIDoc();

  if (format === "html") {
    const generator = new (await import("@/lib/apiDocGenerator")).APIDocGenerator({
      title: "Insight Oracle API",
      version: "1.0.0",
      description: "API for monitoring and managing UMA Optimistic Oracle assertions, disputes, and alerts.",
      baseUrl: "/api",
    });

    const html = generator.generateHTML();
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
      },
    });
  }

  if (format === "markdown") {
    const generator = new (await import("@/lib/apiDocGenerator")).APIDocGenerator({
      title: "Insight Oracle API",
      version: "1.0.0",
      description: "API for monitoring and managing UMA Optimistic Oracle assertions, disputes, and alerts.",
      baseUrl: "/api",
    });

    const markdown = generator.generateMarkdown();
    return new NextResponse(markdown, {
      headers: {
        "Content-Type": "text/markdown; charset=utf-8",
      },
    });
  }

  return new NextResponse(JSON.stringify(spec, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}