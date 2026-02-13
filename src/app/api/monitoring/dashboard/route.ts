/**
 * 监控 Dashboard API
 *
 * 提供监控数据的聚合接口
 */

import type { NextRequest } from 'next/server';

import { env } from '@/config/env';
import { withMiddleware, DEFAULT_RATE_LIMIT } from '@/lib/api/middleware';
import { alertService } from '@/features/alert/services/alertService';
import { apiSuccess } from '@/shared/utils';

export const dynamic = 'force-dynamic';

interface MonitoringStats {
  alerts: {
    total: number;
    acknowledged: number;
    pending: number;
    recent: number;
    channels: {
      email: boolean;
      webhook: boolean;
      slack: boolean;
      telegram: boolean;
      pagerduty: boolean;
      discord: boolean;
    };
  };
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
    channelHealth: {
      channel: string;
      isHealthy: boolean;
      successRate: number;
    }[];
  };
  system: {
    nodeEnv: string;
    timestamp: string;
  };
}

async function handleGet(_request: NextRequest) {
  const alertStats = alertService.getStats();
  const channelHealth = alertService.getChannelHealth();

  const notificationConfig = {
    email: !!(env.INSIGHT_SMTP_HOST && env.INSIGHT_SMTP_USER && env.INSIGHT_SMTP_PASS),
    webhook: !!env.INSIGHT_WEBHOOK_URL,
    slack: !!env.INSIGHT_SLACK_WEBHOOK_URL,
    telegram: !!(env.INSIGHT_TELEGRAM_BOT_TOKEN && env.INSIGHT_TELEGRAM_CHAT_ID),
    pagerduty: !!env.INSIGHT_PAGERDUTY_KEY,
    discord: false,
  };

  const configuredChannels = Object.entries(notificationConfig)
    .filter(([, configured]) => configured)
    .map(([channel]) => channel);

  const stats: MonitoringStats = {
    alerts: {
      total: alertStats.totalAlerts,
      acknowledged: alertStats.acknowledgedAlerts,
      pending: alertStats.pendingAlerts,
      recent: alertStats.recentAlertsCount,
      channels: notificationConfig,
    },
    notifications: {
      channels: configuredChannels,
      configured: notificationConfig,
      channelHealth: channelHealth.map((h) => ({
        channel: h.channel,
        isHealthy: h.isHealthy,
        successRate: h.successRate,
      })),
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
