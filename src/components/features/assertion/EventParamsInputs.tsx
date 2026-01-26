'use client';

import { Input } from '@/components/ui/input';
import type { AlertRule } from '@/lib/types/oracleTypes';

interface EventParamsInputsProps {
  rule: AlertRule;
  onPatchRuleParams: (id: string, patch: Record<string, unknown>) => void;
  t: (key: string) => string;
}

export function EventParamsInputs({ rule, onPatchRuleParams, t }: EventParamsInputsProps) {
  switch (rule.event) {
    case 'stale_sync':
      return (
        <div className="md:col-span-12">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            {t('oracle.alerts.params.maxAgeMinutes')}
          </div>
          <Input
            type="number"
            min={1}
            step={1}
            value={Math.round(
              Number((rule.params as { maxAgeMs?: unknown })?.maxAgeMs ?? 5 * 60 * 1000) / 60_000,
            )}
            onChange={(e) => {
              const minutes = Math.max(1, Math.floor(Number(e.target.value)));
              onPatchRuleParams(rule.id, { maxAgeMs: minutes * 60_000 });
            }}
            className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
          />
        </div>
      );

    case 'sync_backlog':
      return (
        <div className="md:col-span-12">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            {t('oracle.alerts.params.maxLagBlocks')}
          </div>
          <Input
            type="number"
            min={1}
            step={1}
            value={Number((rule.params as { maxLagBlocks?: unknown })?.maxLagBlocks ?? 200)}
            onChange={(e) => {
              const v = Math.max(1, Math.floor(Number(e.target.value)));
              onPatchRuleParams(rule.id, { maxLagBlocks: v });
            }}
            className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
          />
        </div>
      );

    case 'backlog_assertions':
      return (
        <div className="md:col-span-12">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            {t('oracle.alerts.params.maxOpenAssertions')}
          </div>
          <Input
            type="number"
            min={1}
            step={1}
            value={Number(
              (rule.params as { maxOpenAssertions?: unknown })?.maxOpenAssertions ?? 50,
            )}
            onChange={(e) => {
              const v = Math.max(1, Math.floor(Number(e.target.value)));
              onPatchRuleParams(rule.id, { maxOpenAssertions: v });
            }}
            className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
          />
        </div>
      );

    case 'backlog_disputes':
      return (
        <div className="md:col-span-12">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            {t('oracle.alerts.params.maxOpenDisputes')}
          </div>
          <Input
            type="number"
            min={1}
            step={1}
            value={Number((rule.params as { maxOpenDisputes?: unknown })?.maxOpenDisputes ?? 20)}
            onChange={(e) => {
              const v = Math.max(1, Math.floor(Number(e.target.value)));
              onPatchRuleParams(rule.id, { maxOpenDisputes: v });
            }}
            className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
          />
        </div>
      );

    case 'market_stale':
      return (
        <div className="md:col-span-12">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            {t('oracle.alerts.params.maxAgeMinutes')}
          </div>
          <Input
            type="number"
            min={1}
            step={1}
            value={Math.round(
              Number((rule.params as { maxAgeMs?: unknown })?.maxAgeMs ?? 6 * 60 * 60_000) / 60_000,
            )}
            onChange={(e) => {
              const minutes = Math.max(1, Math.floor(Number(e.target.value)));
              onPatchRuleParams(rule.id, { maxAgeMs: minutes * 60_000 });
            }}
            className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
          />
        </div>
      );

    case 'liveness_expiring':
      return (
        <div className="md:col-span-12">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            {t('oracle.alerts.params.withinMinutes')}
          </div>
          <Input
            type="number"
            min={1}
            step={1}
            value={Number((rule.params as { withinMinutes?: unknown })?.withinMinutes ?? 60)}
            onChange={(e) => {
              const minutes = Math.max(1, Math.floor(Number(e.target.value)));
              onPatchRuleParams(rule.id, { withinMinutes: minutes });
            }}
            className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
          />
        </div>
      );

    case 'execution_delayed':
      return (
        <div className="md:col-span-12">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            {t('oracle.alerts.params.maxDelayMinutes')}
          </div>
          <Input
            type="number"
            min={1}
            step={1}
            value={Number((rule.params as { maxDelayMinutes?: unknown })?.maxDelayMinutes ?? 30)}
            onChange={(e) => {
              const minutes = Math.max(1, Math.floor(Number(e.target.value)));
              onPatchRuleParams(rule.id, { maxDelayMinutes: minutes });
            }}
            className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
          />
        </div>
      );

    case 'low_participation':
      return (
        <>
          <div className="md:col-span-6">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              {t('oracle.alerts.params.withinMinutes')}
            </div>
            <Input
              type="number"
              min={1}
              step={1}
              value={Number((rule.params as { withinMinutes?: unknown })?.withinMinutes ?? 60)}
              onChange={(e) => {
                const minutes = Math.max(1, Math.floor(Number(e.target.value)));
                onPatchRuleParams(rule.id, { withinMinutes: minutes });
              }}
              className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
            />
          </div>
          <div className="md:col-span-6">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              {t('oracle.alerts.params.minTotalVotes')}
            </div>
            <Input
              type="number"
              min={0}
              step={1}
              value={Number((rule.params as { minTotalVotes?: unknown })?.minTotalVotes ?? 1)}
              onChange={(e) => {
                const v = Math.max(0, Math.floor(Number(e.target.value)));
                onPatchRuleParams(rule.id, { minTotalVotes: v });
              }}
              className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
            />
          </div>
        </>
      );

    case 'high_vote_divergence':
      return (
        <>
          <div className="md:col-span-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              {t('oracle.alerts.params.withinMinutes')}
            </div>
            <Input
              type="number"
              min={1}
              step={1}
              value={Number((rule.params as { withinMinutes?: unknown })?.withinMinutes ?? 15)}
              onChange={(e) => {
                const minutes = Math.max(1, Math.floor(Number(e.target.value)));
                onPatchRuleParams(rule.id, { withinMinutes: minutes });
              }}
              className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
            />
          </div>
          <div className="md:col-span-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              {t('oracle.alerts.params.minTotalVotes')}
            </div>
            <Input
              type="number"
              min={1}
              step={1}
              value={Number((rule.params as { minTotalVotes?: unknown })?.minTotalVotes ?? 10)}
              onChange={(e) => {
                const v = Math.max(1, Math.floor(Number(e.target.value)));
                onPatchRuleParams(rule.id, { minTotalVotes: v });
              }}
              className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
            />
          </div>
          <div className="md:col-span-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              {t('oracle.alerts.params.maxMarginPercent')}
            </div>
            <Input
              type="number"
              min={1}
              max={100}
              step={1}
              value={Number((rule.params as { maxMarginPercent?: unknown })?.maxMarginPercent ?? 5)}
              onChange={(e) => {
                const v = Math.max(1, Math.min(100, Math.floor(Number(e.target.value))));
                onPatchRuleParams(rule.id, { maxMarginPercent: v });
              }}
              className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
            />
          </div>
        </>
      );

    case 'high_dispute_rate':
      return (
        <>
          <div className="md:col-span-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              {t('oracle.alerts.params.windowDays')}
            </div>
            <Input
              type="number"
              min={1}
              step={1}
              value={Number((rule.params as { windowDays?: unknown })?.windowDays ?? 7)}
              onChange={(e) => {
                const v = Math.max(1, Math.floor(Number(e.target.value)));
                onPatchRuleParams(rule.id, { windowDays: v });
              }}
              className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
            />
          </div>
          <div className="md:col-span-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              {t('oracle.alerts.params.minAssertions')}
            </div>
            <Input
              type="number"
              min={1}
              step={1}
              value={Number((rule.params as { minAssertions?: unknown })?.minAssertions ?? 20)}
              onChange={(e) => {
                const v = Math.max(1, Math.floor(Number(e.target.value)));
                onPatchRuleParams(rule.id, { minAssertions: v });
              }}
              className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
            />
          </div>
          <div className="md:col-span-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              {t('oracle.alerts.params.thresholdPercent')}
            </div>
            <Input
              type="number"
              min={1}
              max={100}
              step={1}
              value={Number(
                (rule.params as { thresholdPercent?: unknown })?.thresholdPercent ?? 10,
              )}
              onChange={(e) => {
                const v = Math.max(1, Math.min(100, Math.floor(Number(e.target.value))));
                onPatchRuleParams(rule.id, { thresholdPercent: v });
              }}
              className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
            />
          </div>
        </>
      );

    case 'slow_api_request':
      return (
        <div className="md:col-span-12">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            {t('oracle.alerts.params.thresholdMs')}
          </div>
          <Input
            type="number"
            min={50}
            step={50}
            value={Number((rule.params as { thresholdMs?: unknown })?.thresholdMs ?? 1000)}
            onChange={(e) => {
              const ms = Math.max(50, Math.floor(Number(e.target.value)));
              onPatchRuleParams(rule.id, { thresholdMs: ms });
            }}
            className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
          />
        </div>
      );

    case 'high_error_rate':
      return (
        <>
          <div className="md:col-span-6">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              {t('oracle.alerts.params.thresholdPercent')}
            </div>
            <Input
              type="number"
              min={1}
              max={100}
              step={1}
              value={Number((rule.params as { thresholdPercent?: unknown })?.thresholdPercent ?? 5)}
              onChange={(e) => {
                const v = Math.max(1, Math.min(100, Math.floor(Number(e.target.value))));
                onPatchRuleParams(rule.id, { thresholdPercent: v });
              }}
              className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
            />
          </div>
          <div className="md:col-span-6">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              {t('oracle.alerts.params.windowMinutes')}
            </div>
            <Input
              type="number"
              min={1}
              step={1}
              value={Number((rule.params as { windowMinutes?: unknown })?.windowMinutes ?? 5)}
              onChange={(e) => {
                const v = Math.max(1, Math.floor(Number(e.target.value)));
                onPatchRuleParams(rule.id, { windowMinutes: v });
              }}
              className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
            />
          </div>
        </>
      );

    case 'database_slow_query':
      return (
        <div className="md:col-span-12">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            {t('oracle.alerts.params.thresholdMs')}
          </div>
          <Input
            type="number"
            min={10}
            step={10}
            value={Number((rule.params as { thresholdMs?: unknown })?.thresholdMs ?? 200)}
            onChange={(e) => {
              const ms = Math.max(10, Math.floor(Number(e.target.value)));
              onPatchRuleParams(rule.id, { thresholdMs: ms });
            }}
            className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
          />
        </div>
      );

    case 'price_deviation':
      return (
        <div className="md:col-span-12">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            {t('oracle.alerts.params.priceDeviationThreshold')}
          </div>
          <Input
            type="number"
            min={0.1}
            step={0.1}
            value={Number((rule.params as { thresholdPercent?: unknown })?.thresholdPercent ?? 2)}
            onChange={(e) => {
              const v = Math.max(0.1, Number(e.target.value));
              onPatchRuleParams(rule.id, { thresholdPercent: v });
            }}
            className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
          />
        </div>
      );

    case 'low_gas':
      return (
        <div className="md:col-span-12">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
            {t('oracle.alerts.params.minBalanceEth')}
          </div>
          <Input
            type="number"
            min={0.01}
            step={0.01}
            value={Number((rule.params as { minBalanceEth?: unknown })?.minBalanceEth ?? 0.1)}
            onChange={(e) => {
              const v = Math.max(0.001, Number(e.target.value));
              onPatchRuleParams(rule.id, { minBalanceEth: v });
            }}
            className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
          />
        </div>
      );

    default:
      return null;
  }
}
