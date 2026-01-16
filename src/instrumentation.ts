import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Initialize OpenTelemetry if enabled
    await import("./lib/opentelemetry")
      .then(({ default: initOpenTelemetry }) => {
        initOpenTelemetry();
      })
      .catch((error) => {
        logger.error("Failed to initialize OpenTelemetry", { error });
      });

    const disabled = ["1", "true"].includes(
      env.INSIGHT_DISABLE_EMBEDDED_WORKER.toLowerCase(),
    );
    if (!disabled) {
      await import("./server/worker");
    }
  }
}
