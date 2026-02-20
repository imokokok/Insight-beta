import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';

interface Operator {
  name: string;
  online: boolean;
  responseTime: number;
  supportedFeeds: string[];
  lastHeartbeat: string | null;
}

interface OperatorsQueryParams {
  status?: 'online' | 'offline' | 'all';
}

function parseQueryParams(request: NextRequest): OperatorsQueryParams {
  const { searchParams } = new URL(request.url);
  return {
    status: (searchParams.get('status') as OperatorsQueryParams['status']) ?? 'all',
  };
}

function getMockOperators(): Operator[] {
  const feedTypes = [
    'ETH/USD',
    'BTC/USD',
    'LINK/USD',
    'USDC/USD',
    'USDT/USD',
    'DAI/USD',
    'EUR/USD',
    'GBP/USD',
  ];

  const operatorNames = [
    'Chainlink Labs Node 1',
    'Chainlink Labs Node 2',
    'Oracle Cloud Node A',
    'Oracle Cloud Node B',
    'DeFi Security Node',
    'Blockdaemon Node 1',
    'Blockdaemon Node 2',
    'Staked.us Node',
    'Figment Node',
    'Bison Trails Node',
    'Alchemy Node',
    'Infura Oracle Node',
    'QuickNode Node',
    'Ankr Node',
    'Pocket Network Node',
  ];

  return operatorNames.map((name) => {
    const online = Math.random() > 0.15;
    const supportedCount = Math.floor(Math.random() * 5) + 3;
    const shuffledFeeds = [...feedTypes].sort(() => Math.random() - 0.5);

    return {
      name,
      online,
      responseTime: online ? Math.floor(Math.random() * 200) + 50 : 0,
      supportedFeeds: shuffledFeeds.slice(0, supportedCount),
      lastHeartbeat: online
        ? new Date(Date.now() - Math.floor(Math.random() * 300000)).toISOString()
        : null,
    };
  });
}

export async function GET(request: NextRequest) {
  try {
    const { status } = parseQueryParams(request);

    let operators = getMockOperators();

    if (status === 'online') {
      operators = operators.filter((op) => op.online);
    } else if (status === 'offline') {
      operators = operators.filter((op) => !op.online);
    }

    const onlineCount = operators.filter((op) => op.online).length;
    const offlineCount = operators.filter((op) => !op.online).length;

    return ok({
      operators,
      metadata: {
        total: operators.length,
        online: onlineCount,
        offline: offlineCount,
        filter: status,
        source: 'chainlink-network',
        lastUpdated: new Date().toISOString(),
        note: 'Mock data - to be replaced with real Chainlink operator data',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch operators';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
