'use client';

import { CommonParamsInputs } from '@/components/features/assertion/CommonParamsInputs';
import { EventParamsInputs } from '@/components/features/assertion/EventParamsInputs';
import { RecipientInput } from '@/components/features/common/RecipientInput';
import type { AlertRule } from '@/lib/types/oracleTypes';
import { cn } from '@/lib/utils';

import { AlertRuleBasicFields } from './AlertRuleBasicFields';
import { AlertRuleHeader } from './AlertRuleHeader';
import { ChannelSwitches } from './ChannelSwitches';

import type { Channel } from './AlertRulesManager';

interface AlertRuleCardProps {
  rule: AlertRule;
  channels: Channel[];
  ruleError: string | null;
  isTesting: boolean;
  canAdmin: boolean;
  onToggle: (id: string, enabled: boolean) => void;
  onPatchRule: (id: string, patch: Partial<AlertRule>) => Promise<void>;
  onPatchRuleParams: (id: string, patch: Record<string, unknown>) => void;
  onToggleChannel: (id: string, channel: Channel, enabled: boolean) => void;
  onTest: (ruleId: string) => void;
  t: (key: string) => string;
}

export function AlertRuleCard({
  rule,
  channels,
  ruleError,
  isTesting,
  canAdmin,
  onToggle,
  onPatchRule,
  onPatchRuleParams,
  onToggleChannel,
  onTest,
  t,
}: AlertRuleCardProps) {
  return (
    <div
      className={cn(
        'group rounded-xl border p-5 transition-all duration-300',
        rule.enabled
          ? 'border-purple-100 bg-white shadow-sm hover:border-purple-200 hover:shadow-md hover:shadow-purple-500/5'
          : 'border-transparent bg-gray-50/50 opacity-75 grayscale-[0.5] hover:opacity-100',
      )}
    >
      <AlertRuleHeader
        rule={rule}
        isTesting={isTesting}
        canAdmin={canAdmin}
        ruleError={ruleError}
        onToggle={onToggle}
        onTest={onTest}
        t={t}
      />

      <div className="mt-5 grid gap-4 md:grid-cols-12">
        {rule.enabled && ruleError ? (
          <div className="text-sm font-semibold text-rose-600 md:col-span-12">{ruleError}</div>
        ) : null}

        <AlertRuleBasicFields rule={rule} onPatchRule={onPatchRule} t={t} />

        <ChannelSwitches
          ruleId={rule.id}
          channels={channels}
          onToggleChannel={onToggleChannel}
          t={t}
        />

        {channels.includes('email') && (
          <RecipientInput rule={rule} onPatchRule={onPatchRule} t={t} />
        )}

        <EventParamsInputs rule={rule} onPatchRuleParams={onPatchRuleParams} t={t} />

        <CommonParamsInputs rule={rule} onPatchRuleParams={onPatchRuleParams} t={t} />
      </div>
    </div>
  );
}
