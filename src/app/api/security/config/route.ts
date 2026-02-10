import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { logger } from '@/lib/logger';
import { supabaseAdmin, SUPABASE_ERROR_CODES } from '@/lib/supabase/server';
import { requireAdminWithToken } from '@/server/apiResponse';

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

    const supabase = supabaseAdmin;

    const { data, error } = await supabase
      .from('detection_config')
      .select('config')
      .eq('id', 'default')
      .single();

    if (error && error.code !== SUPABASE_ERROR_CODES.NO_DATA) {
      logger.error('Failed to fetch detection config', { error: error.message });
    }

    const config = (data as ConfigRow | null)?.config || DEFAULT_CONFIG;

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

    const supabase = supabaseAdmin;

    const { error } = await supabase.from('detection_config').upsert({
      id: 'default',
      config,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      logger.error('Failed to save detection config', { error: error.message });
      return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 });
    }

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
