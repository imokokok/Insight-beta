/**
 * API3 Cross-Chain Consistency
 * 
 * 提供跨链数据一致性对比数据
 */

import type { NextRequest } from 'next/server';

import { error, ok } from '@/lib/api/apiResponse';

interface ChainDataPoint {
  chain: string;
  value: number;
  timestamp: string;
  delay: number;
  blockNumber: number;
}

interface CrossChainConsistencyResponse {
  dapiName: string;
  data: ChainDataPoint[];
  metadata: {
    totalChains: number;
    fetchedAt: string;
  };
}

// Mock 数据生成器
function generateCrossChainData(dapiName: string): ChainDataPoint[] {
  const chains = [
    { name: 'ethereum', baseDelay: 80 },
    { name: 'polygon', baseDelay: 50 },
    { name: 'arbitrum', baseDelay: 60 },
    { name: 'optimism', baseDelay: 65 },
    { name: 'avalanche', baseDelay: 70 },
    { name: 'bsc', baseDelay: 55 },
  ];

  // 基础价格
  let basePrice = 1000;
  if (dapiName.includes('ETH')) basePrice = 3500;
  else if (dapiName.includes('BTC')) basePrice = 65000;
  else if (dapiName.includes('LINK')) basePrice = 18;

  const now = new Date();
  const timestamp = now.toISOString();

  return chains.map((chainInfo) => {
    // 每个链有小幅价格差异（模拟跨链价差）
    const priceVariation = (Math.random() - 0.5) * 0.005; // ±0.5%
    const value = basePrice * (1 + priceVariation);

    // 延迟有差异
    const delay = chainInfo.baseDelay + Math.floor(Math.random() * 50);

    // 区块号不同
    const blockNumberBase = chainInfo.name === 'ethereum' ? 19000000 : 50000000;
    const blockNumber = blockNumberBase + Math.floor(Math.random() * 10000);

    return {
      chain: chainInfo.name,
      value,
      timestamp,
      delay,
      blockNumber,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dapiName = searchParams.get('dapi');

    if (!dapiName) {
      return error(
        { code: 'MISSING_DAPI', message: 'DAPI name is required' },
        400,
      );
    }

    const data = generateCrossChainData(dapiName);

    return ok({
      dapiName,
      data,
      metadata: {
        totalChains: data.length,
        fetchedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
