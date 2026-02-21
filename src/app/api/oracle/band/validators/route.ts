import type { NextRequest } from 'next/server';

import { ok, error } from '@/lib/api/apiResponse';

interface ValidatorDetail {
  rank: number;
  address: string;
  moniker: string;
  status: 'active' | 'inactive' | 'jailed';
  votingPower: number;
  votingPowerPercent: number;
  commissionRate: number;
  uptimePercent: number;
  delegations: number;
  totalDelegations: number;
  lastSeenAt: string;
  lastSignedBlock: number;
  missedBlocks: number;
  punishmentCount: number;
  selfDelegation: number;
  description: string;
  website: string;
  identity: string;
}

interface ValidatorSummary {
  totalValidators: number;
  activeValidators: number;
  inactiveValidators: number;
  jailedValidators: number;
  totalVotingPower: number;
  avgUptimePercent: number;
  avgCommissionRate: number;
  top10VotingPowerPercent: number;
}

interface ValidatorsResponse {
  summary: ValidatorSummary;
  validators: ValidatorDetail[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

const MONIKERS = [
  'CosmosHub Validator',
  'StakeFish',
  'Figment',
  'Allnodes',
  'Staking Rewards',
  'Chainlayer',
  'Bison Trails',
  'Certus One',
  'Chorus One',
  'Sentinel',
  'Everstake',
  'Genesis Lab',
  'HashQuark',
  'InfStones',
  'KysenPool',
  'LinkPool',
  'Masternode24',
  'Mythos',
  'Notional',
  'Ocean Stake',
];

function generateValidators(
  page: number,
  limit: number,
): { validators: ValidatorDetail[]; total: number } {
  const total = 100;
  const start = (page - 1) * limit;
  const end = Math.min(start + limit, total);
  const validators: ValidatorDetail[] = [];

  const totalVotingPower = 1000000000;

  for (let i = start; i < end; i++) {
    const votingPower = Math.floor(Math.random() * 50000000) + 1000000;

    const status: ValidatorDetail['status'] = i < 80 ? 'active' : i < 95 ? 'inactive' : 'jailed';

    validators.push({
      rank: i + 1,
      address: `bandvaloper1${Math.random().toString(36).substring(2, 15)}`,
      moniker:
        MONIKERS[i % MONIKERS.length] +
        (i >= MONIKERS.length ? ` ${Math.floor(i / MONIKERS.length) + 1}` : ''),
      status,
      votingPower,
      votingPowerPercent: Number(((votingPower / totalVotingPower) * 100).toFixed(4)),
      commissionRate: Number((Math.random() * 0.2 + 0.01).toFixed(4)),
      uptimePercent:
        status === 'jailed'
          ? Number((Math.random() * 50 + 50).toFixed(2))
          : Number((Math.random() * 5 + 95).toFixed(2)),
      delegations: Math.floor(Math.random() * 1000) + 100,
      totalDelegations: Math.floor(Math.random() * 10000) + 5000,
      lastSeenAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
      lastSignedBlock: Math.floor(Math.random() * 10000000),
      missedBlocks: Math.floor(Math.random() * 100),
      punishmentCount: status === 'jailed' ? Math.floor(Math.random() * 5) + 1 : 0,
      selfDelegation: Math.floor(Math.random() * 100000) + 10000,
      description: `Validator operator ${i + 1} providing secure and reliable staking services.`,
      website: `https://validator${i + 1}.example.com`,
      identity: Math.random().toString(36).substring(2, 10),
    });
  }

  return { validators, total };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '20');
    const sortBy = searchParams.get('sortBy') ?? 'rank';
    const status = searchParams.get('status');

    if (page < 1 || limit < 1 || limit > 100) {
      return error({ code: 'INVALID_PARAMS', message: 'Invalid pagination parameters' }, 400);
    }

    const { validators, total } = generateValidators(page, limit);

    let filteredValidators = validators;
    if (status) {
      const statuses = status.split(',');
      filteredValidators = validators.filter((v) => statuses.includes(v.status));
    }

    let sortedValidators = [...filteredValidators];
    switch (sortBy) {
      case 'votingPower':
        sortedValidators.sort((a, b) => b.votingPower - a.votingPower);
        break;
      case 'uptime':
        sortedValidators.sort((a, b) => b.uptimePercent - a.uptimePercent);
        break;
      case 'commission':
        sortedValidators.sort((a, b) => a.commissionRate - b.commissionRate);
        break;
      default:
        sortedValidators.sort((a, b) => a.rank - b.rank);
    }

    const activeCount = sortedValidators.filter((v) => v.status === 'active').length;
    const inactiveCount = sortedValidators.filter((v) => v.status === 'inactive').length;
    const jailedCount = sortedValidators.filter((v) => v.status === 'jailed').length;
    const totalVotingPower = sortedValidators.reduce((sum, v) => sum + v.votingPower, 0);
    const avgUptime =
      sortedValidators.reduce((sum, v) => sum + v.uptimePercent, 0) / sortedValidators.length;
    const avgCommission =
      sortedValidators.reduce((sum, v) => sum + v.commissionRate, 0) / sortedValidators.length;

    const top10Power = sortedValidators
      .sort((a, b) => b.votingPower - a.votingPower)
      .slice(0, 10)
      .reduce((sum, v) => sum + v.votingPower, 0);
    const top10PowerPercent = (top10Power / totalVotingPower) * 100;

    const response: ValidatorsResponse = {
      summary: {
        totalValidators: total,
        activeValidators: activeCount,
        inactiveValidators: inactiveCount,
        jailedValidators: jailedCount,
        totalVotingPower,
        avgUptimePercent: Number(avgUptime.toFixed(2)),
        avgCommissionRate: Number(avgCommission.toFixed(4)),
        top10VotingPowerPercent: Number(top10PowerPercent.toFixed(2)),
      },
      validators: sortedValidators,
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    };

    return ok(response);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to fetch validators';
    return error({ code: 'INTERNAL_ERROR', message }, 500);
  }
}
