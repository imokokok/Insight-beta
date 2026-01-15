"use client";

import { useCallback, useMemo, useState } from "react";
import useSWR from "swr";
import {
  AlertTriangle,
  Bell,
  Info,
  Loader2,
  Save,
  ShieldAlert,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { cn, fetchApiData, getErrorCode } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";
import type { AlertRule, AlertSeverity } from "@/lib/oracleTypes";
import { useAdminSession } from "@/hooks/useAdminSession";

type Channel = "webhook" | "email";

function normalizeChannels(
  channels: AlertRule["channels"] | undefined,
): Channel[] {
  const input = channels && channels.length > 0 ? channels : ["webhook"];
  const out: Channel[] = [];
  for (const c of input) {
    if (c !== "webhook" && c !== "email") continue;
    if (!out.includes(c)) out.push(c);
  }
  return out.length > 0 ? out : ["webhook"];
}

function isValidEmail(value: string) {
  const v = value.trim();
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

export function AlertRulesManager({
  showTitle = true,
  showAdminTokenInput = true,
  showAdminActorInput = true,
}: {
  showTitle?: boolean;
  showAdminTokenInput?: boolean;
  showAdminActorInput?: boolean;
}) {
  const { t } = useI18n();
  const { toast } = useToast();
  const {
    adminToken,
    setAdminToken,
    adminActor,
    setAdminActor,
    headers: adminHeaders,
    canAdmin,
  } = useAdminSession({ actor: true });
  const [localRules, setLocalRules] = useState<AlertRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [testingRuleId, setTestingRuleId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const trimmedToken = adminToken.trim();
  const swrKey = canAdmin
    ? (["/api/oracle/alert-rules", trimmedToken] as const)
    : null;
  const { data, error, isLoading, mutate } = useSWR<{ rules: AlertRule[] }>(
    swrKey,
    async (key: readonly [string, string]) => {
      const [url, token] = key;
      return await fetchApiData<{ rules: AlertRule[] }>(url, {
        headers: {
          "x-admin-token": token,
        },
      });
    },
  );
  const loadErrorCode = error ? getErrorCode(error) : null;

  const handleToggle = (id: string, enabled: boolean) => {
    setLocalRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled } : r)),
    );
    setHasChanges(true);
  };

  const patchRule = (id: string, patch: Partial<AlertRule>) => {
    setLocalRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    );
    setHasChanges(true);
  };

  const patchRuleParams = (id: string, patch: Record<string, unknown>) => {
    setLocalRules((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, params: { ...(r.params ?? {}), ...patch } } : r,
      ),
    );
    setHasChanges(true);
  };

  const getRuleValidationErrorMessage = useCallback(
    (rule: AlertRule, channels: Channel[]) => {
      if (channels.includes("email")) {
        const recipient = (rule.recipient ?? "").trim();
        if (!recipient)
          return t("oracle.alerts.validation.emailRecipientRequired");
        if (!isValidEmail(recipient))
          return t("oracle.alerts.validation.emailRecipientInvalid");
      }

      const params = (rule.params ?? {}) as Record<string, unknown>;
      const getNumber = (key: string) => Number(params[key]);

      if (rule.event === "stale_sync") {
        const maxAgeMs = getNumber("maxAgeMs");
        if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) {
          return t("oracle.alerts.validation.staleSyncMaxAgeMsPositive");
        }
      }

      if (rule.event === "slow_api_request") {
        const thresholdMs = getNumber("thresholdMs");
        if (!Number.isFinite(thresholdMs) || thresholdMs <= 0) {
          return t("oracle.alerts.validation.slowApiThresholdMsPositive");
        }
      }

      if (rule.event === "database_slow_query") {
        const thresholdMs = getNumber("thresholdMs");
        if (!Number.isFinite(thresholdMs) || thresholdMs <= 0) {
          return t(
            "oracle.alerts.validation.databaseSlowQueryThresholdMsPositive",
          );
        }
      }

      if (rule.event === "high_error_rate") {
        const thresholdPercent = getNumber("thresholdPercent");
        const windowMinutes = getNumber("windowMinutes");
        if (
          !Number.isFinite(thresholdPercent) ||
          thresholdPercent <= 0 ||
          thresholdPercent > 100
        ) {
          return t(
            "oracle.alerts.validation.highErrorRateThresholdPercentRange",
          );
        }
        if (!Number.isFinite(windowMinutes) || windowMinutes <= 0) {
          return t(
            "oracle.alerts.validation.highErrorRateWindowMinutesPositive",
          );
        }
      }
      return null;
    },
    [t],
  );

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
      const error = rule.enabled
        ? getRuleValidationErrorMessage(rule, channels)
        : null;
      if (!firstBlockingRuleError && rule.enabled && error) {
        firstBlockingRuleError = { id: rule.id, message: error };
      }
      derivedById.set(rule.id, { channels, error });
    }

    return { derivedById, firstBlockingRuleError };
  }, [getRuleValidationErrorMessage, localRules]);

  const toggleChannel = (id: string, channel: Channel, enabled: boolean) => {
    setLocalRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const curr = normalizeChannels(r.channels);
        const next = enabled
          ? Array.from(new Set([...curr, channel]))
          : curr.filter((c) => c !== channel);
        const safe: Channel[] = next.length > 0 ? next : ["webhook"];
        return { ...r, channels: safe };
      }),
    );
    setHasChanges(true);
  };

  const saveConfig = async () => {
    const trimmedToken = adminToken.trim();
    if (!trimmedToken) {
      toast({
        title: t("oracle.alerts.error"),
        message: t("errors.forbidden"),
        type: "error",
      });
      return;
    }

    if (firstBlockingRuleError) {
      toast({
        title: t("oracle.alerts.error"),
        message: `${firstBlockingRuleError.id}: ${firstBlockingRuleError.message}`,
        type: "error",
      });
      return;
    }

    setSaving(true);
    try {
      await fetchApiData("/api/oracle/alert-rules", {
        method: "PUT",
        headers: { "content-type": "application/json", ...adminHeaders },
        body: JSON.stringify({
          rules: localRules.map((r) => {
            const derived = derivedById.get(r.id);
            return {
              ...r,
              channels: derived?.channels ?? normalizeChannels(r.channels),
              recipient:
                r.recipient && r.recipient.trim() ? r.recipient.trim() : null,
              owner: r.owner && r.owner.trim() ? r.owner.trim() : null,
              runbook: r.runbook && r.runbook.trim() ? r.runbook.trim() : null,
              silencedUntil:
                r.silencedUntil && r.silencedUntil.trim()
                  ? r.silencedUntil.trim()
                  : null,
            };
          }),
        }),
      });

      await mutate();
      toast({
        title: t("oracle.alerts.success"),
        type: "success",
      });
      setHasChanges(false);
    } catch (e) {
      const code = getErrorCode(e);
      toast({
        title: t("oracle.alerts.error"),
        message:
          code === "forbidden" ? t("errors.forbidden") : t("errors.apiError"),
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async (ruleId: string) => {
    const trimmedToken = adminToken.trim();
    if (!trimmedToken) {
      toast({
        title: t("oracle.alerts.error"),
        message: t("errors.forbidden"),
        type: "error",
      });
      return;
    }

    setTestingRuleId(ruleId);
    try {
      await fetchApiData("/api/oracle/alert-rules", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...adminHeaders,
        },
        body: JSON.stringify({ ruleId }),
      });
      toast({
        title: t("oracle.alerts.testSent"),
        type: "success",
      });
    } catch (e) {
      const code = getErrorCode(e);
      toast({
        title: t("oracle.alerts.error"),
        message:
          code === "forbidden"
            ? t("errors.forbidden")
            : t("oracle.alerts.testFailed"),
        type: "error",
      });
    } finally {
      setTestingRuleId(null);
    }
  };

  const getEventLabel = (event: AlertRule["event"]) => {
    if (event === "dispute_created")
      return t("oracle.alerts.events.dispute_created");
    if (event === "sync_error") return t("oracle.alerts.events.sync_error");
    if (event === "stale_sync") return t("oracle.alerts.events.stale_sync");
    if (event === "slow_api_request")
      return t("oracle.alerts.events.slow_api_request");
    if (event === "high_error_rate")
      return t("oracle.alerts.events.high_error_rate");
    if (event === "database_slow_query")
      return t("oracle.alerts.events.database_slow_query");
    return event;
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case "critical":
        return <ShieldAlert className="text-rose-500" size={18} />;
      case "warning":
        return <AlertTriangle className="text-amber-500" size={18} />;
      default:
        return <Info className="text-blue-500" size={18} />;
    }
  };

  const getSeverityLabel = (severity: AlertSeverity) => {
    switch (severity) {
      case "critical":
        return t("oracle.alerts.severities.critical");
      case "warning":
        return t("oracle.alerts.severities.warning");
      default:
        return t("oracle.alerts.severities.info");
    }
  };

  const getSeverityBg = (severity: AlertSeverity) => {
    switch (severity) {
      case "critical":
        return "bg-rose-50 text-rose-700 ring-rose-500/20";
      case "warning":
        return "bg-amber-50 text-amber-700 ring-amber-500/20";
      default:
        return "bg-blue-50 text-blue-700 ring-blue-500/20";
    }
  };

  useMemo(() => {
    if (!data?.rules) return;
    setLocalRules(data.rules);
    setHasChanges(false);
  }, [data]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-20">
      <main className={cn(showTitle ? "container mx-auto px-4 py-8" : "")}>
        <div
          className={cn(
            "glass-card rounded-2xl p-6 md:p-8 border border-white/60 shadow-xl shadow-purple-500/5",
            !showTitle && "bg-white/60",
          )}
        >
          {showTitle ? (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-gray-900">
                {t("oracle.alerts.title")}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {t("oracle.alerts.description")}
              </p>
            </div>
          ) : null}

          <div className="flex items-center justify-between gap-4 mb-8">
            <div className="min-w-0">
              {showAdminTokenInput ? (
                <>
                  <div className="text-sm font-semibold text-gray-700">
                    {t("alerts.adminToken")}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t("alerts.adminTokenHint")}
                  </div>
                </>
              ) : (
                <div className="text-sm font-semibold text-gray-700">
                  {t("alerts.rules")}
                </div>
              )}
            </div>

            <button
              onClick={saveConfig}
              disabled={
                !canAdmin ||
                !hasChanges ||
                saving ||
                Boolean(firstBlockingRuleError)
              }
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg",
                canAdmin && hasChanges && !saving && !firstBlockingRuleError
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-purple-500/25 hover:-translate-y-0.5"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none",
              )}
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              <span>
                {saving ? t("oracle.alerts.saving") : t("oracle.alerts.save")}
              </span>
            </button>
          </div>

          {showAdminTokenInput ? (
            <div className="mb-8 grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-gray-700">
                  {t("alerts.adminToken")}
                </div>
                {!canAdmin ? (
                  <div className="text-xs font-semibold text-amber-700 bg-amber-50/70 border border-amber-100 rounded-lg px-2 py-1">
                    {t("alerts.adminTokenWarning")}
                  </div>
                ) : null}
              </div>
              <Input
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder={t("audit.adminTokenPlaceholder")}
                className="h-10 rounded-xl bg-white/70 ring-1 ring-black/5 border-transparent focus-visible:ring-2 focus-visible:ring-purple-500/20"
              />
            </div>
          ) : null}

          {showAdminActorInput ? (
            <div className="mb-8 grid gap-2">
              <div className="text-sm font-semibold text-gray-700">
                {t("alerts.adminActor")}
              </div>
              <Input
                value={adminActor}
                onChange={(e) => setAdminActor(e.target.value)}
                placeholder={t("alerts.adminActorPlaceholder")}
                className="h-10 rounded-xl bg-white/70 ring-1 ring-black/5 border-transparent focus-visible:ring-2 focus-visible:ring-purple-500/20"
              />
            </div>
          ) : null}

          {!canAdmin ? (
            <div className="p-8 text-center text-gray-500 bg-gray-50 rounded-xl border border-gray-100">
              <ShieldAlert className="mx-auto mb-2" size={32} />
              <p>{t("alerts.adminTokenWarning")}</p>
            </div>
          ) : isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-gray-50 animate-pulse rounded-xl"
                />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-100">
              <AlertTriangle className="mx-auto mb-2" size={32} />
              <p>
                {loadErrorCode === "forbidden"
                  ? t("errors.forbidden")
                  : t("errors.apiError")}
              </p>
            </div>
          ) : localRules.length === 0 ? (
            <div className="p-12 text-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              <Bell className="mx-auto mb-3 opacity-20" size={48} />
              <p>{t("oracle.alerts.noRules")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {localRules.map((rule) => {
                const derived = derivedById.get(rule.id);
                const channels =
                  derived?.channels ?? normalizeChannels(rule.channels);
                const ruleError = rule.enabled
                  ? (derived?.error ?? null)
                  : null;
                const isTesting = testingRuleId === rule.id;
                return (
                  <div
                    key={rule.id}
                    className={cn(
                      "group p-5 rounded-xl border transition-all duration-300",
                      rule.enabled
                        ? "bg-white border-purple-100 shadow-sm hover:border-purple-200 hover:shadow-md hover:shadow-purple-500/5"
                        : "bg-gray-50/50 border-transparent opacity-75 grayscale-[0.5] hover:opacity-100",
                    )}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        <div
                          className={cn(
                            "p-3 rounded-lg ring-1 ring-inset",
                            getSeverityBg(rule.severity),
                          )}
                        >
                          {getSeverityIcon(rule.severity)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-bold text-gray-900 truncate">
                              {rule.name}
                            </h3>
                            <span
                              className={cn(
                                "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ring-1 ring-inset",
                                getSeverityBg(rule.severity),
                              )}
                            >
                              {getSeverityLabel(rule.severity)}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500 font-mono">
                            ID: {rule.id} • {t("oracle.alerts.event")}:{" "}
                            {getEventLabel(rule.event)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => sendTest(rule.id)}
                          disabled={
                            !canAdmin || Boolean(ruleError) || isTesting
                          }
                          className={cn(
                            "hidden sm:inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-bold transition-all ring-1 ring-inset",
                            canAdmin && !ruleError && !isTesting
                              ? "bg-white/70 text-purple-700 ring-purple-200 hover:bg-white"
                              : "bg-gray-50 text-gray-400 ring-gray-200 cursor-not-allowed",
                          )}
                        >
                          {isTesting
                            ? t("oracle.alerts.testSending")
                            : t("oracle.alerts.testSend")}
                        </button>

                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(checked) =>
                            handleToggle(rule.id, checked)
                          }
                          className={cn(
                            "data-[state=checked]:bg-purple-600",
                            "h-7 w-12",
                          )}
                        />
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-12">
                      {rule.enabled && ruleError ? (
                        <div className="md:col-span-12 text-sm text-rose-600 font-semibold">
                          {ruleError}
                        </div>
                      ) : null}
                      <div className="md:col-span-4">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          {t("oracle.alerts.severity")}
                        </div>
                        <select
                          value={rule.severity}
                          onChange={(e) =>
                            patchRule(rule.id, {
                              severity: e.target.value as AlertSeverity,
                            })
                          }
                          className="h-10 w-full rounded-xl px-3 text-sm bg-white/70 ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                        >
                          <option value="info">
                            {t("oracle.alerts.severities.info")}
                          </option>
                          <option value="warning">
                            {t("oracle.alerts.severities.warning")}
                          </option>
                          <option value="critical">
                            {t("oracle.alerts.severities.critical")}
                          </option>
                        </select>
                      </div>

                      <div className="md:col-span-4">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          {t("oracle.alerts.owner")}
                        </div>
                        <Input
                          value={rule.owner ?? ""}
                          onChange={(e) =>
                            patchRule(rule.id, {
                              owner: e.target.value.slice(0, 80),
                            })
                          }
                          placeholder={t("oracle.alerts.ownerPlaceholder")}
                          maxLength={80}
                          className="h-10 rounded-xl bg-white/70 ring-1 ring-black/5 border-transparent focus-visible:ring-2 focus-visible:ring-purple-500/20"
                        />
                      </div>

                      <div className="md:col-span-4">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          {t("oracle.alerts.runbook")}
                        </div>
                        <Input
                          value={rule.runbook ?? ""}
                          onChange={(e) =>
                            patchRule(rule.id, {
                              runbook: e.target.value.slice(0, 500),
                            })
                          }
                          placeholder={t("oracle.alerts.runbookPlaceholder")}
                          maxLength={500}
                          className="h-10 rounded-xl bg-white/70 ring-1 ring-black/5 border-transparent focus-visible:ring-2 focus-visible:ring-purple-500/20"
                        />
                      </div>

                      <div className="md:col-span-4">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          {t("oracle.alerts.channelsWebhook")}
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-white/60 ring-1 ring-black/5 px-4 py-3">
                          <div className="text-sm font-semibold text-gray-800">
                            {t("oracle.alerts.channelsWebhook")}
                          </div>
                          <Switch
                            checked={channels.includes("webhook")}
                            onCheckedChange={(checked) =>
                              toggleChannel(rule.id, "webhook", checked)
                            }
                            className={cn(
                              "data-[state=checked]:bg-purple-600",
                              "h-6 w-11",
                            )}
                          />
                        </div>
                      </div>

                      <div className="md:col-span-4">
                        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                          {t("oracle.alerts.channelsEmail")}
                        </div>
                        <div className="flex items-center justify-between rounded-xl bg-white/60 ring-1 ring-black/5 px-4 py-3">
                          <div className="text-sm font-semibold text-gray-800">
                            {t("oracle.alerts.channelsEmail")}
                          </div>
                          <Switch
                            checked={channels.includes("email")}
                            onCheckedChange={(checked) =>
                              toggleChannel(rule.id, "email", checked)
                            }
                            className={cn(
                              "data-[state=checked]:bg-purple-600",
                              "h-6 w-11",
                            )}
                          />
                        </div>
                      </div>

                      {channels.includes("email") ? (
                        <div className="md:col-span-12">
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            {t("oracle.alerts.recipient")}
                          </div>
                          <Input
                            value={rule.recipient ?? ""}
                            onChange={(e) =>
                              patchRule(rule.id, {
                                recipient: e.target.value,
                              })
                            }
                            placeholder={t(
                              "oracle.alerts.recipientPlaceholder",
                            )}
                            className="h-10 rounded-xl bg-white/70 ring-1 ring-black/5 border-transparent focus-visible:ring-2 focus-visible:ring-purple-500/20"
                          />
                        </div>
                      ) : null}

                      {rule.event === "stale_sync" ? (
                        <div className="md:col-span-12">
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            {t("oracle.alerts.params.maxAgeMinutes")}
                          </div>
                          <Input
                            type="number"
                            min={1}
                            step={1}
                            value={Math.round(
                              Number(
                                (
                                  rule.params as
                                    | { maxAgeMs?: unknown }
                                    | undefined
                                )?.maxAgeMs ?? 5 * 60 * 1000,
                              ) / 60_000,
                            )}
                            onChange={(e) => {
                              const minutes = Math.max(
                                1,
                                Math.floor(Number(e.target.value)),
                              );
                              patchRuleParams(rule.id, {
                                maxAgeMs: minutes * 60_000,
                              });
                            }}
                            className="h-10 rounded-xl bg-white/70 ring-1 ring-black/5 border-transparent focus-visible:ring-2 focus-visible:ring-purple-500/20"
                          />
                        </div>
                      ) : null}

                      {rule.event === "slow_api_request" ? (
                        <div className="md:col-span-12">
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            {t("oracle.alerts.params.thresholdMs")}
                          </div>
                          <Input
                            type="number"
                            min={50}
                            step={50}
                            value={Number(
                              (
                                rule.params as
                                  | { thresholdMs?: unknown }
                                  | undefined
                              )?.thresholdMs ?? 1000,
                            )}
                            onChange={(e) => {
                              const ms = Math.max(
                                50,
                                Math.floor(Number(e.target.value)),
                              );
                              patchRuleParams(rule.id, { thresholdMs: ms });
                            }}
                            className="h-10 rounded-xl bg-white/70 ring-1 ring-black/5 border-transparent focus-visible:ring-2 focus-visible:ring-purple-500/20"
                          />
                        </div>
                      ) : null}

                      {rule.event === "high_error_rate" ? (
                        <>
                          <div className="md:col-span-6">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                              {t("oracle.alerts.params.thresholdPercent")}
                            </div>
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              step={1}
                              value={Number(
                                (
                                  rule.params as
                                    | { thresholdPercent?: unknown }
                                    | undefined
                                )?.thresholdPercent ?? 5,
                              )}
                              onChange={(e) => {
                                const v = Math.max(
                                  1,
                                  Math.min(
                                    100,
                                    Math.floor(Number(e.target.value)),
                                  ),
                                );
                                patchRuleParams(rule.id, {
                                  thresholdPercent: v,
                                });
                              }}
                              className="h-10 rounded-xl bg-white/70 ring-1 ring-black/5 border-transparent focus-visible:ring-2 focus-visible:ring-purple-500/20"
                            />
                          </div>
                          <div className="md:col-span-6">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                              {t("oracle.alerts.params.windowMinutes")}
                            </div>
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              value={Number(
                                (
                                  rule.params as
                                    | { windowMinutes?: unknown }
                                    | undefined
                                )?.windowMinutes ?? 5,
                              )}
                              onChange={(e) => {
                                const v = Math.max(
                                  1,
                                  Math.floor(Number(e.target.value)),
                                );
                                patchRuleParams(rule.id, { windowMinutes: v });
                              }}
                              className="h-10 rounded-xl bg-white/70 ring-1 ring-black/5 border-transparent focus-visible:ring-2 focus-visible:ring-purple-500/20"
                            />
                          </div>
                        </>
                      ) : null}

                      {rule.event === "database_slow_query" ? (
                        <div className="md:col-span-12">
                          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                            {t("oracle.alerts.params.thresholdMs")}
                          </div>
                          <Input
                            type="number"
                            min={10}
                            step={10}
                            value={Number(
                              (
                                rule.params as
                                  | { thresholdMs?: unknown }
                                  | undefined
                              )?.thresholdMs ?? 200,
                            )}
                            onChange={(e) => {
                              const ms = Math.max(
                                10,
                                Math.floor(Number(e.target.value)),
                              );
                              patchRuleParams(rule.id, { thresholdMs: ms });
                            }}
                            className="h-10 rounded-xl bg-white/70 ring-1 ring-black/5 border-transparent focus-visible:ring-2 focus-visible:ring-purple-500/20"
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
