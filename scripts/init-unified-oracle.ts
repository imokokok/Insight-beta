/**
 * Initialize Unified Oracle Platform
 *
 * 初始化通用预言机平台
 * - 创建示例实例配置
 * - 启动同步服务
 */

import { unifiedOracleService } from '@/server/oracle/unifiedService';
import { query } from '@/server/db';
import { logger } from '@/lib/logger';

// ============================================================================
// 初始化配置
// ============================================================================

const INIT_CONFIG = {
  // 是否创建示例实例
  createSampleInstances: true,

  // 示例 RPC URLs（需要替换为实际的）
  sampleRpcUrls: {
    ethereum: process.env.ETHEREUM_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/demo',
    polygon: process.env.POLYGON_RPC_URL || 'https://polygon-mainnet.g.alchemy.com/v2/demo',
    arbitrum: process.env.ARBITRUM_RPC_URL || 'https://arb-mainnet.g.alchemy.com/v2/demo',
  },
};

// ============================================================================
// 初始化函数
// ============================================================================

async function initializeUnifiedOracle() {
  logger.info('Initializing Unified Oracle Platform...');

  try {
    // 1. 创建示例实例
    if (INIT_CONFIG.createSampleInstances) {
      await createSampleInstances();
    }

    // 2. 启动统一服务
    await unifiedOracleService.start();

    logger.info('Unified Oracle Platform initialized successfully');
    logger.info('Dashboard available at: http://localhost:3000/oracle/dashboard');

    // 3. 保持进程运行
    process.on('SIGINT', async () => {
      logger.info('Shutting down...');
      await unifiedOracleService.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      logger.info('Shutting down...');
      await unifiedOracleService.stop();
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to initialize unified oracle', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

async function createSampleInstances() {
  logger.info('Creating sample oracle instances...');

  // Chainlink 示例实例
  await createInstance({
    id: 'chainlink-eth-mainnet',
    name: 'Chainlink Ethereum Mainnet',
    protocol: 'chainlink',
    chain: 'ethereum',
    config: {
      rpcUrl: INIT_CONFIG.sampleRpcUrls.ethereum,
      syncIntervalMs: 60000,
    },
    protocolConfig: {
      dataFeedAddress: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419', // ETH/USD
      heartbeat: 3600,
      deviationThreshold: 0.5,
    },
  });

  // Pyth 示例实例
  await createInstance({
    id: 'pyth-eth-mainnet',
    name: 'Pyth Ethereum Mainnet',
    protocol: 'pyth',
    chain: 'ethereum',
    config: {
      rpcUrl: INIT_CONFIG.sampleRpcUrls.ethereum,
      syncIntervalMs: 30000,
    },
    protocolConfig: {
      pythContractAddress: '0x4305FB66699C3B2702D4d05CF36551390A4c69C6',
      priceFeedIds: [
        '0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace', // ETH/USD
      ],
    },
  });

  // Chainlink Polygon 实例
  await createInstance({
    id: 'chainlink-polygon-mainnet',
    name: 'Chainlink Polygon Mainnet',
    protocol: 'chainlink',
    chain: 'polygon',
    config: {
      rpcUrl: INIT_CONFIG.sampleRpcUrls.polygon,
      syncIntervalMs: 60000,
    },
    protocolConfig: {
      dataFeedAddress: '0xF9680D99D6C9589e2a93a78A04A279e509205945', // ETH/USD
    },
  });

  logger.info('Sample instances created');
}

async function createInstance({
  id,
  name,
  protocol,
  chain,
  config,
  protocolConfig,
}: {
  id: string;
  name: string;
  protocol: string;
  chain: string;
  config: Record<string, unknown>;
  protocolConfig: Record<string, unknown>;
}) {
  try {
    await query(
      `INSERT INTO unified_oracle_instances (
        id, name, protocol, chain, enabled, config, protocol_config
      ) VALUES ($1, $2, $3, $4, true, $5, $6)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        config = EXCLUDED.config,
        protocol_config = EXCLUDED.protocol_config,
        updated_at = NOW()`,
      [id, name, protocol, chain, JSON.stringify(config), JSON.stringify(protocolConfig)],
    );

    logger.info(`Created/updated instance: ${id}`);
  } catch (error) {
    logger.error(`Failed to create instance ${id}`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// 运行初始化
// ============================================================================

initializeUnifiedOracle();
