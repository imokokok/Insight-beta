import { NextRequest } from "next/server";
import { handleApi } from "@/server/apiResponse";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return handleApi(request, async () => {
    const { html } = await request.json();

    if (!html) {
      return { error: "missing_html" };
    }

    try {
      const puppeteer = await import("puppeteer");
      const browser = await puppeteer.default.launch({
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      });

      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: "networkidle0" });

      const pdfBuffer = await page.pdf({
        format: "A4",
        printBackground: true,
        margin: {
          top: "2cm",
          right: "2cm",
          bottom: "2cm",
          left: "2cm",
        },
      });

      await browser.close();

      logger.info("PDF generated successfully", {
        size: pdfBuffer.length,
      });

      return new Response(pdfBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="report-${Date.now()}.pdf"`,
          "Content-Length": String(pdfBuffer.length),
        },
      });
    } catch (error) {
      logger.error("Failed to generate PDF", { error });
      return { error: "pdf_generation_failed" };
    }
  });
}