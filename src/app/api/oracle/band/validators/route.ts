import { NextRequest, NextResponse } from 'next/server';

interface Validator {
  address: string;
  name: string;
  rank: number;
  votingPower: number;
  votingPowerPercent: number;
  commission: number;
  uptime: number;
  blocksSigned: number;
  blocksMissed: number;
  status: 'active' | 'inactive' | 'jailed';
  delegators: number;
  rewards24h: number;
  uptimeHistory: number[];
}

interface ValidatorStats {
  totalValidators: number;
  activeValidators: number;
  avgUptime: number;
  totalVotingPower: number;
  topValidatorShare: number;
  networkHealth: 'excellent' | 'good' | 'fair' | 'poor';
}

interface ValidatorsResponse {
  validators: Validator[];
  stats: ValidatorStats;
  lastUpdated: string;
}

export async function GET(request: NextRequest) {
  try {
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);
    
    const mockValidators: Validator[] = Array.from({ length: limit }, (_, i) => ({
      address: `bandvaloper1${Array.from({ length: 38 }, () => 
        'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('')}`,
      name: `Validator ${String.fromCharCode(65 + (i % 26))}${i >= 26 ? i - 25 : ''}`,
      rank: i + 1,
      votingPower: Math.floor(Math.random() * 1000000) + 100000,
      votingPowerPercent: parseFloat((Math.random() * 5 + 0.1).toFixed(2)),
      commission: parseFloat((Math.random() * 10 + 1).toFixed(2)),
      uptime: parseFloat((Math.random() * 5 + 95).toFixed(2)),
      blocksSigned: Math.floor(Math.random() * 100000) + 50000,
      blocksMissed: Math.floor(Math.random() * 1000),
      status: i < 25 ? 'active' : i < 28 ? 'inactive' : 'jailed',
      delegators: Math.floor(Math.random() * 5000) + 100,
      rewards24h: parseFloat((Math.random() * 100 + 10).toFixed(2)),
      uptimeHistory: Array.from({ length: 7 }, () => 
        parseFloat((Math.random() * 5 + 95).toFixed(2))
      ),
    }));

    const stats: ValidatorStats = {
      totalValidators: mockValidators.length,
      activeValidators: mockValidators.filter(v => v.status === 'active').length,
      avgUptime: mockValidators.reduce((acc, v) => acc + v.uptime, 0) / mockValidators.length,
      totalVotingPower: mockValidators.reduce((acc, v) => acc + v.votingPower, 0),
      topValidatorShare: mockValidators[0]?.votingPowerPercent || 0,
      networkHealth: 'excellent',
    };

    const response: ValidatorsResponse = {
      validators: mockValidators,
      stats,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to fetch validators:', error);
    return NextResponse.json(
      { error: 'Failed to fetch validators' },
      { status: 500 }
    );
  }
}
