import { PythSyncService } from './PythSyncService';
import { createLogger } from '@oracle-monitor/shared';

const logger = createLogger({ serviceName: 'pyth-service-main' });

async function main() {
  const service = new PythSyncService();

  // Get configuration from environment
  const config = {
    instanceId: process.env.INSTANCE_ID || 'pyth-solana-mainnet',
    protocol: 'pyth' as const,
    chain: process.env.CHAIN || 'solana',
    rpcUrl: process.env.RPC_URL || 'https://api.mainnet-beta.solana.com',
    intervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '30000', 10),
    symbols: (process.env.SYMBOLS || 'BTC/USD,ETH/USD,SOL/USD,AVAX/USD,ARB/USD').split(','),
    customConfig: process.env.CUSTOM_CONFIG
      ? JSON.parse(process.env.CUSTOM_CONFIG)
      : {
          cluster: 'mainnet-beta',
        },
  };

  try {
    await service.initialize(config);
    await service.start();

    logger.info('Pyth service started successfully');

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
