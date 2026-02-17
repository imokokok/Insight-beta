import type { NextRequest } from 'next/server';

import { ok } from '@/lib/api/apiResponse';

interface SearchResult {
  id: string;
  type: 'feed' | 'protocol' | 'address' | 'chain';
  title: string;
  subtitle: string;
  url: string;
}

const mockFeeds = [
  { id: 'btc-usd', symbol: 'BTC/USD', name: 'Bitcoin' },
  { id: 'eth-usd', symbol: 'ETH/USD', name: 'Ethereum' },
  { id: 'sol-usd', symbol: 'SOL/USD', name: 'Solana' },
  { id: 'arb-usd', symbol: 'ARB/USD', name: 'Arbitrum' },
  { id: 'link-usd', symbol: 'LINK/USD', name: 'Chainlink' },
  { id: 'avax-usd', symbol: 'AVAX/USD', name: 'Avalanche' },
  { id: 'matic-usd', symbol: 'MATIC/USD', name: 'Polygon' },
  { id: 'dot-usd', symbol: 'DOT/USD', name: 'Polkadot' },
  { id: 'uni-usd', symbol: 'UNI/USD', name: 'Uniswap' },
  { id: 'aave-usd', symbol: 'AAVE/USD', name: 'Aave' },
];

const mockProtocols = [
  { id: 'chainlink', name: 'Chainlink', description: '去中心化预言机网络' },
  { id: 'pyth', name: 'Pyth Network', description: '高频金融数据预言机' },
  { id: 'redstone', name: 'Redstone', description: '模块化预言机解决方案' },
];

const mockChains = [
  { id: 'ethereum', name: 'Ethereum', description: '主网' },
  { id: 'arbitrum', name: 'Arbitrum', description: 'Layer 2' },
  { id: 'optimism', name: 'Optimism', description: 'Layer 2' },
  { id: 'polygon', name: 'Polygon', description: '侧链' },
  { id: 'avalanche', name: 'Avalanche', description: '主网' },
];

const mockAddresses = [
  {
    id: '0x5f4ec3df9cbd43714fe2740f5e3616155c5b8419',
    label: 'Chainlink ETH/USD',
    protocol: 'chainlink',
  },
  {
    id: '0xf4030086522a5beea4988f8ca5b36dbc97bee88c',
    label: 'Chainlink BTC/USD',
    protocol: 'chainlink',
  },
];

function searchFeeds(query: string): SearchResult[] {
  const lowerQuery = query.toLowerCase();
  return mockFeeds
    .filter(
      (feed) =>
        feed.symbol.toLowerCase().includes(lowerQuery) ||
        feed.name.toLowerCase().includes(lowerQuery),
    )
    .slice(0, 5)
    .map((feed) => ({
      id: feed.id,
      type: 'feed' as const,
      title: feed.symbol,
      subtitle: feed.name,
      url: `/feeds/${feed.id}`,
    }));
}

function searchProtocols(query: string): SearchResult[] {
  const lowerQuery = query.toLowerCase();
  return mockProtocols
    .filter(
      (protocol) =>
        protocol.name.toLowerCase().includes(lowerQuery) ||
        protocol.description.toLowerCase().includes(lowerQuery),
    )
    .slice(0, 3)
    .map((protocol) => ({
      id: protocol.id,
      type: 'protocol' as const,
      title: protocol.name,
      subtitle: protocol.description,
      url: `/protocols/${protocol.id}`,
    }));
}

function searchChains(query: string): SearchResult[] {
  const lowerQuery = query.toLowerCase();
  return mockChains
    .filter(
      (chain) =>
        chain.name.toLowerCase().includes(lowerQuery) ||
        chain.description.toLowerCase().includes(lowerQuery),
    )
    .slice(0, 3)
    .map((chain) => ({
      id: chain.id,
      type: 'chain' as const,
      title: chain.name,
      subtitle: chain.description,
      url: `/chains/${chain.id}`,
    }));
}

function searchAddresses(query: string): SearchResult[] {
  const lowerQuery = query.toLowerCase();
  return mockAddresses
    .filter(
      (addr) =>
        addr.id.toLowerCase().includes(lowerQuery) ||
        addr.label.toLowerCase().includes(lowerQuery),
    )
    .slice(0, 3)
    .map((addr) => ({
      id: addr.id,
      type: 'address' as const,
      title: addr.label,
      subtitle: `${addr.id.slice(0, 10)}...${addr.id.slice(-8)}`,
      url: `/addresses/${addr.id}`,
    }));
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query.trim()) {
    return ok([], { total: 0 });
  }

  const results: SearchResult[] = [
    ...searchFeeds(query),
    ...searchProtocols(query),
    ...searchChains(query),
    ...searchAddresses(query),
  ];

  return ok(results, {
    total: results.length,
  });
}
