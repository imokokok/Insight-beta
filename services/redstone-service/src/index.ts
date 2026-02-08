import { createLogger } from '@oracle-monitor/shared';

import { RedStoneSyncService } from './RedStoneSyncService';

const logger = createLogger({ serviceName: 'redstone-service-main' });

async function main() {
  const service = new RedStoneSyncService();

  // Get configuration from environment
  const config = {
    instanceId: process.env.INSTANCE_ID || 'redstone-default',
    protocol: 'redstone' as const,
    chain: process.env.CHAIN || 'ethereum',
    rpcUrl: process.env.RPC_URL || 'https://eth.llamarpc.com',
    intervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '30000', 10), // 30 seconds default
    symbols: (process.env.SYMBOLS || 'ETH/USD,BTC/USD,USDC/USD').split(','),
    customConfig: process.env.CUSTOM_CONFIG ? JSON.parse(process.env.CUSTOM_CONFIG) : {},
  };

  try {
    await service.initialize(config);
    await service.start();

    logger.info('RedStone service started successfully');

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
