import type { NextRequest } from 'next/server';

import { ok } from '@/lib/api/apiResponse';
import { withCacheHeaders, CACHE_PRESETS } from '@/lib/api/cache';

interface TrendingPair {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  volume24h: number;
  updateFrequency: number;
  favoriteCount: number;
  sources: string[];
  healthStatus: 'healthy' | 'warning' | 'critical';
  lastUpdated: string;
}

const mockTrendingPairs: TrendingPair[] = [
  {
    id: 'btc-usd',
    symbol: 'BTC/USD',
    name: 'Bitcoin',
    price: 67234.56,
    change24h: 2.34,
    volume24h: 28500000000,
    updateFrequency: 1.2,
    favoriteCount: 15420,
    sources: ['chainlink', 'pyth', 'redstone'],
    healthStatus: 'healthy',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'eth-usd',
    symbol: 'ETH/USD',
    name: 'Ethereum',
    price: 3456.78,
    change24h: -1.23,
    volume24h: 15200000000,
    updateFrequency: 1.5,
    favoriteCount: 12350,
    sources: ['chainlink', 'pyth'],
    healthStatus: 'healthy',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'sol-usd',
    symbol: 'SOL/USD',
    name: 'Solana',
    price: 178.92,
    change24h: 5.67,
    volume24h: 4200000000,
    updateFrequency: 0.8,
    favoriteCount: 8920,
    sources: ['pyth', 'redstone'],
    healthStatus: 'healthy',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'arb-usd',
    symbol: 'ARB/USD',
    name: 'Arbitrum',
    price: 1.23,
    change24h: 8.45,
    volume24h: 580000000,
    updateFrequency: 2.1,
    favoriteCount: 4560,
    sources: ['chainlink'],
    healthStatus: 'warning',
    lastUpdated: new Date(Date.now() - 30000).toISOString(),
  },
  {
    id: 'link-usd',
    symbol: 'LINK/USD',
    name: 'Chainlink',
    price: 14.56,
    change24h: 3.21,
    volume24h: 420000000,
    updateFrequency: 1.8,
    favoriteCount: 6780,
    sources: ['chainlink', 'redstone'],
    healthStatus: 'healthy',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'avax-usd',
    symbol: 'AVAX/USD',
    name: 'Avalanche',
    price: 38.45,
    change24h: -2.56,
    volume24h: 890000000,
    updateFrequency: 1.4,
    favoriteCount: 5230,
    sources: ['chainlink', 'pyth'],
    healthStatus: 'healthy',
    lastUpdated: new Date().toISOString(),
  },
  {
    id: 'matic-usd',
    symbol: 'MATIC/USD',
    name: 'Polygon',
    price: 0.89,
    change24h: 1.12,
    volume24h: 320000000,
    updateFrequency: 2.3,
    favoriteCount: 4120,
    sources: ['chainlink'],
    healthStatus: 'critical',
    lastUpdated: new Date(Date.now() - 120000).toISOString(),
  },
  {
    id: 'dot-usd',
    symbol: 'DOT/USD',
    name: 'Polkadot',
    price: 7.82,
    change24h: -0.45,
    volume24h: 280000000,
    updateFrequency: 1.9,
    favoriteCount: 3450,
    sources: ['chainlink', 'pyth'],
    healthStatus: 'healthy',
    lastUpdated: new Date().toISOString(),
  },
];

function sortPairs(pairs: TrendingPair[], sortBy: string): TrendingPair[] {
  const sorted = [...pairs];
  switch (sortBy) {
    case 'volume':
      return sorted.sort((a, b) => b.volume24h - a.volume24h);
    case 'volatility':
      return sorted.sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h));
    case 'updateFrequency':
      return sorted.sort((a, b) => a.updateFrequency - b.updateFrequency);
    case 'popularity':
      return sorted.sort((a, b) => b.favoriteCount - a.favoriteCount);
    default:
      return sorted;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sortBy = searchParams.get('sortBy') || 'volume';

  const validSortOptions = ['volume', 'volatility', 'updateFrequency', 'popularity'];
  const normalizedSortBy = validSortOptions.includes(sortBy) ? sortBy : 'volume';

  const sortedPairs = sortPairs(mockTrendingPairs, normalizedSortBy);

  const response = ok(sortedPairs, {
    total: sortedPairs.length,
  });
  return withCacheHeaders(response, CACHE_PRESETS.medium);
}
