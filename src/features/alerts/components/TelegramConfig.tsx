'use client';

import { useState, useEffect } from 'react';

import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { useI18n } from '@/i18n';
import type { NotificationChannelConfig } from '@/types/oracle/alert';

interface TelegramConfigProps {
  config: NotificationChannelConfig;
  onChange: (config: NotificationChannelConfig) => void;
  errors?: Record<string, string>;
}

export function TelegramConfig({ config, onChange, errors }: TelegramConfigProps) {
  const { t } = useI18n();
  const [localConfig, setLocalConfig] = useState({
    botToken: config.botToken || '',
    chatId: config.chatId || '',
  });

  useEffect(() => {
    setLocalConfig({
      botToken: config.botToken || '',
      chatId: config.chatId || '',
    });
  }, [config]);

  const handleChange = (field: string, value: string) => {
    const newConfig = { ...localConfig, [field]: value };
    setLocalConfig(newConfig);
    onChange({
      botToken: newConfig.botToken,
      chatId: newConfig.chatId,
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label htmlFor="telegram-bot-token">
          {t('alerts.channels.botToken')} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="telegram-bot-token"
          type="password"
          value={localConfig.botToken}
          onChange={(e) => handleChange('botToken', e.target.value)}
          placeholder="123456789:ABCdefGHIjklMNOpqrsTUVwxyz"
          className={errors?.botToken ? 'border-destructive' : ''}
        />
        {errors?.botToken && <p className="text-destructive text-xs">{errors.botToken}</p>}
        <p className="text-xs text-muted-foreground">{t('alerts.channels.botTokenHint')}</p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="telegram-chat-id">
          {t('alerts.channels.chatId')} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="telegram-chat-id"
          value={localConfig.chatId}
          onChange={(e) => handleChange('chatId', e.target.value)}
          placeholder="-1001234567890"
          className={errors?.chatId ? 'border-destructive' : ''}
        />
        {errors?.chatId && <p className="text-destructive text-xs">{errors.chatId}</p>}
        <p className="text-xs text-muted-foreground">{t('alerts.channels.chatIdHint')}</p>
      </div>
    </div>
  );
}
