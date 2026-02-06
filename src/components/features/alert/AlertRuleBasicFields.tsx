'use client';

/* eslint-disable no-restricted-syntax */

import { Input } from '@/components/ui/input';
import type { AlertRule, AlertSeverity } from '@/lib/types/oracleTypes';
import { useState } from 'react';

interface AlertRuleBasicFieldsProps {
  rule: AlertRule;
  onPatchRule: (id: string, patch: Partial<AlertRule>) => void;
  t: (key: string) => string;
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
          className="h-10 w-full rounded-xl bg-white/70 px-3 text-sm ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
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
          className={`h-10 rounded-xl border-transparent bg-white/70 ring-1 focus-visible:ring-2 focus-visible:ring-purple-500/20 ${
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
          className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
        />
      </div>
    </>
  );
}
