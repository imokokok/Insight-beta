'use client';

import { useState } from 'react';

import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';

import { RecipientInput } from '@/components/common/RecipientInput';
import { CommonParamsInputs } from '@/components/features/assertion/CommonParamsInputs';
import { EventParamsInputs } from '@/components/features/assertion/EventParamsInputs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/shared/utils';
import type { AlertRule, AlertSeverity } from '@/types/oracleTypes';

import type { Channel } from './AlertRulesManager';

// ============================================================================
// Types
// ============================================================================

interface AlertRuleHeaderProps {
  rule: AlertRule;
  isTesting: boolean;
  canAdmin: boolean;
  ruleError: string | null;
  onToggle: (id: string, enabled: boolean) => void;
  onTest: (ruleId: string) => void;
  t: (key: string) => string;
}

interface AlertRuleBasicFieldsProps {
  rule: AlertRule;
  onPatchRule: (id: string, patch: Partial<AlertRule>) => void;
  t: (key: string) => string;
}

interface ChannelSwitchesProps {
  ruleId: string;
  channels: Channel[];
  onToggleChannel: (id: string, channel: Channel, enabled: boolean) => void;
  t: (key: string) => string;
}

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

// ============================================================================
// Helper Functions
// ============================================================================

function getSeverityIcon(severity: AlertSeverity) {
  switch (severity) {
    case 'critical':
      return <ShieldAlert className="text-rose-500" size={18} />;
    case 'warning':
      return <AlertTriangle className="text-amber-500" size={18} />;
    default:
      return <Info className="text-blue-500" size={18} />;
  }
}

function getSeverityLabel(severity: AlertSeverity, t: (key: string) => string) {
  switch (severity) {
    case 'critical':
      return t('oracle.alerts.severities.critical');
    case 'warning':
      return t('oracle.alerts.severities.warning');
    default:
      return t('oracle.alerts.severities.info');
  }
}

function getSeverityBg(severity: AlertSeverity) {
  switch (severity) {
    case 'critical':
      return 'bg-rose-50 text-rose-700 ring-rose-500/20';
    case 'warning':
      return 'bg-amber-50 text-amber-700 ring-amber-500/20';
    default:
      return 'bg-blue-50 text-blue-700 ring-blue-500/20';
  }
}

function getEventLabel(event: AlertRule['event'], t: (key: string) => string) {
  const eventMap: Record<string, string> = {
    dispute_created: 'oracle.alerts.events.dispute_created',
    contract_paused: 'oracle.alerts.events.contract_paused',
    sync_error: 'oracle.alerts.events.sync_error',
    stale_sync: 'oracle.alerts.events.stale_sync',
    sync_backlog: 'oracle.alerts.events.sync_backlog',
    backlog_assertions: 'oracle.alerts.events.backlog_assertions',
    backlog_disputes: 'oracle.alerts.events.backlog_disputes',
    market_stale: 'oracle.alerts.events.market_stale',
    execution_delayed: 'oracle.alerts.events.execution_delayed',
    low_participation: 'oracle.alerts.events.low_participation',
    high_vote_divergence: 'oracle.alerts.events.high_vote_divergence',
    high_dispute_rate: 'oracle.alerts.events.high_dispute_rate',
    slow_api_request: 'oracle.alerts.events.slow_api_request',
    high_error_rate: 'oracle.alerts.events.high_error_rate',
    database_slow_query: 'oracle.alerts.events.database_slow_query',
    liveness_expiring: 'oracle.alerts.events.liveness_expiring',
    price_deviation: 'oracle.alerts.events.price_deviation',
    low_gas: 'oracle.alerts.events.low_gas',
  };
  return t(eventMap[event] || event);
}

// ============================================================================
// Sub-components
// ============================================================================

export function AlertRuleHeader({
  rule,
  isTesting,
  canAdmin,
  ruleError,
  onToggle,
  onTest,
  t,
}: AlertRuleHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex min-w-0 items-start gap-4">
        <div className={cn('rounded-lg p-3 ring-1 ring-inset', getSeverityBg(rule.severity))}>
          {getSeverityIcon(rule.severity)}
        </div>

        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-3">
            <h3 className="truncate font-bold text-gray-900">{rule.name}</h3>
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset',
                getSeverityBg(rule.severity),
              )}
            >
              {getSeverityLabel(rule.severity, t)}
            </span>
          </div>
          <p className="font-mono text-sm text-gray-500">
            {t('oracle.alerts.ruleId')}: {rule.id} • {t('oracle.alerts.event')}:{' '}
            {getEventLabel(rule.event, t)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onTest(rule.id)}
          disabled={!canAdmin || Boolean(ruleError) || isTesting}
          className={cn(
            'hidden items-center justify-center rounded-xl px-4 py-2 text-sm font-bold ring-1 ring-inset transition-all sm:inline-flex',
            canAdmin && !ruleError && !isTesting
              ? 'text-primary-dark ring-primary200 bg-white/70 hover:bg-white'
              : 'cursor-not-allowed bg-gray-50 text-gray-400 ring-gray-200',
          )}
        >
          {isTesting ? t('oracle.alerts.testSending') : t('oracle.alerts.testSend')}
        </button>

        <Switch
          checked={rule.enabled}
          onCheckedChange={(checked) => onToggle(rule.id, checked)}
          className={cn('data-[state=checked]:bg-primary', 'h-7 w-12')}
        />
      </div>
    </div>
  );
}

export function AlertRuleBasicFields({ rule, onPatchRule, t }: AlertRuleBasicFieldsProps) {
  const [ownerError, setOwnerError] = useState(false);

  const validateOwner = (value: string) => {
    if (!value) {
      setOwnerError(false);
      return true;
    }
    try {
      new URL(value);
      setOwnerError(false);
      return true;
    } catch {
      setOwnerError(true);
      return false;
    }
  };

  return (
    <>
      <div className="md:col-span-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
          {t('oracle.alerts.severity')}
        </div>
        <select
          value={rule.severity}
          onChange={(e) => onPatchRule(rule.id, { severity: e.target.value as AlertSeverity })}
          className="focus:ring-primary500/20 h-10 w-full rounded-xl bg-white/70 px-3 text-sm ring-1 ring-black/5 focus:outline-none focus:ring-2"
        >
          <option value="info">{t('oracle.alerts.severities.info')}</option>
          <option value="warning">{t('oracle.alerts.severities.warning')}</option>
          <option value="critical">{t('oracle.alerts.severities.critical')}</option>
        </select>
      </div>

      <div className="md:col-span-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
          {t('oracle.alerts.owner')}
        </div>
        <Input
          value={rule.owner ?? ''}
          onChange={(e) => {
            const value = e.target.value.slice(0, 80);
            onPatchRule(rule.id, { owner: value });
            validateOwner(value);
          }}
          onBlur={(e) => validateOwner(e.target.value)}
          placeholder={t('oracle.alerts.ownerPlaceholder')}
          maxLength={80}
          className={`focus-visible:ring-primary500/20 h-10 rounded-xl border-transparent bg-white/70 ring-1 focus-visible:ring-2 ${
            ownerError ? 'ring-red-500' : 'ring-black/5'
          }`}
        />
        {ownerError && <p className="mt-1 text-xs text-red-500">Invalid URL format</p>}
      </div>

      <div className="md:col-span-4">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
          {t('oracle.alerts.runbook')}
        </div>
        <Input
          value={rule.runbook ?? ''}
          onChange={(e) => onPatchRule(rule.id, { runbook: e.target.value.slice(0, 500) })}
          placeholder={t('oracle.alerts.runbookPlaceholder')}
          maxLength={500}
          className="focus-visible:ring-primary500/20 h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2"
        />
      </div>
    </>
  );
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
        className={cn('data-[state=checked]:bg-primary', 'h-6 w-11')}
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

// ============================================================================
// Main Component
// ============================================================================

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
          ? 'border-primary/10 bg-white shadow-sm hover:border-primary/20 hover:shadow-md hover:shadow-primary-500/5'
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
