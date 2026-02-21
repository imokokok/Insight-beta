import { NextResponse } from 'next/server';

const generateMockDeviationData = (timeRange: string) => {
  const now = Date.now();

  const feeds = [
    { name: 'ETH/USD', pair: 'ETH/USD', deviation: '0.5%', chain: 'ethereum' },
    { name: 'BTC/USD', pair: 'BTC/USD', deviation: '0.5%', chain: 'ethereum' },
    { name: 'LINK/USD', pair: 'LINK/USD', deviation: '0.5%', chain: 'ethereum' },
    { name: 'USDC/USD', pair: 'USDC/USD', deviation: '0.1%', chain: 'ethereum' },
    { name: 'USDT/USD', pair: 'USDT/USD', deviation: '0.1%', chain: 'polygon' },
    { name: 'MATIC/USD', pair: 'MATIC/USD', deviation: '0.5%', chain: 'polygon' },
    { name: 'ARB/USD', pair: 'ARB/USD', deviation: '0.5%', chain: 'arbitrum' },
    { name: 'OP/USD', pair: 'OP/USD', deviation: '0.5%', chain: 'optimism' },
    { name: 'AVAX/USD', pair: 'AVAX/USD', deviation: '0.5%', chain: 'avalanche' },
    { name: 'BNB/USD', pair: 'BNB/USD', deviation: '0.5%', chain: 'bsc' },
  ];

  const multiplier = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : 30;

  const triggers = feeds.map((feed) => {
    const baseTriggers = Math.floor(20 + Math.random() * 100);
    const triggerCount = baseTriggers * multiplier;
    const avgIntervalHours = (24 * multiplier * 60) / triggerCount;

    return {
      feedName: feed.name,
      pair: feed.pair,
      chain: feed.chain,
      deviationThreshold: feed.deviation,
      triggerCount,
      updateFrequency: Math.floor((triggerCount / (24 * multiplier)) * 60),
      avgUpdateInterval: Number(avgIntervalHours.toFixed(2)),
      lastTriggeredAt: new Date(now - Math.random() * 24 * 60 * 60 * 1000).toISOString(),
    };
  });

  const totalTriggers = triggers.reduce((sum, t) => sum + t.triggerCount, 0);

  const mostActiveFeeds = [...triggers].sort((a, b) => b.triggerCount - a.triggerCount).slice(0, 5);

  return {
    timeRange,
    triggers,
    totalTriggers,
    mostActiveFeeds,
    generatedAt: new Date().toISOString(),
  };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timeRange = searchParams.get('timeRange') || '24h';

  const validTimeRanges = ['24h', '7d', '30d'];
  const selectedTimeRange = validTimeRanges.includes(timeRange) ? timeRange : '24h';

  const data = generateMockDeviationData(selectedTimeRange);

  return NextResponse.json(data);
}
