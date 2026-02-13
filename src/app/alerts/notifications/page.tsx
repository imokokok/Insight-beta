'use client';

import { useCallback, useEffect, useState } from 'react';

import { PageHeader } from '@/components/common/PageHeader';
import { LoadingOverlay, EmptyAlertsState } from '@/components/ui';
import { ErrorBanner } from '@/components/ui/ErrorBanner';
import { AlertHistory, NotificationChannelConfig } from '@/features/alert/components';
import type { ChannelConfig as ChannelConfigType } from '@/features/alert/components/NotificationChannelConfig';
import { useI18n } from '@/i18n';
import type { AlertHistoryRecord, ChannelHealthStatus } from '@/services/alert/notificationManager';
import { logger } from '@/shared/logger';

/**
 * 通知渠道配置页面
 *
 * 管理 Webhook、PagerDuty、Slack、Email 等告警通知渠道
 * 查看告警历史记录
 */
export default function NotificationsConfigPage() {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [channels, setChannels] = useState<ChannelConfigType[]>([]);
  const [alerts, setAlerts] = useState<AlertHistoryRecord[]>([]);
  const [channelHealth, setChannelHealth] = useState<ChannelHealthStatus[]>([]);

  // 加载配置
  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/alerts/config');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load config');
      }

      // 转换配置为组件格式
      const channelConfigs: ChannelConfigType[] = Object.entries(data.config.channels || {}).map(
        ([name, config]: [string, unknown]) => ({
          id: name,
          name,
          channel: (config as { type: string }).type as ChannelConfigType['channel'],
          enabled: true,
          config: config as ChannelConfigType['config'],
          createdAt: new Date(),
          updatedAt: new Date(),
          severity: 'medium',
        }),
      );

      setChannels(channelConfigs);
      setChannelHealth(data.channelHealth || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }, []);

  // 加载告警历史
  const loadAlerts = useCallback(async () => {
    try {
      const response = await fetch('/api/alerts/history?limit=100');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to load alerts');
      }

      setAlerts(data.alerts || []);
      setChannelHealth(data.channelHealth || []);
    } catch (err) {
      logger.error('Failed to load alerts', { error: err });
    }
  }, []);

  // 保存配置
  const handleSave = async (newChannels: ChannelConfigType[]) => {
    const channelsConfig: Record<string, unknown> = {};
    const severityChannels = {
      critical: [] as string[],
      warning: [] as string[],
      info: [] as string[],
    };

    for (const ch of newChannels) {
      if (ch.enabled) {
        channelsConfig[ch.name] = ch.config;
        severityChannels.critical.push(ch.name);
        if (ch.channel !== 'pagerduty') {
          severityChannels.warning.push(ch.name);
        }
        if (ch.channel === 'slack' || ch.channel === 'email') {
          severityChannels.info.push(ch.name);
        }
      }
    }

    const response = await fetch('/api/alerts/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channels: channelsConfig,
        severityChannels,
      }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to save config');
    }

    await loadConfig();
  };

  // 测试渠道
  const handleTest = async (channelName: string) => {
    const response = await fetch('/api/alerts/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel: channelName }),
    });

    const data = await response.json();

    return {
      success: data.success,
      message: data.message || (data.success ? 'Test successful' : 'Test failed'),
    };
  };

  // 确认告警
  const handleAcknowledge = async (alertId: string) => {
    const response = await fetch('/api/alerts/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertId, acknowledgedBy: 'user' }),
    });

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Failed to acknowledge alert');
    }

    await loadAlerts();
  };

  useEffect(() => {
    void loadConfig();
    void loadAlerts();
  }, [loadConfig, loadAlerts]);

  return (
    <div className="relative space-y-6 pb-16">
      {/* Loading Overlay */}
      {loading && !error && <LoadingOverlay message="Loading configuration..." />}

      <PageHeader title={t('alerts.config.title')} description={t('alerts.config.description')} />

      {error && (
        <ErrorBanner
          error={new Error(error)}
          onRetry={loadConfig}
          title="Failed to load configuration"
          isRetrying={loading}
        />
      )}

      {/* Empty State - No Alerts */}
      {!loading && !error && alerts.length === 0 && (
        <EmptyAlertsState
          onSetAlertRules={() => {
            // Scroll to notification config section
            document.getElementById('notification-config')?.scrollIntoView({ behavior: 'smooth' });
          }}
        />
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <NotificationChannelConfig
          channels={channels}
          onSave={handleSave}
          onTest={handleTest}
          className="lg:col-span-2"
        />

        <AlertHistory
          alerts={alerts}
          channelHealth={channelHealth}
          onRefresh={loadAlerts}
          onAcknowledge={handleAcknowledge}
          loading={loading}
          className="lg:col-span-2"
        />
      </div>
    </div>
  );
}
