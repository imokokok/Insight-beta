import { NextResponse } from 'next/server';

const generateMockHeartbeatData = () => {
  const now = Date.now();

  const feeds = [
    { name: 'ETH/USD', pair: 'ETH/USD', heartbeat: 60, chain: 'ethereum' },
    { name: 'BTC/USD', pair: 'BTC/USD', heartbeat: 60, chain: 'ethereum' },
    { name: 'LINK/USD', pair: 'LINK/USD', heartbeat: 60, chain: 'ethereum' },
    { name: 'USDC/USD', pair: 'USDC/USD', heartbeat: 60, chain: 'ethereum' },
    { name: 'USDT/USD', pair: 'USDT/USD', heartbeat: 60, chain: 'ethereum' },
    { name: 'MATIC/USD', pair: 'MATIC/USD', heartbeat: 60, chain: 'polygon' },
    { name: 'ARB/USD', pair: 'ARB/USD', heartbeat: 60, chain: 'arbitrum' },
    { name: 'OP/USD', pair: 'OP/USD', heartbeat: 60, chain: 'optimism' },
    { name: 'AVAX/USD', pair: 'AVAX/USD', heartbeat: 60, chain: 'avalanche' },
    { name: 'BNB/USD', pair: 'BNB/USD', heartbeat: 60, chain: 'bsc' },
    { name: 'SOL/USD', pair: 'SOL/USD', heartbeat: 60, chain: 'solana' },
    { name: 'DOGE/USD', pair: 'DOGE/USD', heartbeat: 60, chain: 'ethereum' },
  ];

  const alerts = feeds.map((feed) => {
    const lastUpdateOffset = Math.random() * 360;
    const lastUpdateTime = new Date(now - lastUpdateOffset * 1000);
    const timeoutDuration = feed.heartbeat * 2;
    const isTimeout = lastUpdateOffset > timeoutDuration;
    const isCritical = lastUpdateOffset > timeoutDuration * 2;

    let status: 'active' | 'timeout' | 'critical' = 'active';
    if (isCritical) status = 'critical';
    else if (isTimeout) status = 'timeout';

    return {
      feedName: feed.name,
      pair: feed.pair,
      aggregatorAddress: `0x${Math.random().toString(16).slice(2, 42)}`,
      heartbeat: feed.heartbeat,
      lastUpdate: lastUpdateTime.toISOString(),
      timeoutDuration,
      status,
      chain: feed.chain,
    };
  });

  const activeFeeds = alerts.filter((a) => a.status === 'active').length;
  const timeoutFeeds = alerts.filter((a) => a.status === 'timeout').length;
  const criticalFeeds = alerts.filter((a) => a.status === 'critical').length;

  return {
    totalFeeds: feeds.length,
    activeFeeds,
    timeoutFeeds,
    criticalFeeds,
    alerts: alerts.sort((a, b) => {
      const statusOrder = { critical: 0, timeout: 1, active: 2 };
      return statusOrder[a.status] - statusOrder[b.status];
    }),
    generatedAt: new Date().toISOString(),
  };
};

export async function GET() {
  const data = generateMockHeartbeatData();

  return NextResponse.json(data);
}
