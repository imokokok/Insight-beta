/**
 * OpenTelemetry 初始化 - 服务端
 *
 * 提供分布式追踪和监控功能
 */

import { env } from '@/lib/config/env';
import { logger } from '@/lib/logger';

let sdk: unknown = null;

export async function initOpenTelemetry() {
  if (sdk) {
    return;
  }

  try {
    const [{ NodeSDK }, { OTLPTraceExporter }, { getNodeAutoInstrumentations }, resources] =
      await Promise.all([
        import('@opentelemetry/sdk-node'),
        import('@opentelemetry/exporter-trace-otlp-http'),
        import('@opentelemetry/auto-instrumentations-node'),
        import('@opentelemetry/resources'),
        import('@opentelemetry/semantic-conventions'),
      ]);

    const serviceName = 'oracle-monitor';
    const serviceVersion = process.env.npm_package_version || '0.1.0';

    const { resourceFromAttributes } = resources;

    const resource = resourceFromAttributes({
      'service.name': serviceName,
      'service.version': serviceVersion,
      'deployment.environment': env.NODE_ENV,
    });

    sdk = new NodeSDK({
      resource,
      traceExporter: new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
      }),
      instrumentations: [
        getNodeAutoInstrumentations({
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
        }),
      ],
    });

    (sdk as { start: () => void }).start();
    logger.info('OpenTelemetry initialized', { service: serviceName });

    // 优雅关闭
    process.on('SIGTERM', () => {
      shutdownOpenTelemetry();
    });

    process.on('SIGINT', () => {
      shutdownOpenTelemetry();
    });
  } catch (error) {
    logger.error('Failed to initialize OpenTelemetry', { error });
  }
}

export async function shutdownOpenTelemetry() {
  if (sdk) {
    try {
      await (sdk as { shutdown: () => Promise<void> }).shutdown();
      logger.info('OpenTelemetry shutdown complete');
    } catch (error) {
      logger.error('OpenTelemetry shutdown error', { error });
    } finally {
      sdk = null;
    }
  }
}

export default initOpenTelemetry;
