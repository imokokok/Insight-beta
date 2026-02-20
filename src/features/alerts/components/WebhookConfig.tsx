'use client';

import { useState, useEffect } from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useI18n } from '@/i18n';
import type { NotificationChannelConfig } from '@/types/oracle/alert';

interface WebhookConfigProps {
  config: NotificationChannelConfig;
  onChange: (config: NotificationChannelConfig) => void;
  errors?: Record<string, string>;
}

export function WebhookConfig({ config, onChange, errors }: WebhookConfigProps) {
  const { t } = useI18n();
  const [localConfig, setLocalConfig] = useState({
    url: config.url || '',
    secret: config.secret || '',
  });

  useEffect(() => {
    setLocalConfig({
      url: config.url || '',
      secret: config.secret || '',
    });
  }, [config]);

  const handleChange = (field: string, value: string) => {
    const newConfig = { ...localConfig, [field]: value };
    setLocalConfig(newConfig);
    onChange({
      url: newConfig.url,
      secret: newConfig.secret || undefined,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="webhook-url">
          {t('alerts.channels.webhookUrl')} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="webhook-url"
          type="url"
          value={localConfig.url}
          onChange={(e) => handleChange('url', e.target.value)}
          placeholder="https://hooks.example.com/webhook/..."
          className={errors?.url ? 'border-destructive' : ''}
        />
        {errors?.url && <p className="text-destructive text-xs">{errors.url}</p>}
        <p className="text-xs text-muted-foreground">{t('alerts.channels.webhookUrlHint')}</p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="webhook-secret">{t('alerts.channels.secret')}</Label>
        <Input
          id="webhook-secret"
          type="password"
          value={localConfig.secret}
          onChange={(e) => handleChange('secret', e.target.value)}
          placeholder={t('alerts.channels.secretPlaceholder')}
        />
        <p className="text-xs text-muted-foreground">{t('alerts.channels.secretHint')}</p>
      </div>
    </div>
  );
}
