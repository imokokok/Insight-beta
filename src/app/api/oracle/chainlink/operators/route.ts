import type { NextRequest } from 'next/server';

import type { Operator } from '@/features/oracle/chainlink/types/chainlink';
import { calculateReliabilityScore } from '@/features/oracle/chainlink/utils/reliabilityScore';
import { ok, error } from '@/lib/api/apiResponse';

interface OperatorsQueryParams {
  status?: 'online' | 'offline' | 'all';
  chain?: string;
}

function parseQueryParams(request: NextRequest): OperatorsQueryParams {
  const { searchParams } = new URL(request.url);
  return {
    status: (searchParams.get('status') as OperatorsQueryParams['status']) ?? 'all',
    chain: searchParams.get('chain') ?? undefined,
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
    'AUD/USD',
    'JPY/USD',
  ];

  const operatorData = [
    { name: 'Chainlink Labs', baseFeeds: ['ETH/USD', 'BTC/USD', 'LINK/USD', 'USDC/USD'], baseUptime: 99.95, baseResponse: 85 },
    { name: 'Oracle Cloud Infrastructure', baseFeeds: ['ETH/USD', 'BTC/USD', 'LINK/USD'], baseUptime: 99.92, baseResponse: 95 },
    { name: 'Blockdaemon', baseFeeds: ['ETH/USD', 'BTC/USD', 'USDC/USD', 'USDT/USD', 'DAI/USD'], baseUptime: 99.88, baseResponse: 105 },
    { name: 'Figment', baseFeeds: ['ETH/USD', 'BTC/USD', 'LINK/USD', 'EUR/USD'], baseUptime: 99.85, baseResponse: 115 },
    { name: 'Staked.us', baseFeeds: ['ETH/USD', 'BTC/USD', 'USDC/USD'], baseUptime: 99.78, baseResponse: 125 },
    { name: 'Bison Trails (Coinbase Cloud)', baseFeeds: ['ETH/USD', 'BTC/USD', 'LINK/USD', 'USDT/USD', 'DAI/USD', 'GBP/USD'], baseUptime: 99.9, baseResponse: 90 },
    { name: 'P2P.org', baseFeeds: ['ETH/USD', 'BTC/USD'], baseUptime: 99.7, baseResponse: 135 },
    { name: 'Kiln', baseFeeds: ['ETH/USD', 'BTC/USD', 'LINK/USD', 'USDC/USD'], baseUptime: 99.82, baseResponse: 110 },
    { name: 'Everstake', baseFeeds: ['ETH/USD', 'BTC/USD', 'USDT/USD'], baseUptime: 99.75, baseResponse: 120 },
    { name: 'Chorus One', baseFeeds: ['ETH/USD', 'BTC/USD', 'LINK/USD', 'EUR/USD', 'GBP/USD'], baseUptime: 99.8, baseResponse: 100 },
  ];

  return operatorData.map((data) => {
    const online = Math.random() > 0.03;
    const additionalFeeds = feedTypes.filter((f) => !data.baseFeeds.includes(f));
    const randomExtraFeeds = additionalFeeds.sort(() => Math.random() - 0.5).slice(0, Math.floor(Math.random() * 3));
    const supportedFeeds = [...data.baseFeeds, ...randomExtraFeeds].sort();
    
    const uptimeVariation = (Math.random() - 0.5) * 0.4;
    const uptimePercentage = online 
      ? Math.min(100, Math.max(95, data.baseUptime + uptimeVariation))
      : Math.random() * 20 + 5;
    
    const responseVariation = (Math.random() - 0.5) * 40;
    const responseTime = online 
      ? Math.max(50, Math.floor(data.baseResponse + responseVariation))
      : 0;

    const operator: Operator = {
      name: data.name,
      online,
      responseTime,
      supportedFeeds,
      lastHeartbeat: online
        ? new Date(Date.now() - Math.floor(Math.random() * 120000)).toISOString()
        : new Date(Date.now() - Math.floor(Math.random() * 86400000)).toISOString(),
      uptimePercentage,
    };

    operator.reliabilityScore = calculateReliabilityScore(operator);

    return operator;
  });
}

export async function GET(request: NextRequest) {
  try {
    const { status, chain } = parseQueryParams(request);

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
        chain: chain ?? 'ethereum',
        source: 'mock',
        lastUpdated: new Date().toISOString(),
        note: 'Mock data - Operator data requires Chainlink official API integration',
        dataAvailability: {
          realDataAvailable: false,
          reason:
            'Chainlink node operator data is maintained by Chainlink Labs and ' +
            'requires access to the Chainlink Network API or on-chain registry contracts. ' +
            'Real operator status, response times, and supported feeds should be fetched ' +
            "from Chainlink's official data sources or the Chainlink Operator Registry.",
          alternativeSources: [
            'Chainlink Official Website (chain.link)',
            'Chainlink Network Status Page',
            'Chainlink Operator Registry Smart Contract',
          ],
        },
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch operators';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
