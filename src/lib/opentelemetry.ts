import * as opentelemetry from "@opentelemetry/sdk-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";

// Initialize OpenTelemetry SDK
const initOpenTelemetry = () => {
  const serviceName = process.env.OTEL_SERVICE_NAME || "insight-oracle";
  const exporterEndpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT ||
    "http://localhost:4318/v1/traces";

  // Only initialize if OpenTelemetry is enabled
  if (process.env.OTEL_ENABLED !== "true") {
    console.log(
      "OpenTelemetry is not enabled. Set OTEL_ENABLED=true to enable.",
    );
    return;
  }

  const traceExporter = new OTLPTraceExporter({
    url: exporterEndpoint,
  });

  const sdk = new opentelemetry.NodeSDK({
    serviceName,
    traceExporter,
    instrumentations: [getNodeAutoInstrumentations()],
  });

  // Initialize the SDK and register with the OpenTelemetry API
  // this enables the API to record telemetry
  sdk.start();

  // Gracefully shut down the SDK on process exit
  process.on("SIGTERM", () => {
    sdk
      .shutdown()
      .then(() => console.log("OpenTelemetry SDK shut down successfully"))
      .catch((error) =>
        console.error("Error shutting down OpenTelemetry SDK", error),
      )
      .finally(() => process.exit(0));
  });

  console.log("OpenTelemetry SDK initialized successfully");
};

export default initOpenTelemetry;
