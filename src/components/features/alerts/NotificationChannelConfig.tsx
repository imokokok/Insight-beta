'use client';

import { useState, useCallback } from 'react';

import {
  Mail,
  Webhook,
  MessageSquare,
  Bell,
  AlertTriangle,
  TestTube,
  Save,
  Loader2,
} from 'lucide-react';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useI18n } from '@/i18n';
import { logger } from '@/shared/logger';
import type {
  NotificationChannel,
  NotificationConfig,
  EmailConfig,
  WebhookConfig,
  SlackConfig,
  TelegramConfig,
  PagerDutyConfig,
} from '@/services/alert/notifications/types';

export interface ChannelConfig {
  name: string;
  channel: NotificationChannel;
  enabled: boolean;
  config: NotificationConfig;
}

export interface NotificationChannelConfigProps {
  channels: ChannelConfig[];
  onSave: (channels: ChannelConfig[]) => Promise<void>;
  onTest: (channelName: string) => Promise<{ success: boolean; message: string }>;
  className?: string;
}

/**
 * 通知渠道配置组件
 *
 * 管理 Webhook、PagerDuty、Slack、Email 等告警通知渠道的配置
 */
export function NotificationChannelConfig({
  channels,
  onSave,
  onTest,
  className,
}: NotificationChannelConfigProps) {
  const { t } = useI18n();
  const [configs, setConfigs] = useState<ChannelConfig[]>(channels);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateConfig = useCallback(
    (index: number, updates: Partial<ChannelConfig>) => {
      setConfigs((prev) => prev.map((c, i) => (i === index ? { ...c, ...updates } : c)));
      // 清除该渠道的错误
      if (updates.config) {
        setErrors((prev) => ({ ...prev, [configs[index]?.name || '']: '' }));
      }
    },
    [configs],
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(configs);
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (channelName: string) => {
    setTesting(channelName);
    try {
      await onTest(channelName);
    } finally {
      setTesting(null);
    }
  };

  const getChannelIcon = (channel: NotificationChannel) => {
    switch (channel) {
      case 'email':
        return <Mail className="h-5 w-5" />;
      case 'webhook':
        return <Webhook className="h-5 w-5" />;
      case 'slack':
        return <MessageSquare className="h-5 w-5" />;
      case 'telegram':
        return <Bell className="h-5 w-5" />;
      case 'pagerduty':
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Bell className="h-5 w-5" />;
    }
  };

  const renderConfigFields = (config: ChannelConfig, index: number) => {
    const { channel, config: channelConfig } = config;

    switch (channel) {
      case 'email':
        const emailConfig = channelConfig as EmailConfig;
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('alerts.config.smtpHost')}</Label>
                <Input
                  value={emailConfig.smtpHost}
                  onChange={(e) =>
                    updateConfig(index, {
                      config: { ...emailConfig, smtpHost: e.target.value },
                    })
                  }
                  placeholder="smtp.example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>{t('alerts.config.smtpPort')}</Label>
                <Input
                  type="number"
                  value={emailConfig.smtpPort}
                  onChange={(e) =>
                    updateConfig(index, {
                      config: { ...emailConfig, smtpPort: parseInt(e.target.value) },
                    })
                  }
                  placeholder="587"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('alerts.config.username')}</Label>
              <Input
                value={emailConfig.username}
                onChange={(e) =>
                  updateConfig(index, {
                    config: { ...emailConfig, username: e.target.value },
                  })
                }
                placeholder="alert@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('alerts.config.password')}</Label>
              <Input
                type="password"
                value={emailConfig.password}
                onChange={(e) =>
                  updateConfig(index, {
                    config: { ...emailConfig, password: e.target.value },
                  })
                }
                placeholder="••••••••"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('alerts.config.fromAddress')}</Label>
              <Input
                value={emailConfig.fromAddress}
                onChange={(e) =>
                  updateConfig(index, {
                    config: { ...emailConfig, fromAddress: e.target.value },
                  })
                }
                placeholder="alert@example.com"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('alerts.config.toAddresses')}</Label>
              <Input
                value={emailConfig.toAddresses.join(', ')}
                onChange={(e) =>
                  updateConfig(index, {
                    config: {
                      ...emailConfig,
                      toAddresses: e.target.value.split(',').map((s) => s.trim()),
                    },
                  })
                }
                placeholder="admin@example.com, ops@example.com"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={emailConfig.useTLS}
                onCheckedChange={(checked) =>
                  updateConfig(index, {
                    config: { ...emailConfig, useTLS: checked },
                  })
                }
              />
              <Label>{t('alerts.config.useTLS')}</Label>
            </div>
          </div>
        );

      case 'webhook':
        const webhookConfig = channelConfig as WebhookConfig;
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('alerts.config.webhookUrl')}</Label>
              <Input
                value={webhookConfig.url}
                onChange={(e) =>
                  updateConfig(index, {
                    config: { ...webhookConfig, url: e.target.value },
                  })
                }
                placeholder="https://hooks.example.com/alerts"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('alerts.config.method')}</Label>
              <select
                value={webhookConfig.method}
                onChange={(e) =>
                  updateConfig(index, {
                    config: { ...webhookConfig, method: e.target.value as 'POST' | 'PUT' },
                  })
                }
                className="bg-background w-full rounded-md border border-input px-3 py-2"
              >
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>{t('alerts.config.headers')}</Label>
              <textarea
                value={JSON.stringify(webhookConfig.headers, null, 2)}
                onChange={(e) => {
                  try {
                    const headers = JSON.parse(e.target.value);
                    updateConfig(index, { config: { ...webhookConfig, headers } });
                  } catch (error) {
                    logger.warn('Failed to parse webhook headers JSON', { error });
                  }
                }}
                className="bg-background min-h-[100px] w-full rounded-md border border-input px-3 py-2 font-mono text-sm"
                placeholder='{"Authorization": "Bearer token"}'
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('alerts.config.timeoutMs')}</Label>
                <Input
                  type="number"
                  value={webhookConfig.timeoutMs}
                  onChange={(e) =>
                    updateConfig(index, {
                      config: { ...webhookConfig, timeoutMs: parseInt(e.target.value) },
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>{t('alerts.config.retryCount')}</Label>
                <Input
                  type="number"
                  value={webhookConfig.retryCount}
                  onChange={(e) =>
                    updateConfig(index, {
                      config: { ...webhookConfig, retryCount: parseInt(e.target.value) },
                    })
                  }
                />
              </div>
            </div>
          </div>
        );

      case 'slack':
        const slackConfig = channelConfig as SlackConfig;
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('alerts.config.slackWebhookUrl')}</Label>
              <Input
                value={slackConfig.webhookUrl}
                onChange={(e) =>
                  updateConfig(index, {
                    config: { ...slackConfig, webhookUrl: e.target.value },
                  })
                }
                placeholder="https://hooks.slack.com/services/..."
              />
            </div>
            <div className="space-y-2">
              <Label>{t('alerts.config.channel')}</Label>
              <Input
                value={slackConfig.channel || ''}
                onChange={(e) =>
                  updateConfig(index, {
                    config: { ...slackConfig, channel: e.target.value },
                  })
                }
                placeholder="#alerts"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('alerts.config.username')}</Label>
              <Input
                value={slackConfig.username || ''}
                onChange={(e) =>
                  updateConfig(index, {
                    config: { ...slackConfig, username: e.target.value },
                  })
                }
                placeholder="Oracle Monitor"
              />
            </div>
          </div>
        );

      case 'telegram':
        const telegramConfig = channelConfig as TelegramConfig;
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('alerts.config.botToken')}</Label>
              <Input
                type="password"
                value={telegramConfig.botToken}
                onChange={(e) =>
                  updateConfig(index, {
                    config: { ...telegramConfig, botToken: e.target.value },
                  })
                }
                placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('alerts.config.chatIds')}</Label>
              <Input
                value={telegramConfig.chatIds.join(', ')}
                onChange={(e) =>
                  updateConfig(index, {
                    config: {
                      ...telegramConfig,
                      chatIds: e.target.value.split(',').map((s) => s.trim()),
                    },
                  })
                }
                placeholder="-1001234567890"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('alerts.config.parseMode')}</Label>
              <select
                value={telegramConfig.parseMode}
                onChange={(e) =>
                  updateConfig(index, {
                    config: { ...telegramConfig, parseMode: e.target.value as 'HTML' | 'Markdown' },
                  })
                }
                className="bg-background w-full rounded-md border border-input px-3 py-2"
              >
                <option value="HTML">HTML</option>
                <option value="Markdown">Markdown</option>
              </select>
            </div>
          </div>
        );

      case 'pagerduty':
        const pagerdutyConfig = channelConfig as PagerDutyConfig;
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('alerts.config.integrationKey')}</Label>
              <Input
                type="password"
                value={pagerdutyConfig.integrationKey}
                onChange={(e) =>
                  updateConfig(index, {
                    config: { ...pagerdutyConfig, integrationKey: e.target.value },
                  })
                }
                placeholder="Your PagerDuty integration key"
              />
            </div>
            <div className="space-y-2">
              <Label>{t('alerts.config.severity')}</Label>
              <select
                value={pagerdutyConfig.severity}
                onChange={(e) =>
                  updateConfig(index, {
                    config: {
                      ...pagerdutyConfig,
                      severity: e.target.value as 'critical' | 'error' | 'warning' | 'info',
                    },
                  })
                }
                className="bg-background w-full rounded-md border border-input px-3 py-2"
              >
                <option value="critical">Critical</option>
                <option value="error">Error</option>
                <option value="warning">Warning</option>
                <option value="info">Info</option>
              </select>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{t('alerts.config.title')}</CardTitle>
        <CardDescription>{t('alerts.config.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {configs.map((config, index) => (
          <div key={config.name}>
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getChannelIcon(config.channel)}
                <div>
                  <h4 className="font-medium capitalize">{config.channel}</h4>
                  <p className="text-sm text-muted-foreground">{config.name}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={config.enabled}
                  onCheckedChange={(checked) => updateConfig(index, { enabled: checked })}
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest(config.name)}
                  disabled={testing === config.name || !config.enabled}
                >
                  {testing === config.name ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <TestTube className="h-4 w-4" />
                  )}
                  <span className="ml-2">{t('alerts.config.test')}</span>
                </Button>
              </div>
            </div>

            {config.enabled && <div className="pl-8">{renderConfigFields(config, index)}</div>}

            {errors[config.name] && (
              <Alert variant="destructive" className="mt-4">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{errors[config.name]}</AlertDescription>
              </Alert>
            )}

            {index < configs.length - 1 && <Separator className="mt-6" />}
          </div>
        ))}

        <div className="flex justify-end pt-4">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            {t('alerts.config.save')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
