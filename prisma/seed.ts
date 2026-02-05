/**
 * Database Seed Script
 *
 * 数据库种子数据
 * - 初始化价格喂价数据
 * - 创建示例 Solana 数据
 * - 添加测试告警规则
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // ============================================================================
  // 1. Seed Solana Oracle Instances
  // ============================================================================
  console.log('📦 Seeding Solana oracle instances...');

  const solanaInstances = await Promise.all([
    prisma.solanaOracleInstance.upsert({
      where: { id: 'pyth-mainnet' },
      update: {},
      create: {
        id: 'pyth-mainnet',
        name: 'Pyth Network Mainnet',
        programId: 'FsJ3A3u2vn5cTVofAjvy6y5kwABJAqYWpe4975bi2epH',
        cluster: 'mainnet-beta',
        rpcUrl: 'https://api.mainnet-beta.solana.com',
        isActive: true,
      },
    }),
    prisma.solanaOracleInstance.upsert({
      where: { id: 'switchboard-mainnet' },
      update: {},
      create: {
        id: 'switchboard-mainnet',
        name: 'Switchboard Mainnet',
        programId: 'SW1TCH7qEPTdLsDHRgPuMqjb5KtSkJTNWbKLoXDzE33',
        cluster: 'mainnet-beta',
        rpcUrl: 'https://api.mainnet-beta.solana.com',
        isActive: true,
      },
    }),
    prisma.solanaOracleInstance.upsert({
      where: { id: 'pyth-devnet' },
      update: {},
      create: {
        id: 'pyth-devnet',
        name: 'Pyth Network Devnet',
        programId: 'gSbePebfvPy7tRqimPoefSgag1953iZaXdPLx3hP6Gn',
        cluster: 'devnet',
        rpcUrl: 'https://api.devnet.solana.com',
        isActive: true,
      },
    }),
  ]);

  console.log(`  ✓ Created ${solanaInstances.length} oracle instances`);

  // ============================================================================
  // 2. Seed Solana Price Feeds
  // ============================================================================
  console.log('\n📦 Seeding Solana price feeds...');

  const priceFeeds = await Promise.all([
    prisma.solanaPriceFeed.upsert({
      where: { id: 'solana-btc-usd' },
      update: {
        price: '45000.50',
        timestamp: new Date(),
      },
      create: {
        id: 'solana-btc-usd',
        symbol: 'BTC/USD',
        name: 'Bitcoin USD',
        price: '45000.50',
        confidence: '0.99',
        timestamp: new Date(),
        slot: 250000000n,
        signature: '5xgK...xyz',
        source: 'pyth',
        status: 'active',
      },
    }),
    prisma.solanaPriceFeed.upsert({
      where: { id: 'solana-eth-usd' },
      update: {
        price: '3200.75',
        timestamp: new Date(),
      },
      create: {
        id: 'solana-eth-usd',
        symbol: 'ETH/USD',
        name: 'Ethereum USD',
        price: '3200.75',
        confidence: '0.98',
        timestamp: new Date(),
        slot: 250000001n,
        signature: '7abc...def',
        source: 'pyth',
        status: 'active',
      },
    }),
    prisma.solanaPriceFeed.upsert({
      where: { id: 'solana-sol-usd' },
      update: {
        price: '98.25',
        timestamp: new Date(),
      },
      create: {
        id: 'solana-sol-usd',
        symbol: 'SOL/USD',
        name: 'Solana USD',
        price: '98.25',
        confidence: '0.97',
        timestamp: new Date(),
        slot: 250000002n,
        signature: '9ghi...jkl',
        source: 'switchboard',
        status: 'active',
      },
    }),
  ]);

  console.log(`  ✓ Created ${priceFeeds.length} price feeds`);

  // ============================================================================
  // 3. Seed Price History
  // ============================================================================
  console.log('\n📦 Seeding price history...');

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Create sample price history for BTC/USD
  const btcHistory = [];
  for (let i = 0; i < 24; i++) {
    const timestamp = new Date(oneDayAgo.getTime() + i * 60 * 60 * 1000);
    const basePrice = 45000;
    const variation = (Math.random() - 0.5) * 1000;
    const price = basePrice + variation;

    btcHistory.push({
      symbol: 'BTC/USD',
      protocol: 'chainlink',
      chain: 'ethereum',
      price: price.toFixed(2),
      priceRaw: (price * 1e8).toFixed(0),
      decimals: 8,
      timestamp,
      blockNumber: 18000000 + i * 100,
      confidence: '0.99',
      volume24h: (Math.random() * 1000000000).toFixed(2),
      change24h: ((Math.random() - 0.5) * 10).toFixed(4),
    });
  }

  // Insert price history
  for (const record of btcHistory) {
    await prisma.priceHistoryRaw.create({ data: record as any });
  }

  console.log(`  ✓ Created ${btcHistory.length} price history records`);

  // ============================================================================
  // 4. Seed Alerts
  // ============================================================================
  console.log('\n📦 Seeding alerts...');

  const alerts = await Promise.all([
    prisma.solanaAlert.create({
      data: {
        type: 'price_deviation',
        severity: 'warning',
        symbol: 'BTC/USD',
        message: 'Price deviation detected between Pyth and Chainlink',
        details: {
          pythPrice: '45000.50',
          chainlinkPrice: '44950.00',
          deviation: '0.11%',
        },
        status: 'active',
      },
    }),
    prisma.solanaAlert.create({
      data: {
        type: 'stale_price',
        severity: 'info',
        symbol: 'ETH/USD',
        message: 'Price update delayed by more than 5 minutes',
        details: {
          lastUpdate: new Date(Date.now() - 6 * 60 * 1000).toISOString(),
          expectedInterval: '300000',
        },
        status: 'active',
      },
    }),
  ]);

  console.log(`  ✓ Created ${alerts.length} alerts`);

  // ============================================================================
  // 5. Seed Sync Status
  // ============================================================================
  console.log('\n📦 Seeding sync status...');

  const syncStatuses = await Promise.all([
    prisma.solanaSyncStatus.upsert({
      where: {
        instanceId_feedSymbol: {
          instanceId: 'pyth-mainnet',
          feedSymbol: 'BTC/USD',
        },
      },
      update: {
        lastSlot: 250000000n,
        lastTimestamp: new Date(),
      },
      create: {
        id: 'sync-btc-pyth',
        instanceId: 'pyth-mainnet',
        feedSymbol: 'BTC/USD',
        lastSlot: 250000000n,
        lastSignature: '5xgK...xyz',
        lastTimestamp: new Date(),
      },
    }),
    prisma.solanaSyncStatus.upsert({
      where: {
        instanceId_feedSymbol: {
          instanceId: 'switchboard-mainnet',
          feedSymbol: 'SOL/USD',
        },
      },
      update: {
        lastSlot: 250000002n,
        lastTimestamp: new Date(),
      },
      create: {
        id: 'sync-sol-switchboard',
        instanceId: 'switchboard-mainnet',
        feedSymbol: 'SOL/USD',
        lastSlot: 250000002n,
        lastSignature: '9ghi...jkl',
        lastTimestamp: new Date(),
      },
    }),
  ]);

  console.log(`  ✓ Created ${syncStatuses.length} sync statuses`);

  console.log('\n✅ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
