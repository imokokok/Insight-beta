'use client';

import { useState, useEffect } from 'react';

import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { useI18n } from '@/i18n';
import type { NotificationChannelConfig } from '@/types/oracle/alert';

interface EmailConfigProps {
  config: NotificationChannelConfig;
  onChange: (config: NotificationChannelConfig) => void;
  errors?: Record<string, string>;
}

export function EmailConfig({ config, onChange, errors }: EmailConfigProps) {
  const { t } = useI18n();
  const [localConfig, setLocalConfig] = useState({
    email: config.email || '',
  });

  useEffect(() => {
    setLocalConfig({
      email: config.email || '',
    });
  }, [config]);

  const handleChange = (field: string, value: string) => {
    const newConfig = { ...localConfig, [field]: value };
    setLocalConfig(newConfig);
    onChange({
      email: newConfig.email,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="email-address">
          {t('alerts.channels.emailAddress')} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email-address"
          type="email"
          value={localConfig.email}
          onChange={(e) => handleChange('email', e.target.value)}
          placeholder="alerts@example.com"
          className={errors?.email ? 'border-destructive' : ''}
        />
        {errors?.email && <p className="text-destructive text-xs">{errors.email}</p>}
        <p className="text-xs text-muted-foreground">{t('alerts.channels.emailHint')}</p>
      </div>
    </div>
  );
}
