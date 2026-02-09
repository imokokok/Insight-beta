/**
 * Orchestrator Service Entry Point
 * 服务编排器入口
 */

import { OrchestratorService } from './OrchestratorService';

import type {
  ServiceInstance,
  ServiceHealth,
  ServiceMetrics,
  ServiceConfig,
  AggregatedPrice,
  PriceSource,
  OrchestratorConfig,
  AlertRule,
  AlertCondition,
  SystemStatus,
} from './types';

// Export main class
export { OrchestratorService };

// Export types
export type {
  ServiceInstance,
  ServiceHealth,
  ServiceMetrics,
  ServiceConfig,
  AggregatedPrice,
  PriceSource,
  OrchestratorConfig,
  AlertRule,
  AlertCondition,
  SystemStatus,
};

// Export sub-modules
export { ServiceRegistry } from './ServiceRegistry';
export { PriceAggregator } from './PriceAggregator';

// Default export
export default OrchestratorService;

// Start orchestrator if run directly
if (require.main === module) {
  const orchestrator = new OrchestratorService({
    redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
    httpPort: parseInt(process.env.HTTP_PORT || '8080', 10),
    healthCheckIntervalMs: 30000,
    aggregationEnabled: true,
    maxPriceAgeMs: 300000,
    deviationThreshold: 0.05,
  });

  orchestrator.initialize().then(() => {
    orchestrator.start();
  });

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down...');
    await orchestrator.stop();
    process.exit(0);
  });

  process.on('SIGINT', async () => {
    console.log('SIGINT received, shutting down...');
    await orchestrator.stop();
    process.exit(0);
  });
}
