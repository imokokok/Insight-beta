import { createLogger } from '@oracle-monitor/shared';

import { BandSyncService } from './BandSyncService';

const logger = createLogger({ serviceName: 'band-service-main' });

async function main() {
  const service = new BandSyncService();

  // Get configuration from environment
  const config = {
    instanceId: process.env.INSTANCE_ID || 'band-default',
    protocol: 'band' as const,
    chain: process.env.CHAIN || 'ethereum',
    rpcUrl: process.env.RPC_URL || 'https://eth.llamarpc.com',
    intervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '60000', 10),
    symbols: (process.env.SYMBOLS || 'BTC/USD,ETH/USD,LINK/USD').split(','),
    customConfig: process.env.CUSTOM_CONFIG ? JSON.parse(process.env.CUSTOM_CONFIG) : {},
  };

  try {
    await service.initialize(config);
    await service.start();

    logger.info('Band service started successfully', {
      httpPort: process.env.HTTP_PORT || 3000,
      healthEndpoint: `http://localhost:${process.env.HTTP_PORT || 3000}/health`,
      metricsEndpoint: `http://localhost:${process.env.HTTP_PORT || 3000}/metrics`,
    });

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM received, shutting down gracefully');
      await service.stop();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received, shutting down gracefully');
      await service.stop();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start service', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

main();
