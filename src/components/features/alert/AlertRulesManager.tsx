'use client';

import { useEffect, useMemo, useState } from 'react';

import { AlertTriangle, Bell, Loader2, Save, ShieldAlert } from 'lucide-react';
import useSWR from 'swr';

import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/toast';
import { useAdminSession } from '@/hooks';
import { useI18n } from '@/i18n/LanguageProvider';
import type { AlertRule } from '@/lib/types/oracleTypes';
import { cn, fetchApiData, getErrorCode } from '@/lib/utils';

import { AlertRuleCard } from './AlertRuleComponents';
import { validateAlertRule, normalizeChannels } from './AlertRules/alertValidation';

export type Channel = 'webhook' | 'email' | 'telegram';

export function AlertRulesManager({
  showAdminActorInput = true,
  showAdminTokenInput = true,
  showTitle = true,
}: {
  showTitle?: boolean;
  showAdminTokenInput?: boolean;
  showAdminActorInput?: boolean;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const {
    adminActor,
    adminToken,
    canAdmin,
    headers: adminHeaders,
    setAdminActor,
    setAdminToken,
  } = useAdminSession({ actor: true });
  const [localRules, setLocalRules] = useState<AlertRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const trimmedToken = adminToken.trim();
  const swrKey = canAdmin ? (['/api/oracle/alert-rules', trimmedToken] as const) : null;
  const { data, error, isLoading, mutate } = useSWR<{ rules: AlertRule[] }>(
    swrKey,
    async (key: readonly [string, string]) => {
      const [url, token] = key;
      return await fetchApiData<{ rules: AlertRule[] }>(url, {
        headers: {
          'x-admin-token': token,
        },
      });
    },
  );
  const loadErrorCode = error ? getErrorCode(error) : null;

  const handleToggle = (id: string, enabled: boolean) => {
    setLocalRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled } : r)));
    setHasChanges(true);
  };

  const patchRule = async (id: string, patch: Partial<AlertRule>) => {
    setLocalRules((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setHasChanges(true);
  };

  const patchRuleParams = (id: string, patch: Record<string, unknown>) => {
    setLocalRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, params: { ...(r.params ?? {}), ...patch } } : r)),
    );
    setHasChanges(true);
  };

  const { derivedById, firstBlockingRuleError } = useMemo(() => {
    const derivedById = new Map<
      string,
      {
        channels: Channel[];
        error: string | null;
      }
    >();

    let firstBlockingRuleError: { id: string; message: string } | null = null;

    for (const rule of localRules) {
      const channels = normalizeChannels(rule.channels);
      const error = rule.enabled ? validateAlertRule(rule, channels, t) : null;
      if (!firstBlockingRuleError && rule.enabled && error) {
        firstBlockingRuleError = { id: rule.id, message: error };
      }
      derivedById.set(rule.id, { channels, error });
    }

    return { derivedById, firstBlockingRuleError };
  }, [localRules, t]);

  const toggleChannel = (id: string, channel: Channel, enabled: boolean) => {
    setLocalRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const curr = normalizeChannels(r.channels);
        const next = enabled
          ? Array.from(new Set([...curr, channel]))
          : curr.filter((c) => c !== channel);
        const safe: Channel[] = next.length > 0 ? next : ['webhook'];
        return { ...r, channels: safe };
      }),
    );
    setHasChanges(true);
  };

  const saveConfig = async () => {
    const trimmedToken = adminToken.trim();
    if (!trimmedToken) {
      toast({
        message: t('errors.forbidden'),
        title: t('oracle.alerts.error'),
        type: 'error',
      });
      return;
    }

    if (firstBlockingRuleError) {
      toast({
        message: `${firstBlockingRuleError.id}: ${firstBlockingRuleError.message}`,
        title: t('oracle.alerts.error'),
        type: 'error',
      });
      return;
    }

    setSaving(true);
    try {
      await fetchApiData('/api/oracle/alert-rules', {
        body: JSON.stringify({
          rules: localRules.map((r) => {
            const derived = derivedById.get(r.id);
            return {
              ...r,
              channels: derived?.channels ?? normalizeChannels(r.channels),
              owner: r.owner && r.owner.trim() ? r.owner.trim() : null,
              recipient: r.recipient && r.recipient.trim() ? r.recipient.trim() : null,
              runbook: r.runbook && r.runbook.trim() ? r.runbook.trim() : null,
              silencedUntil:
                r.silencedUntil && r.silencedUntil.trim() ? r.silencedUntil.trim() : null,
            };
          }),
        }),
        headers: { 'content-type': 'application/json', ...adminHeaders },
        method: 'PUT',
      });

      await mutate();
      toast({
        title: t('oracle.alerts.success'),
        type: 'success',
      });
      setHasChanges(false);
    } catch (error: unknown) {
      const code = getErrorCode(error);
      toast({
        message: code === 'forbidden' ? t('errors.forbidden') : t('errors.apiError'),
        title: t('oracle.alerts.error'),
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async (ruleId: string) => {
    const trimmedToken = adminToken.trim();
    if (!trimmedToken) {
      toast({
        message: t('errors.forbidden'),
        title: t('oracle.alerts.error'),
        type: 'error',
      });
      return;
    }

    setTestingRuleId(ruleId);
    try {
      await fetchApiData('/api/oracle/alert-rules', {
        body: JSON.stringify({ ruleId }),
        headers: {
          'content-type': 'application/json',
          ...adminHeaders,
        },
        method: 'POST',
      });
      toast({
        title: t('oracle.alerts.testSent'),
        type: 'success',
      });
    } catch (error: unknown) {
      const code = getErrorCode(error);
      toast({
        message: code === 'forbidden' ? t('errors.forbidden') : t('oracle.alerts.testFailed'),
        title: t('oracle.alerts.error'),
        type: 'error',
      });
    } finally {
      setTestingRuleId(null);
    }
  };

  useEffect(() => {
    if (!data?.rules) return;
    setLocalRules(data.rules);
    setHasChanges(false);
  }, [data]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-20">
      <main className={cn(showTitle ? 'container mx-auto px-4 py-8' : '')}>
        <div
          className={cn(
            'glass-card rounded-2xl border border-white/60 p-6 shadow-xl shadow-purple-500/5 md:p-8',
            !showTitle && 'bg-white/60',
          )}
        >
          {showTitle ? (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900">{t('oracle.alerts.title')}</h2>
              <p className="mt-1 text-sm text-gray-500">{t('oracle.alerts.description')}</p>
            </div>
          ) : null}

          <div className="mb-8 flex items-center justify-between gap-4">
            <div className="min-w-0">
              {showAdminTokenInput ? (
                <>
                  <div className="text-sm font-semibold text-gray-700">
                    {t('alerts.adminToken')}
                  </div>
                  <div className="text-xs text-gray-500">{t('alerts.adminTokenHint')}</div>
                </>
              ) : (
                <div className="text-sm font-semibold text-gray-700">{t('alerts.rules')}</div>
              )}
            </div>

            <button
              onClick={saveConfig}
              disabled={!canAdmin || !hasChanges || saving || Boolean(firstBlockingRuleError)}
              className={cn(
                'flex items-center gap-2 rounded-xl px-6 py-2.5 font-bold shadow-lg transition-all',
                canAdmin && hasChanges && !saving && !firstBlockingRuleError
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:-translate-y-0.5 hover:shadow-purple-500/25'
                  : 'cursor-not-allowed bg-gray-100 text-gray-400 shadow-none',
              )}
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
              <span>{saving ? t('oracle.alerts.saving') : t('oracle.alerts.save')}</span>
            </button>
          </div>

          {showAdminTokenInput ? (
            <div className="mb-8 grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-gray-700">{t('alerts.adminToken')}</div>
                {!canAdmin ? (
                  <div className="rounded-lg border border-amber-100 bg-amber-50/70 px-2 py-1 text-xs font-semibold text-amber-700">
                    {t('alerts.adminTokenWarning')}
                  </div>
                ) : null}
              </div>
              <Input
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder={t('audit.adminTokenPlaceholder')}
                className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
              />
            </div>
          ) : null}

          {showAdminActorInput ? (
            <div className="mb-8 grid gap-2">
              <div className="text-sm font-semibold text-gray-700">{t('alerts.adminActor')}</div>
              <Input
                value={adminActor}
                onChange={(e) => setAdminActor(e.target.value)}
                placeholder={t('alerts.adminActorPlaceholder')}
                className="h-10 rounded-xl border-transparent bg-white/70 ring-1 ring-black/5 focus-visible:ring-2 focus-visible:ring-purple-500/20"
              />
            </div>
          ) : null}

          {!canAdmin ? (
            <div className="rounded-xl border border-gray-100 bg-gray-50 p-8 text-center text-gray-500">
              <ShieldAlert className="mx-auto mb-2" size={32} />
              <p>{t('alerts.adminTokenWarning')}</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-50" />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-100 bg-red-50 p-8 text-center text-red-500">
              <AlertTriangle className="mx-auto mb-2" size={32} />
              <p>{loadErrorCode === 'forbidden' ? t('errors.forbidden') : t('errors.apiError')}</p>
            </div>
          ) : localRules.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 p-12 text-center text-gray-400">
              <Bell className="mx-auto mb-3 opacity-20" size={48} />
              <p>{t('oracle.alerts.noRules')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {localRules.map((rule) => {
                const derived = derivedById.get(rule.id);
                const channels = derived?.channels ?? normalizeChannels(rule.channels);
                const ruleError = rule.enabled ? (derived?.error ?? null) : null;
                const isTesting = testingRuleId === rule.id;

                return (
                  <AlertRuleCard
                    key={rule.id}
                    rule={rule}
                    channels={channels}
                    ruleError={ruleError}
                    isTesting={isTesting}
                    canAdmin={canAdmin}
                    onToggle={handleToggle}
                    onPatchRule={patchRule}
                    onPatchRuleParams={patchRuleParams}
                    onToggleChannel={toggleChannel}
                    onTest={sendTest}
                    t={t as (key: string) => string}
                  />
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
