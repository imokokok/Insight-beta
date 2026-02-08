/**
 * OpenTelemetry 初始化 - 客户端
 *
 * 提供浏览器端的分布式追踪和监控功能
 */

import { logger } from '@/lib/logger';

let provider: unknown = null;

export async function initOpenTelemetry() {
  if (provider) {
    return;
  }

  try {
    const [{ WebTracerProvider }, { OTLPTraceExporter }, { BatchSpanProcessor }, resources] =
      await Promise.all([
        import('@opentelemetry/sdk-trace-web'),
        import('@opentelemetry/exporter-trace-otlp-http'),
        import('@opentelemetry/sdk-trace-base'),
        import('@opentelemetry/resources'),
        import('@opentelemetry/semantic-conventions'),
      ]);

    const serviceName = 'oracle-monitor-web';
    const serviceVersion = process.env.npm_package_version || '0.1.0';

    const { resourceFromAttributes } = resources;

    const resource = resourceFromAttributes({
      'service.name': serviceName,
      'service.version': serviceVersion,
      'deployment.environment': process.env.NODE_ENV,
    });

    provider = new WebTracerProvider({
      resource,
    });

    const exporter = new OTLPTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || '/api/traces',
    });

    (provider as { addSpanProcessor: (processor: unknown) => void }).addSpanProcessor(
      new BatchSpanProcessor(exporter),
    );
    (provider as { register: () => void }).register();

    logger.info('OpenTelemetry client initialized', { service: serviceName });
  } catch (error) {
    logger.error('Failed to initialize OpenTelemetry client', { error });
  }
}

export default initOpenTelemetry;
