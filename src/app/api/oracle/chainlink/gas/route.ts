import { NextResponse } from 'next/server';

const generateMockGasData = (timeRange: string) => {
  const now = Date.now();
  const points =
    timeRange === '1h' ? 60 : timeRange === '24h' ? 96 : timeRange === '7d' ? 168 : 720;
  const interval =
    timeRange === '1h'
      ? 60000
      : timeRange === '24h'
        ? 900000
        : timeRange === '7d'
          ? 600000
          : 3600000;

  const chains = ['ethereum', 'polygon', 'arbitrum', 'optimism', 'avalanche', 'bsc'];
  const feeds = [
    { name: 'ETH/USD', chain: 'ethereum' },
    { name: 'BTC/USD', chain: 'ethereum' },
    { name: 'LINK/USD', chain: 'ethereum' },
    { name: 'USDC/USD', chain: 'ethereum' },
    { name: 'USDT/USD', chain: 'polygon' },
    { name: 'MATIC/USD', chain: 'polygon' },
    { name: 'ARB/USD', chain: 'arbitrum' },
    { name: 'OP/USD', chain: 'optimism' },
    { name: 'AVAX/USD', chain: 'avalanche' },
    { name: 'BNB/USD', chain: 'bsc' },
  ];

  const ethPrice = 2500;

  const trend = Array.from({ length: points }, (_, i) => {
    const gasUsed = 150000 + Math.random() * 350000;
    const costEth = gasUsed * 30e-9;
    return {
      timestamp: new Date(now - (points - 1 - i) * interval).toISOString(),
      gasUsed: Math.floor(gasUsed),
      costEth: Number(costEth.toFixed(8)),
      costUsd: Number((costEth * ethPrice).toFixed(2)),
      transactionCount: Math.floor(10 + Math.random() * 30),
    };
  });

  const byFeed = feeds.map((feed) => ({
    feedName: feed.name,
    chain: feed.chain,
    totalGasUsed: Math.floor(500000 + Math.random() * 5000000),
    totalCostEth: Number(((500000 + Math.random() * 5000000) * 30e-9).toFixed(8)),
    totalCostUsd: Number(((500000 + Math.random() * 5000000) * 30e-9 * ethPrice).toFixed(2)),
    transactionCount: Math.floor(50 + Math.random() * 200),
    avgGasPerTransaction: Math.floor(30000 + Math.random() * 70000),
  }));

  const byChain = chains.map((chain) => {
    const chainFeeds = byFeed.filter((f) => f.chain === chain);
    return {
      chain,
      totalGasUsed: chainFeeds.reduce((sum, f) => sum + f.totalGasUsed, 0),
      totalCostEth: Number(chainFeeds.reduce((sum, f) => sum + f.totalCostEth, 0).toFixed(8)),
      totalCostUsd: Number(chainFeeds.reduce((sum, f) => sum + f.totalCostUsd, 0).toFixed(2)),
      transactionCount: chainFeeds.reduce((sum, f) => sum + f.transactionCount, 0),
      feedCount: chainFeeds.length,
    };
  });

  const totalGasUsed = byFeed.reduce((sum, f) => sum + f.totalGasUsed, 0);
  const totalCostEth = byFeed.reduce((sum, f) => sum + f.totalCostEth, 0);
  const totalCostUsd = byFeed.reduce((sum, f) => sum + f.totalCostUsd, 0);
  const totalTransactions = byFeed.reduce((sum, f) => sum + f.transactionCount, 0);

  return {
    timeRange,
    byFeed,
    byChain: byChain.filter((c) => c.feedCount > 0),
    trend,
    totalGasUsed,
    totalCostEth,
    totalCostUsd,
    totalTransactions,
    generatedAt: new Date().toISOString(),
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('timeRange') || '24h';

  const validTimeRanges = ['1h', '24h', '7d', '30d'];
  const selectedTimeRange = validTimeRanges.includes(timeRange) ? timeRange : '24h';

  const data = generateMockGasData(selectedTimeRange);

  return NextResponse.json(data);
}
