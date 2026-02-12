import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { requireAdminWithToken } from '@/lib/api/apiResponse';
import { query } from '@/lib/database/db';
import { logger } from '@/shared/logger';

interface ConfigRow {
  config: Record<string, unknown>;
}

const DEFAULT_CONFIG = {
  zScoreThreshold: 3,
  minConfidenceScore: 0.7,
  timeWindowMs: 300000,
  minDataPoints: 10,
  flashLoanMinAmountUsd: 100000,
  sandwichProfitThresholdUsd: 1000,
  liquidityChangeThreshold: 0.3,
  maxPriceDeviationPercent: 5,
  correlationThreshold: 0.8,
  enabledRules: [
    'statistical_anomaly',
    'flash_loan_attack',
    'sandwich_attack',
    'liquidity_manipulation',
  ],
  alertChannels: {
    email: true,
    webhook: true,
    slack: false,
    telegram: false,
  },
  autoBlockSuspiciousFeeds: false,
  notificationCooldownMs: 300000,
};

export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdminWithToken(request, { strict: false });
    if (auth) return auth;

    let config = DEFAULT_CONFIG;

    try {
      const result = await query<ConfigRow>(
        `SELECT config FROM detection_config WHERE id = $1 LIMIT 1`,
        ['default'],
      );

      if (result.rows.length > 0 && result.rows[0]?.config) {
        config = result.rows[0].config as typeof DEFAULT_CONFIG;
      }
    } catch (error) {
      logger.error('Failed to fetch detection config', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return NextResponse.json({ config });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error in config GET API', { error: errorMessage });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdminWithToken(request);
    if (auth) return auth;

    const body = await request.json();
    const { config } = body;

    if (!config) {
      return NextResponse.json({ error: 'Missing config in request body' }, { status: 400 });
    }

    await query(
      `INSERT INTO detection_config (id, config, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (id) 
       DO UPDATE SET config = $2, updated_at = NOW()`,
      ['default', JSON.stringify(config)],
    );

    logger.info('Detection configuration updated');

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error in config POST API', { error: errorMessage });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
