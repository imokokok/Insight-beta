import { createLogger } from '@oracle-monitor/shared';

import { API3SyncService } from './API3SyncService';

const logger = createLogger({ serviceName: 'api3-service-main' });

async function main() {
  const service = new API3SyncService();

  // Get configuration from environment
  const config = {
    instanceId: process.env.INSTANCE_ID || 'api3-default',
    protocol: 'api3' as const,
    chain: process.env.CHAIN || 'ethereum',
    rpcUrl: process.env.RPC_URL || 'https://eth.llamarpc.com',
    intervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '60000', 10),
    symbols: (process.env.SYMBOLS || 'ETH/USD,BTC/USD,USDC/USD').split(','),
    customConfig: process.env.CUSTOM_CONFIG ? JSON.parse(process.env.CUSTOM_CONFIG) : {},
  };

  try {
    await service.initialize(config);
    await service.start();

    logger.info('API3 service started successfully');

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
