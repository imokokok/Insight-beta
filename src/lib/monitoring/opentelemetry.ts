import * as opentelemetry from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { logger } from '@/lib/logger';

// Initialize OpenTelemetry SDK
const initOpenTelemetry = () => {
  const serviceName = process.env.OTEL_SERVICE_NAME || 'insight-oracle';
  const exporterEndpoint =
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces';

  // Only initialize if OpenTelemetry is enabled
  if (process.env.OTEL_ENABLED !== 'true') {
    logger.debug('OpenTelemetry disabled');
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
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => logger.info('OpenTelemetry SDK shutdown complete'))
      .catch((error) => logger.error('OpenTelemetry SDK shutdown failed', { error }))
      .finally(() => process.exit(0));
  });

  logger.info('OpenTelemetry SDK initialized');
};

export default initOpenTelemetry;
