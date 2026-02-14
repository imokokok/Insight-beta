/**
 * 监控 Dashboard API
 *
 * 提供监控数据的聚合接口
 */

import type { NextRequest } from 'next/server';

import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { apiSuccess } from '@/shared/utils';

export const dynamic = 'force-dynamic';

interface MonitoringStats {
  notifications: {
    channels: string[];
    configured: {
      email: boolean;
      webhook: boolean;
      slack: boolean;
      telegram: boolean;
      pagerduty: boolean;
      discord: boolean;
    };
  };
  system: {
    nodeEnv: string;
    timestamp: string;
  };
}

async function handleGet(_request: NextRequest) {
  const stats: MonitoringStats = {
    notifications: {
      channels: [],
      configured: {
        email: false,
        webhook: false,
        slack: false,
        telegram: false,
        pagerduty: false,
        discord: false,
      },
    },
    system: {
      nodeEnv: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    },
  };

  return apiSuccess(stats);
}

export const GET = withMiddleware({
  rateLimit: DEFAULT_RATE_LIMIT,
  validate: { allowedMethods: ['GET'] },
})(handleGet);
