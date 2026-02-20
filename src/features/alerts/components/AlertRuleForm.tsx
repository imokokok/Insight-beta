'use client';

import { useState, useEffect } from 'react';

import { X, Plus, Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useI18n } from '@/i18n';
import { SUPPORTED_CHAINS } from '@/types/chains';
import type { AlertRule, AlertEvent, AlertSeverity } from '@/types/oracle/alert';
import { ORACLE_PROTOCOLS } from '@/types/oracle/protocol';

import type { CreateAlertRuleInput } from '../hooks/useAlertRules';

interface AlertRuleFormProps {
  rule?: AlertRule | null;
  onSubmit: (input: CreateAlertRuleInput) => Promise<boolean>;
  onCancel: () => void;
}

const ALERT_EVENTS: AlertEvent[] = [
  'price_deviation',
  'price_stale',
  'price_volatility_spike',
  'price_update_failed',
  'assertion_created',
  'assertion_expiring',
  'assertion_disputed',
  'assertion_settled',
  'dispute_created',
  'dispute_resolved',
  'voting_period_ending',
  'sync_error',
  'sync_stale',
  'rpc_failure',
  'contract_error',
  'high_latency',
  'low_uptime',
  'rate_limit_hit',
  'liveness_expiring',
  'contract_paused',
  'sync_backlog',
  'backlog_assertions',
  'backlog_disputes',
  'market_stale',
  'execution_delayed',
  'low_participation',
  'high_vote_divergence',
  'high_dispute_rate',
  'slow_api_request',
  'high_error_rate',
  'database_slow_query',
  'low_gas',
];

const ALERT_SEVERITIES: AlertSeverity[] = ['info', 'warning', 'critical'];

const NOTIFICATION_CHANNELS = [
  { id: 'webhook', label: 'Webhook' },
  { id: 'email', label: 'Email' },
  { id: 'telegram', label: 'Telegram' },
  { id: 'slack', label: 'Slack' },
  { id: 'pagerduty', label: 'PagerDuty' },
] as const;

export function AlertRuleForm({ rule, onSubmit, onCancel }: AlertRuleFormProps) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateAlertRuleInput>({
    name: '',
    enabled: true,
    event: 'price_deviation',
    severity: 'warning',
    protocols: [],
    chains: [],
    instances: [],
    symbols: [],
    params: {},
    channels: ['webhook'],
    recipients: [],
    cooldownMinutes: 5,
    maxNotificationsPerHour: 10,
    runbook: '',
    owner: '',
  });

  const [newSymbol, setNewSymbol] = useState('');
  const [newRecipient, setNewRecipient] = useState('');

  useEffect(() => {
    if (rule) {
      setFormData({
        name: rule.name,
        enabled: rule.enabled,
        event: rule.event,
        severity: rule.severity,
        protocols: rule.protocols || [],
        chains: rule.chains || [],
        instances: rule.instances || [],
        symbols: rule.symbols || [],
        params: rule.params || {},
        channels: rule.channels || ['webhook'],
        recipients: rule.recipients || [],
        cooldownMinutes: rule.cooldownMinutes || 5,
        maxNotificationsPerHour: rule.maxNotificationsPerHour || 10,
        runbook: rule.runbook || '',
        owner: rule.owner || '',
      });
    }
  }, [rule]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await onSubmit(formData);
    setLoading(false);
  };

  const toggleProtocol = (protocol: string) => {
    setFormData((prev) => ({
      ...prev,
      protocols: prev.protocols?.includes(protocol as never)
        ? prev.protocols.filter((p) => p !== protocol)
        : [...(prev.protocols || []), protocol as never],
    }));
  };

  const toggleChain = (chain: string) => {
    setFormData((prev) => ({
      ...prev,
      chains: prev.chains?.includes(chain as never)
        ? prev.chains.filter((c) => c !== chain)
        : [...(prev.chains || []), chain as never],
    }));
  };

  const toggleChannel = (channel: string) => {
    setFormData((prev) => ({
      ...prev,
      channels: prev.channels?.includes(channel as never)
        ? prev.channels.filter((c) => c !== channel)
        : [...(prev.channels || []), channel as never],
    }));
  };

  const addSymbol = () => {
    if (newSymbol && !formData.symbols?.includes(newSymbol.toUpperCase())) {
      setFormData((prev) => ({
        ...prev,
        symbols: [...(prev.symbols || []), newSymbol.toUpperCase()],
      }));
      setNewSymbol('');
    }
  };

  const removeSymbol = (symbol: string) => {
    setFormData((prev) => ({
      ...prev,
      symbols: prev.symbols?.filter((s) => s !== symbol) || [],
    }));
  };

  const addRecipient = () => {
    if (newRecipient && !formData.recipients?.includes(newRecipient)) {
      setFormData((prev) => ({
        ...prev,
        recipients: [...(prev.recipients || []), newRecipient],
      }));
      setNewRecipient('');
    }
  };

  const removeRecipient = (recipient: string) => {
    setFormData((prev) => ({
      ...prev,
      recipients: prev.recipients?.filter((r) => r !== recipient) || [],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <h2 className="text-xl font-semibold">
          {rule ? t('alerts.rules.editRule') : t('alerts.rules.createRule')}
        </h2>
        <Button type="button" variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="name">{t('alerts.rules.ruleName')}</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={t('alerts.rules.ruleNamePlaceholder')}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t('alerts.rules.event')}</Label>
            <Select
              value={formData.event}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, event: value as AlertEvent }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALERT_EVENTS.map((event) => (
                  <SelectItem key={event} value={event}>
                    {event.replace(/_/g, ' ')}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>{t('alerts.rules.severity')}</Label>
            <Select
              value={formData.severity}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, severity: value as AlertSeverity }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALERT_SEVERITIES.map((severity) => (
                  <SelectItem key={severity} value={severity}>
                    {severity}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-2">
          <Label>{t('alerts.rules.protocols')}</Label>
          <div className="flex flex-wrap gap-2">
            {ORACLE_PROTOCOLS.map((protocol) => (
              <Badge
                key={protocol}
                variant={formData.protocols?.includes(protocol) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleProtocol(protocol)}
              >
                {protocol}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t('alerts.rules.protocolsHint')}</p>
        </div>

        <div className="grid gap-2">
          <Label>{t('alerts.rules.chains')}</Label>
          <div className="flex flex-wrap gap-2">
            {SUPPORTED_CHAINS.map((chain) => (
              <Badge
                key={chain.id}
                variant={formData.chains?.includes(chain.id as never) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleChain(chain.id)}
              >
                {chain.icon} {chain.name}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{t('alerts.rules.chainsHint')}</p>
        </div>

        <div className="grid gap-2">
          <Label>{t('alerts.rules.symbols')}</Label>
          <div className="flex gap-2">
            <Input
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value.toUpperCase())}
              placeholder={t('alerts.rules.symbolPlaceholder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addSymbol();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addSymbol}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.symbols?.map((symbol) => (
              <Badge key={symbol} variant="secondary" className="gap-1">
                {symbol}
                <X className="h-3 w-3 cursor-pointer" onClick={() => removeSymbol(symbol)} />
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label>{t('alerts.rules.channels')}</Label>
          <div className="flex flex-wrap gap-2">
            {NOTIFICATION_CHANNELS.map((channel) => (
              <Badge
                key={channel.id}
                variant={formData.channels?.includes(channel.id as never) ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => toggleChannel(channel.id)}
              >
                {channel.label}
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-2">
          <Label>{t('alerts.rules.recipients')}</Label>
          <div className="flex gap-2">
            <Input
              value={newRecipient}
              onChange={(e) => setNewRecipient(e.target.value)}
              placeholder={t('alerts.rules.recipientPlaceholder')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addRecipient();
                }
              }}
            />
            <Button type="button" variant="outline" onClick={addRecipient}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.recipients?.map((recipient) => (
              <Badge key={recipient} variant="secondary" className="gap-1">
                {recipient}
                <X className="h-3 w-3 cursor-pointer" onClick={() => removeRecipient(recipient)} />
              </Badge>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label>{t('alerts.rules.cooldownMinutes')}</Label>
            <Input
              type="number"
              min={1}
              value={formData.cooldownMinutes}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  cooldownMinutes: parseInt(e.target.value) || 5,
                }))
              }
            />
          </div>

          <div className="grid gap-2">
            <Label>{t('alerts.rules.maxNotificationsPerHour')}</Label>
            <Input
              type="number"
              min={1}
              value={formData.maxNotificationsPerHour}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  maxNotificationsPerHour: parseInt(e.target.value) || 10,
                }))
              }
            />
          </div>
        </div>

        <div className="grid gap-2">
          <Label>{t('alerts.rules.runbook')}</Label>
          <Input
            value={formData.runbook || ''}
            onChange={(e) => setFormData((prev) => ({ ...prev, runbook: e.target.value }))}
            placeholder={t('alerts.rules.runbookPlaceholder')}
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 border-t pt-4">
        <Button type="button" variant="outline" onClick={onCancel} disabled={loading}>
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={loading || !formData.name}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {loading ? t('common.saving') : rule ? t('common.update') : t('common.create')}
        </Button>
      </div>
    </form>
  );
}
