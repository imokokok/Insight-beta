import type { NextRequest } from 'next/server';

import { error, ok } from '@/lib/api/apiResponse';
import { AppError } from '@/lib/errors';
import { logger } from '@/shared/logger';

interface Assertion {
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

function generateMockAssertions(): Assertion[] {
  const statuses: Assertion['status'][] = ['pending', 'disputed', 'resolved', 'settled'];
  const chains = ['ethereum', 'polygon', 'optimism', 'arbitrum'];
  const proposers = [
    '0xabcdef1234567890abcdef1234567890abcdef12',
    '0x1234567890abcdef1234567890abcdef12345678',
    '0x9876543210fedcba9876543210fedcba98765432',
  ];
  const identifiers = ['ETH/BTC', 'LINK/USD', 'USDC/USD', 'BTC/USD', 'SOL/USD'];

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
      txHash:
        `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`.slice(
          0,
          66,
        ),
      timestamp: timestamp.toISOString(),
      expirationTimestamp: expirationTimestamp.toISOString(),
    };

    if (status === 'disputed') {
      assertion.challenger = proposers[(proposers.indexOf(proposer) + 1) % proposers.length];
    }

    if (status === 'resolved' || status === 'settled') {
      assertion.resolutionTimestamp = new Date(
        expirationTimestamp.getTime() + 1 * 24 * 60 * 60 * 1000,
      ).toISOString();
      assertion.settledPrice = (Math.random() * 10000 + 1000).toFixed(4);
    }

    if (status === 'settled') {
      assertion.settlementTimestamp = new Date(
        assertion.resolutionTimestamp
          ? new Date(assertion.resolutionTimestamp).getTime() + 2 * 24 * 60 * 60 * 1000
          : expirationTimestamp.getTime() + 3 * 24 * 60 * 60 * 1000,
      ).toISOString();
    }

    assertions.push(assertion);
  }

  return assertions.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

function generateMockVoters() {
  const voters = [];
  for (let i = 0; i < 10; i++) {
    const totalVotes = Math.floor(Math.random() * 100) + 10;
    const successfulVotes = Math.floor(Math.random() * totalVotes);
    voters.push({
      address:
        `0x${Math.random().toString(16).slice(2)}${Math.random().toString(16).slice(2)}`.slice(
          0,
          42,
        ),
      totalVotes,
      successfulVotes,
      failedVotes: totalVotes - successfulVotes,
      totalBond: (Math.random() * 50000 + 5000).toFixed(2),
      reputation: Math.floor(Math.random() * 100) + 1,
    });
  }
  return voters.sort((a, b) => b.reputation - a.reputation);
}

export async function GET(_request: NextRequest) {
  const requestStartTime = performance.now();

  try {
    const assertions = generateMockAssertions();
    const voters = generateMockVoters();

    const tvl = {
      total: '12500000',
      breakdown: {
        ethereum: '8000000',
        polygon: '2500000',
        optimism: '1200000',
        arbitrum: '800000',
      },
    };

    const health = {
      status: 'healthy' as const,
      score: 98,
      lastChecked: new Date().toISOString(),
      issues: [],
    };

    const requestTime = performance.now() - requestStartTime;
    logger.info('UMA Dashboard API request completed', {
      performance: { totalRequestTimeMs: Math.round(requestTime) },
      assertionsCount: assertions.length,
      votersCount: voters.length,
    });

    return ok({
      assertions: {
        assertions,
        total: assertions.length,
        metadata: {
          source: 'uma-optimistic-oracle',
          lastUpdated: new Date().toISOString(),
        },
      },
      tvl: {
        ...tvl,
        metadata: {
          source: 'uma-optimistic-oracle',
          lastUpdated: new Date().toISOString(),
        },
      },
      voters: {
        voters,
        metadata: {
          total: voters.length,
          source: 'uma-optimistic-oracle',
          lastUpdated: new Date().toISOString(),
        },
      },
      health,
    });
  } catch (err) {
    const requestTime = performance.now() - requestStartTime;

    logger.error('UMA Dashboard API error', {
      error: err,
      performance: { totalRequestTimeMs: Math.round(requestTime) },
    });

    return error(
      new AppError('Failed to fetch UMA dashboard data', {
        category: 'INTERNAL',
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        details: { message: err instanceof Error ? err.message : 'Unknown error' },
      }),
    );
  }
}
