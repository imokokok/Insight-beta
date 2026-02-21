import type { NextRequest } from 'next/server';

import { error, ok } from '@/lib/api/apiResponse';
import { AppError } from '@/lib/errors';
import { logger } from '@/shared/logger';

export interface Assertion {
  id: string;
  assertionId: string;
  identifier: string;
  claim: string;
  proposer: string;
  bond: string;
  challengeBond: string;
  status: 'pending' | 'disputed' | 'resolved' | 'settled';
  chain: string;
  blockNumber: number;
  txHash: string;
  timestamp: string;
  expirationTimestamp: string;
  resolutionTimestamp?: string;
  settlementTimestamp?: string;
  challenger?: string;
  settledPrice?: string;
  isMock?: boolean;
}

interface AssertionsQueryParams {
  from?: string;
  to?: string;
  status?: string;
  chain?: string;
  useMock?: string;
}

function generateMockAssertions(): Assertion[] {
  const statuses: Assertion['status'][] = ['pending', 'disputed', 'resolved', 'settled'];
  const chains = ['ethereum', 'polygon', 'optimism', 'arbitrum'];
  const proposers = [
    '0xabcdef1234567890abcdef1234567890abcdef12',
    '0x1234567890abcdef1234567890abcdef12345678',
    '0x9876543210fedcba9876543210fedcba98765432',
  ];
  const identifiers = [
    'ETH/BTC',
    'LINK/USD',
    'USDC/USD',
    'BTC/USD',
    'SOL/USD',
  ];

  const assertions: Assertion[] = [];
  const now = Date.now();

  for (let i = 0; i < 25; i++) {
    const status = statuses[Math.floor(Math.random() * statuses.length)]!;
    const chain = chains[Math.floor(Math.random() * chains.length)]!;
    const proposer = proposers[Math.floor(Math.random() * proposers.length)]!;
    const identifier = identifiers[Math.floor(Math.random() * identifiers.length)]!;
    const timestamp = new Date(now - Math.random() * 30 * 24 * 60 * 60 * 1000);
    const expirationTimestamp = new Date(timestamp.getTime() + 7 * 24 * 60 * 60 * 1000);

    const assertion: Assertion = {
      id: `assertion-${i + 1}`,
      assertionId: `0x${(i + 1).toString(16).padStart(64, '0')}`,
      identifier,
      claim: `Claim about ${identifier} price`,
      proposer,
      bond: (Math.random() * 10000 + 1000).toFixed(2),
      challengeBond: (Math.random() * 5000 + 500).toFixed(2),
      status,
      chain,
      blockNumber: 18000000 + Math.floor(Math.random() * 1000000),
      txHash: `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`.slice(0, 66),
      timestamp: timestamp.toISOString(),
      expirationTimestamp: expirationTimestamp.toISOString(),
    };

    if (status === 'disputed') {
      assertion.challenger = proposers[(proposers.indexOf(proposer) + 1) % proposers.length];
    }

    if (status === 'resolved' || status === 'settled') {
      assertion.resolutionTimestamp = new Date(expirationTimestamp.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString();
      assertion.settledPrice = (Math.random() * 10000 + 1000).toFixed(4);
    }

    if (status === 'settled') {
      assertion.settlementTimestamp = new Date(assertion.resolutionTimestamp ? new Date(assertion.resolutionTimestamp).getTime() + 2 * 24 * 60 * 60 * 1000 : expirationTimestamp.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString();
    }

    assertions.push(assertion);
  }

  return assertions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function filterAssertions(
  assertions: Assertion[],
  { from, to, status, chain }: AssertionsQueryParams
): Assertion[] {
  return assertions.filter((assertion) => {
    if (from) {
      const fromDate = new Date(from);
      if (new Date(assertion.timestamp) < fromDate) {
        return false;
      }
    }

    if (to) {
      const toDate = new Date(to);
      if (new Date(assertion.timestamp) > toDate) {
        return false;
      }
    }

    if (status && assertion.status !== status) {
      return false;
    }

    if (chain && assertion.chain !== chain) {
      return false;
    }

    return true;
  });
}

export async function GET(request: NextRequest) {
  const requestStartTime = performance.now();

  try {
    const { searchParams } = new URL(request.url);
    const params: AssertionsQueryParams = {
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
      status: searchParams.get('status') || undefined,
      chain: searchParams.get('chain') || undefined,
      useMock: searchParams.get('useMock') || undefined,
    };

    const useMock = params.useMock === 'true' || process.env.NODE_ENV === 'development';
    const allAssertions = generateMockAssertions();
    const filteredAssertions = filterAssertions(allAssertions, params);

    const requestTime = performance.now() - requestStartTime;
    logger.info('UMA Assertions API request completed', {
      performance: { totalRequestTimeMs: Math.round(requestTime) },
      isMock: useMock,
      count: filteredAssertions.length,
    });

    return ok({
      assertions: filteredAssertions.map(a => ({ ...a, isMock: useMock })),
      total: filteredAssertions.length,
      metadata: {
        source: 'uma-optimistic-oracle',
        lastUpdated: new Date().toISOString(),
        note: 'Mock data - to be replaced with real UMA assertion data',
      },
    });
  } catch (err) {
    const requestTime = performance.now() - requestStartTime;

    logger.error('UMA Assertions API error', {
      error: err,
      performance: { totalRequestTimeMs: Math.round(requestTime) },
    });

    return error(
      new AppError('Failed to fetch UMA assertions', {
        category: 'INTERNAL',
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        details: { message: err instanceof Error ? err.message : 'Unknown error' },
      }),
    );
  }
}
