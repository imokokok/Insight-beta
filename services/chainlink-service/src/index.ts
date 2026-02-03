import { ChainlinkSyncService } from './ChainlinkSyncService';
import { createLogger } from '@oracle-monitor/shared';

const logger = createLogger({ serviceName: 'chainlink-service-main' });

async function main() {
  const service = new ChainlinkSyncService();

  // Get configuration from environment
  const config = {
    instanceId: process.env.INSTANCE_ID || 'chainlink-default',
    protocol: 'chainlink' as const,
    chain: process.env.CHAIN || 'ethereum',
    rpcUrl: process.env.RPC_URL || 'https://eth.llamarpc.com',
    intervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '60000', 10),
    symbols: (process.env.SYMBOLS || 'ETH/USD,BTC/USD,LINK/USD').split(','),
    customConfig: process.env.CUSTOM_CONFIG ? JSON.parse(process.env.CUSTOM_CONFIG) : {},
  };

  try {
    await service.initialize(config);
    await service.start();

    logger.info('Chainlink service started successfully');

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
