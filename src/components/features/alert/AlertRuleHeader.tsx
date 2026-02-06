'use client';

import { AlertTriangle, Info, ShieldAlert } from 'lucide-react';

import { Switch } from '@/components/ui/switch';
import type { AlertRule, AlertSeverity } from '@/lib/types/oracleTypes';
import { cn } from '@/lib/utils';

interface AlertRuleHeaderProps {
  rule: AlertRule;
  isTesting: boolean;
  canAdmin: boolean;
  ruleError: string | null;
  onToggle: (id: string, enabled: boolean) => void;
  onTest: (ruleId: string) => void;
  t: (key: string) => string;
}

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
  if (event === 'dispute_created') return t('oracle.alerts.events.dispute_created');
  if (event === 'contract_paused') return t('oracle.alerts.events.contract_paused');
  if (event === 'sync_error') return t('oracle.alerts.events.sync_error');
  if (event === 'stale_sync') return t('oracle.alerts.events.stale_sync');
  if (event === 'sync_backlog') return t('oracle.alerts.events.sync_backlog');
  if (event === 'backlog_assertions') return t('oracle.alerts.events.backlog_assertions');
  if (event === 'backlog_disputes') return t('oracle.alerts.events.backlog_disputes');
  if (event === 'market_stale') return t('oracle.alerts.events.market_stale');
  if (event === 'execution_delayed') return t('oracle.alerts.events.execution_delayed');
  if (event === 'low_participation') return t('oracle.alerts.events.low_participation');
  if (event === 'high_vote_divergence') return t('oracle.alerts.events.high_vote_divergence');
  if (event === 'high_dispute_rate') return t('oracle.alerts.events.high_dispute_rate');
  if (event === 'slow_api_request') return t('oracle.alerts.events.slow_api_request');
  if (event === 'high_error_rate') return t('oracle.alerts.events.high_error_rate');
  if (event === 'database_slow_query') return t('oracle.alerts.events.database_slow_query');
  if (event === 'liveness_expiring') return t('oracle.alerts.events.liveness_expiring');
  if (event === 'price_deviation') return t('oracle.alerts.events.price_deviation');
  if (event === 'low_gas') return t('oracle.alerts.events.low_gas');
  return event;
}

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
              ? 'bg-white/70 text-purple-700 ring-purple-200 hover:bg-white'
              : 'cursor-not-allowed bg-gray-50 text-gray-400 ring-gray-200',
          )}
        >
          {isTesting ? t('oracle.alerts.testSending') : t('oracle.alerts.testSend')}
        </button>

        <Switch
          checked={rule.enabled}
          onCheckedChange={(checked) => onToggle(rule.id, checked)}
          className={cn('data-[state=checked]:bg-purple-600', 'h-7 w-12')}
        />
      </div>
    </div>
  );
}
