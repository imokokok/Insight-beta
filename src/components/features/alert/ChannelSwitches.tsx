'use client';

import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import type { Channel } from './AlertRulesManager';

interface ChannelSwitchesProps {
  ruleId: string;
  channels: Channel[];
  onToggleChannel: (id: string, channel: Channel, enabled: boolean) => void;
  t: (key: string) => string;
}

function ChannelSwitch({
  ruleId,
  channel,
  checked,
  label,
  onToggle,
}: {
  ruleId: string;
  channel: Channel;
  checked: boolean;
  label: string;
  onToggle: (id: string, channel: Channel, enabled: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-white/60 px-4 py-3 ring-1 ring-black/5">
      <div className="text-sm font-semibold text-gray-800">{label}</div>
      <Switch
        checked={checked}
        onCheckedChange={(enabled) => onToggle(ruleId, channel, enabled)}
        className={cn('data-[state=checked]:bg-purple-600', 'h-6 w-11')}
      />
    </div>
  );
}

export function ChannelSwitches({ ruleId, channels, onToggleChannel, t }: ChannelSwitchesProps) {
  return (
    <>
      <div className="md:col-span-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
          {t('oracle.alerts.channelsWebhook')}
        </div>
        <ChannelSwitch
          ruleId={ruleId}
          channel="webhook"
          checked={channels.includes('webhook')}
          label={t('oracle.alerts.channelsWebhook')}
          onToggle={onToggleChannel}
        />
      </div>

      <div className="md:col-span-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
          {t('oracle.alerts.channelsEmail')}
        </div>
        <ChannelSwitch
          ruleId={ruleId}
          channel="email"
          checked={channels.includes('email')}
          label={t('oracle.alerts.channelsEmail')}
          onToggle={onToggleChannel}
        />
      </div>

      <div className="md:col-span-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
          {t('oracle.alerts.channelsTelegram')}
        </div>
        <ChannelSwitch
          ruleId={ruleId}
          channel="telegram"
          checked={channels.includes('telegram')}
          label={t('oracle.alerts.channelsTelegram')}
          onToggle={onToggleChannel}
        />
      </div>
    </>
  );
}
