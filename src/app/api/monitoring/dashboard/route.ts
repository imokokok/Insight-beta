/**
 * 监控 Dashboard API
 *
 * 提供监控数据的聚合接口
 */

import type { NextRequest } from 'next/server';

import { env } from '@/lib/config/env';
import { apiSuccess, withErrorHandler } from '@/lib/utils';
import { alertService } from '@/lib/services/detection/alertService';

export const dynamic = 'force-dynamic';

interface MonitoringStats {
  alerts: {
    total: number;
    cooldownActive: number;
    channels: {
      email: boolean;
      webhook: boolean;
      slack: boolean;
      telegram: boolean;
    };
  };
  notifications: {
    channels: string[];
    configured: {
      email: boolean;
      webhook: boolean;
      slack: boolean;
      telegram: boolean;
    };
  };
  system: {
    nodeEnv: string;
    timestamp: string;
  };
}

export const GET = withErrorHandler(async (_request: NextRequest) => {
  // 获取告警服务统计
  const alertStats = alertService.getStats();

  // 检查通知渠道配置状态
  const notificationConfig = {
    email: !!(env.INSIGHT_SMTP_HOST && env.INSIGHT_SMTP_USER && env.INSIGHT_SMTP_PASS),
    webhook: !!env.INSIGHT_WEBHOOK_URL,
    slack: !!env.INSIGHT_SLACK_WEBHOOK_URL,
    telegram: !!(env.INSIGHT_TELEGRAM_BOT_TOKEN && env.INSIGHT_TELEGRAM_CHAT_ID),
  };

  const configuredChannels = Object.entries(notificationConfig)
    .filter(([, configured]) => configured)
    .map(([channel]) => channel);

  const stats: MonitoringStats = {
    alerts: {
      total: alertStats.totalAlerts,
      cooldownActive: alertStats.cooldownActive,
      channels: {
        email: alertStats.channels.email ?? false,
        webhook: alertStats.channels.webhook ?? false,
        slack: alertStats.channels.slack ?? false,
        telegram: alertStats.channels.telegram ?? false,
      },
    },
    notifications: {
      channels: configuredChannels,
      configured: notificationConfig,
    },
    system: {
      nodeEnv: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    },
  };

  return apiSuccess(stats);
});
