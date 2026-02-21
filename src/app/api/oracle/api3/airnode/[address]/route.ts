import type { NextRequest } from 'next/server';

import { error, ok } from '@/lib/api/apiResponse';

interface DapiInfo {
  symbol: string;
  feedId: string;
  chain: string;
  contractAddress: string;
  dataFeedAddress: string | null;
  decimals: number;
  status: 'active' | 'inactive' | 'unknown';
  lastValue: string;
  lastUpdate: string;
}

interface UpdateRecord {
  id: string;
  timestamp: string;
  blockNumber: number;
  transactionHash: string;
  gasUsed: string;
  dapiName: string;
  oldValue: string;
  newValue: string;
}

interface AirnodeDetailResponse {
  airnode: {
    address: string;
    xpub: string;
    ipfsEndpoint: string;
    oevEndpoint: string;
    chain: string;
    online: boolean;
    lastHeartbeat: string | null;
    responseTime: number;
    uptime: number;
  };
  dapis: DapiInfo[];
  updateHistory: UpdateRecord[];
  responseTimeHistory: Array<{
    timestamp: string;
    responseTime: number;
  }>;
  metadata: {
    totalDapis: number;
    activeDapis: number;
    totalUpdates: number;
    fetchedAt: string;
  };
}

function generateMockData(address: string): AirnodeDetailResponse {
  const chains = ['ethereum', 'arbitrum', 'optimism', 'polygon', 'avalanche'];
  const chainIndex = Math.floor(Math.random() * chains.length);
  const chain = chains[chainIndex] ?? 'ethereum';

  const mockDapis: DapiInfo[] = [
    {
      symbol: 'ETH/USD',
      feedId: '0x0000000000000000000000000000000000000000000000000000000000000ed1',
      chain: chain,
      contractAddress: '0xa0AE7D042aFac3E5e4EA14A13B1579D72Ea7D8D3',
      dataFeedAddress: '0xa0AE7D042aFac3E5e4EA14A13B1579D72Ea7D8D3',
      decimals: 8,
      status: 'active',
      lastValue: '3245.67',
      lastUpdate: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    },
    {
      symbol: 'BTC/USD',
      feedId: '0x0000000000000000000000000000000000000000000000000000000000000ed2',
      chain: chain,
      contractAddress: '0x6De0371D6D2b6E6aB1c4d5e9f3a2b8c1d0e9f7a6',
      dataFeedAddress: '0x6De0371D6D2b6E6aB1c4d5e9f3a2b8c1d0e9f7a6',
      decimals: 8,
      status: 'active',
      lastValue: '67890.12',
      lastUpdate: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    },
    {
      symbol: 'LINK/USD',
      feedId: '0x0000000000000000000000000000000000000000000000000000000000000ed3',
      chain: chain,
      contractAddress: '0x7B2d5B4e2d9C8F1a0b3c4d5e6f7a8b9c0d1e2f3a',
      dataFeedAddress: '0x7B2d5B4e2d9C8F1a0b3c4d5e6f7a8b9c0d1e2f3a',
      decimals: 8,
      status: 'active',
      lastValue: '15.234',
      lastUpdate: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    },
    {
      symbol: 'AAVE/USD',
      feedId: '0x0000000000000000000000000000000000000000000000000000000000000ed4',
      chain: chain,
      contractAddress: '0x8C3d4E5f6A7b8c9D0e1F2a3B4C5d6e7F8a9B0c1D',
      dataFeedAddress: null,
      decimals: 8,
      status: 'inactive',
      lastValue: '0',
      lastUpdate: new Date(Date.now() - 86400000).toISOString(),
    },
  ];

  const mockDapisLength = mockDapis.length;
  const mockUpdateHistory: UpdateRecord[] = Array.from({ length: 10 }, (_, i) => ({
    id: `update-${i}`,
    timestamp: new Date(Date.now() - i * 3600000 - Math.random() * 1800000).toISOString(),
    blockNumber: 18000000 + i * 100 + Math.floor(Math.random() * 50),
    transactionHash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`,
    gasUsed: (21000 + Math.floor(Math.random() * 50000)).toString(),
    dapiName: mockDapisLength > 0 ? (mockDapis[i % mockDapisLength]?.symbol ?? 'N/A') : 'N/A',
    oldValue: (Math.random() * 1000).toFixed(2),
    newValue: (Math.random() * 1000).toFixed(2),
  }));

  const mockResponseTimeHistory = Array.from({ length: 24 }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
    responseTime: 100 + Math.floor(Math.random() * 400),
  })).reverse();

  return {
    airnode: {
      address,
      xpub: 'xpub6C8gViVwVG2LmJ3YK4FL4uV4wKYXqN9U5P6M7R8S9T',
      ipfsEndpoint: `https://ipfs.api3.org/ipfs/${address.slice(2, 10)}`,
      oevEndpoint: `https://oev.api3.org/${address.slice(2, 10)}`,
      chain,
      online: Math.random() > 0.2,
      lastHeartbeat: new Date(Date.now() - Math.random() * 600000).toISOString(),
      responseTime: 150 + Math.floor(Math.random() * 300),
      uptime: 95 + Math.random() * 5,
    },
    dapis: mockDapis,
    updateHistory: mockUpdateHistory,
    responseTimeHistory: mockResponseTimeHistory,
    metadata: {
      totalDapis: mockDapis.length,
      activeDapis: mockDapis.filter((d) => d.status === 'active').length,
      totalUpdates: mockUpdateHistory.length,
      fetchedAt: new Date().toISOString(),
    },
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ address: string }> },
) {
  try {
    const { address } = await params;

    if (!address || address === 'undefined' || address === 'null') {
      return error(
        { code: 'INVALID_ADDRESS', message: 'Invalid or missing address parameter' },
        400,
      );
    }

    const data = generateMockData(address);

    return ok(data, { total: 1 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
