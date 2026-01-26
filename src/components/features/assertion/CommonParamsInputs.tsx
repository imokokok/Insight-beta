'use client';

import { Input } from '@/components/ui/input';
import type { AlertRule } from '@/lib/types/oracleTypes';

interface CommonParamsInputsProps {
  rule: AlertRule;
  onPatchRuleParams: (id: string, patch: Record<string, unknown>) => void;
  t: (key: string) => string;
}

export function CommonParamsInputs({ rule, onPatchRuleParams, t }: CommonParamsInputsProps) {
  return (
    <>
      <div className="md:col-span-6">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
          {t('oracle.alerts.params.cooldownMs')}
        </div>
        <Input
          type="number"
          min={1}
          max={1440}
          step={1}
          value={Math.round(
            Number((rule.params as { cooldownMs?: unknown })?.cooldownMs ?? 5 * 60_000) / 60_000,
          )}
          onChange={(e) => {
            const minutes = Math.max(1, Math.min(1440, Math.floor(Number(e.target.value))));
            onPatchRuleParams(rule.id, { cooldownMs: minutes * 60_000 });
          }}
          className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
        />
      </div>

      <div className="md:col-span-6">
        <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
          {t('oracle.alerts.params.escalateAfterMs')}
        </div>
        <Input
          type="number"
          min={0}
          max={43200}
          step={1}
          value={Math.round(
            Number((rule.params as { escalateAfterMs?: unknown })?.escalateAfterMs ?? 0) / 60_000,
          )}
          onChange={(e) => {
            const minutes = Math.max(0, Math.min(43200, Math.floor(Number(e.target.value))));
            onPatchRuleParams(rule.id, { escalateAfterMs: minutes * 60_000 });
          }}
          className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
        />
      </div>
    </>
  );
}
