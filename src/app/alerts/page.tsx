"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AlertRulesManager } from "@/components/AlertRulesManager";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn, fetchApiData, formatTime, getErrorCode } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";
import { getUiErrorMessage, langToLocale } from "@/i18n/translations";
import { useAdminSession } from "@/hooks/useAdminSession";
import type {
  Alert,
  AlertRule,
  AlertSeverity,
  AlertStatus,
  Incident,
  RiskItem,
} from "@/lib/oracleTypes";

function getEntityHref(entityType: string, entityId: string) {
  const id = entityId.trim();
  if (!id) return null;
  if (entityType === "api" && id.startsWith("/")) return id;
  if (entityType === "oracle" && /^0x[a-fA-F0-9]{40}$/.test(id))
    return `/oracle/address/${id}`;
  if (/^0x[a-fA-F0-9]{40}$/.test(id)) return `/oracle/address/${id}`;
  if (/^0x[a-fA-F0-9]{64}$/.test(id)) return `/oracle/${id}`;
  return null;
}

function getSafeExternalUrl(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/\s/.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function getSafeInternalPath(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (/\s/.test(trimmed)) return null;
  return trimmed;
}

function severityBadge(severity: AlertSeverity) {
  if (severity === "critical")
    return "bg-rose-100 text-rose-700 border-rose-200";
  if (severity === "warning")
    return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function statusBadge(status: AlertStatus) {
  if (status === "Open") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (status === "Acknowledged")
    return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

export default function AlertsPage() {
  const { t, lang } = useI18n();
  const locale = langToLocale[lang];

  const {
    adminToken,
    setAdminToken,
    adminActor,
    setAdminActor,
    headers: adminHeaders,
    canAdmin,
  } = useAdminSession({ actor: true });
  const [items, setItems] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<AlertStatus | "All">("All");
  const [filterSeverity, setFilterSeverity] = useState<AlertSeverity | "All">(
    "All",
  );
  const [query, setQuery] = useState("");
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [rules, setRules] = useState<AlertRule[] | null>(null);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [rulesSaving, setRulesSaving] = useState(false);
  type IncidentWithAlerts = Incident & { alerts?: Alert[] };
  const [incidents, setIncidents] = useState<IncidentWithAlerts[]>([]);
  const [incidentsError, setIncidentsError] = useState<string | null>(null);
  const [incidentsLoading, setIncidentsLoading] = useState(false);
  const [editingIncidentId, setEditingIncidentId] = useState<number | null>(
    null,
  );
  const [incidentDraft, setIncidentDraft] = useState<{
    title: string;
    severity: AlertSeverity;
    owner: string;
    runbook: string;
    entityType: string;
    entityId: string;
    summary: string;
  } | null>(null);
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [risksError, setRisksError] = useState<string | null>(null);
  const [risksLoading, setRisksLoading] = useState(false);

  const rulesById = useCallback(() => {
    const map = new Map<string, AlertRule>();
    for (const r of rules ?? []) map.set(r.id, r);
    return map;
  }, [rules]);

  const loadRules = useCallback(async () => {
    if (!canAdmin) {
      setRules(null);
      setRulesError(null);
      return;
    }
    setRulesError(null);
    try {
      const data = await fetchApiData<{ rules: AlertRule[] }>(
        "/api/oracle/alert-rules",
        { headers: adminHeaders },
      );
      setRules(data.rules ?? []);
    } catch (e) {
      setRulesError(getErrorCode(e));
    }
  }, [adminHeaders, canAdmin]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const loadIncidents = useCallback(async () => {
    setIncidentsError(null);
    setIncidentsLoading(true);
    try {
      const data = await fetchApiData<{ items: IncidentWithAlerts[] }>(
        "/api/oracle/incidents?limit=20&includeAlerts=1",
      );
      setIncidents(data.items ?? []);
    } catch (e) {
      setIncidentsError(getErrorCode(e));
    } finally {
      setIncidentsLoading(false);
    }
  }, []);

  const loadRisks = useCallback(async () => {
    setRisksError(null);
    setRisksLoading(true);
    try {
      const data = await fetchApiData<{ items: RiskItem[] }>(
        "/api/oracle/risks?limit=20",
      );
      setRisks(data.items ?? []);
    } catch (e) {
      setRisksError(getErrorCode(e));
    } finally {
      setRisksLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadIncidents();
    void loadRisks();
  }, [loadIncidents, loadRisks]);

  const loadAlerts = useCallback(
    async (cursor: number | null) => {
      setError(null);
      const params = new URLSearchParams();
      if (filterStatus !== "All") params.set("status", filterStatus);
      if (filterSeverity !== "All") params.set("severity", filterSeverity);
      if (query.trim()) params.set("q", query.trim());
      params.set("limit", "30");
      if (cursor !== null) params.set("cursor", String(cursor));
      const data = await fetchApiData<{
        items: Alert[];
        total: number;
        nextCursor: number | null;
      }>(`/api/oracle/alerts?${params.toString()}`);
      return data;
    },
    [filterSeverity, filterStatus, query],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadAlerts(null);
      setItems(data.items ?? []);
      setNextCursor(data.nextCursor ?? null);
      void loadIncidents();
      void loadRisks();
    } catch (e) {
      setError(getErrorCode(e));
    } finally {
      setLoading(false);
    }
  }, [loadAlerts, loadIncidents, loadRisks]);

  const createIncidentFromAlert = async (a: Alert, rule?: AlertRule) => {
    if (!canAdmin) return;
    await fetchApiData<{ ok: true; incident: Incident }>(
      "/api/oracle/incidents",
      {
        method: "POST",
        headers: { "content-type": "application/json", ...adminHeaders },
        body: JSON.stringify({
          title: a.title,
          severity: a.severity,
          summary: a.message,
          runbook: rule?.runbook ?? null,
          owner: rule?.owner ?? null,
          alertIds: [a.id],
          entityType: a.entityType,
          entityId: a.entityId,
        }),
      },
    );
    await loadIncidents();
  };

  const patchIncidentStatus = async (
    id: number,
    status: Incident["status"],
  ) => {
    if (!canAdmin) return;
    await fetchApiData<{ ok: true; incident: Incident }>(
      `/api/oracle/incidents/${id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json", ...adminHeaders },
        body: JSON.stringify({ status }),
      },
    );
    await loadIncidents();
  };

  const incidentAction = async (
    id: number,
    action: "ack_alerts" | "resolve_alerts",
  ) => {
    if (!canAdmin) return;
    await fetchApiData<{ ok: true; incident: Incident }>(
      `/api/oracle/incidents/${id}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json", ...adminHeaders },
        body: JSON.stringify({ action }),
      },
    );
    await refresh();
  };

  const startEditIncident = (i: IncidentWithAlerts) => {
    if (!canAdmin) return;
    setEditingIncidentId(i.id);
    setIncidentDraft({
      title: i.title ?? "",
      severity: i.severity,
      owner: i.owner ?? "",
      runbook: i.runbook ?? "",
      entityType: i.entityType ?? "",
      entityId: i.entityId ?? "",
      summary: i.summary ?? "",
    });
  };

  const cancelEditIncident = () => {
    setEditingIncidentId(null);
    setIncidentDraft(null);
  };

  const saveIncidentEdit = async () => {
    if (!canAdmin) return;
    if (!incidentDraft) return;
    if (editingIncidentId === null) return;

    const patch = {
      title: incidentDraft.title.trim(),
      severity: incidentDraft.severity,
      owner: incidentDraft.owner.trim() ? incidentDraft.owner.trim() : null,
      runbook: incidentDraft.runbook.trim()
        ? incidentDraft.runbook.trim()
        : null,
      entityType: incidentDraft.entityType.trim()
        ? incidentDraft.entityType.trim()
        : null,
      entityId: incidentDraft.entityId.trim()
        ? incidentDraft.entityId.trim()
        : null,
      summary: incidentDraft.summary.trim() ? incidentDraft.summary : null,
    };

    await fetchApiData<{ ok: true; incident: Incident }>(
      `/api/oracle/incidents/${editingIncidentId}`,
      {
        method: "PATCH",
        headers: { "content-type": "application/json", ...adminHeaders },
        body: JSON.stringify(patch),
      },
    );
    cancelEditIncident();
    await loadIncidents();
  };

  const applyQuery = useCallback((value: string) => {
    const next = value.trim();
    if (!next) return;
    setQuery(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const resetFilters = useCallback(() => {
    setFilterStatus("All");
    setFilterSeverity("All");
    setQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filterStatus !== "All") params.set("status", filterStatus);
        if (filterSeverity !== "All") params.set("severity", filterSeverity);
        if (query.trim()) params.set("q", query.trim());
        params.set("limit", "30");
        const data = await fetchApiData<{
          items: Alert[];
          total: number;
          nextCursor: number | null;
        }>(`/api/oracle/alerts?${params.toString()}`, {
          signal: controller.signal,
        });
        if (cancelled) return;
        setItems(data.items ?? []);
        setNextCursor(data.nextCursor ?? null);
      } catch (e) {
        if (!cancelled) setError(getErrorCode(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const timeout = window.setTimeout(run, 200);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [filterStatus, filterSeverity, query]);

  const loadMore = async () => {
    if (nextCursor === null) return;
    try {
      const data = await loadAlerts(nextCursor);
      setItems((prev) => prev.concat(data.items ?? []));
      setNextCursor(data.nextCursor ?? null);
    } catch (e) {
      setError(getErrorCode(e));
    }
  };

  const updateAlert = async (alertId: number, status: AlertStatus) => {
    await fetchApiData<Alert>(`/api/oracle/alerts/${alertId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json", ...adminHeaders },
      body: JSON.stringify({ status }),
    });
    await refresh();
  };

  const setRuleSilenceMinutes = async (
    ruleId: string,
    minutes: number | null,
  ) => {
    if (!canAdmin) return;
    if (!rules) return;
    if (
      minutes !== null &&
      (!Number.isFinite(minutes) ||
        !Number.isInteger(minutes) ||
        minutes <= 0 ||
        minutes > 60 * 24 * 30)
    ) {
      return;
    }
    setRulesSaving(true);
    try {
      const silencedUntil = minutes
        ? new Date(Date.now() + minutes * 60_000).toISOString()
        : null;
      const nextRules = rules.map((r) =>
        r.id === ruleId ? { ...r, silencedUntil } : r,
      );
      const data = await fetchApiData<{ rules: AlertRule[] }>(
        "/api/oracle/alert-rules",
        {
          method: "PUT",
          headers: { "content-type": "application/json", ...adminHeaders },
          body: JSON.stringify({ rules: nextRules }),
        },
      );
      setRules(data.rules ?? nextRules);
    } catch (e) {
      setError(getErrorCode(e));
    } finally {
      setRulesSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-16">
      <PageHeader
        title={t("alerts.title")}
        description={t("alerts.description")}
      >
        <button
          type="button"
          onClick={refresh}
          className="flex items-center gap-2 rounded-xl bg-white/60 px-4 py-2 text-sm font-semibold text-purple-800 shadow-sm ring-1 ring-purple-100 hover:bg-white"
        >
          <RefreshCw size={16} />
          {t("alerts.refresh")}
        </button>
      </PageHeader>

      {error && (
        <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-700 shadow-sm">
          {getUiErrorMessage(error, t)}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-purple-100/60 bg-white/60 shadow-sm lg:col-span-2">
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2 text-sm text-purple-700/70">
                <ShieldAlert size={16} />
                <span>{t("alerts.title")}</span>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <select
                  value={filterStatus}
                  onChange={(e) =>
                    setFilterStatus(e.target.value as AlertStatus | "All")
                  }
                  className="h-9 rounded-lg border-none bg-white/50 px-3 text-sm text-purple-900 shadow-sm focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="All">{t("common.all")}</option>
                  <option value="Open">Open</option>
                  <option value="Acknowledged">Acknowledged</option>
                  <option value="Resolved">Resolved</option>
                </select>

                <select
                  value={filterSeverity}
                  onChange={(e) =>
                    setFilterSeverity(e.target.value as AlertSeverity | "All")
                  }
                  className="h-9 rounded-lg border-none bg-white/50 px-3 text-sm text-purple-900 shadow-sm focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="All">{t("common.all")}</option>
                  <option value="critical">critical</option>
                  <option value="warning">warning</option>
                  <option value="info">info</option>
                </select>

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("alerts.searchPlaceholder")}
                  className="h-9 w-full rounded-lg border-none bg-white/50 px-3 text-sm text-purple-900 shadow-sm placeholder:text-purple-300 focus:ring-2 focus:ring-purple-500/20 sm:w-64"
                />
                {filterStatus !== "All" ||
                filterSeverity !== "All" ||
                query.trim() ? (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="h-9 rounded-lg bg-white/50 px-3 text-sm font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-white"
                  >
                    {t("audit.clear")}
                  </button>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading && (
              <div className="rounded-2xl border border-purple-100 bg-white/50 p-6 text-sm text-purple-700/70 shadow-sm">
                {t("common.loading")}
              </div>
            )}

            {!loading && items.length === 0 && (
              <div className="rounded-2xl border border-purple-100 bg-white/50 p-6 text-sm text-purple-700/70 shadow-sm">
                {t("common.noData")}
              </div>
            )}

            {!loading &&
              items.map((a) =>
                (() => {
                  const ruleId = a.fingerprint.split(":")[0] ?? "";
                  const rule = rulesById().get(ruleId);
                  const silencedUntilRaw = (rule?.silencedUntil ?? "").trim();
                  const silencedUntilMs = silencedUntilRaw
                    ? Date.parse(silencedUntilRaw)
                    : NaN;
                  const isSilenced =
                    Number.isFinite(silencedUntilMs) &&
                    silencedUntilMs > Date.now();
                  return (
                    <Card
                      key={a.id}
                      className="border-purple-100/60 bg-white/60 shadow-sm"
                    >
                      <CardHeader className="pb-3">
                        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                          <div className="flex gap-3">
                            <div
                              className={cn(
                                "mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm",
                                a.severity === "critical"
                                  ? "bg-rose-100 text-rose-600"
                                  : a.severity === "warning"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-600",
                              )}
                            >
                              {a.status === "Resolved" ? (
                                <CheckCircle2 size={18} />
                              ) : (
                                <AlertTriangle size={18} />
                              )}
                            </div>
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <h3 className="text-base font-semibold text-purple-950">
                                  {a.title}
                                </h3>
                                <span
                                  className={cn(
                                    "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                    severityBadge(a.severity),
                                  )}
                                >
                                  {a.severity}
                                </span>
                                <span
                                  className={cn(
                                    "px-2.5 py-0.5 rounded-full text-xs font-medium ring-1",
                                    statusBadge(a.status),
                                  )}
                                >
                                  {a.status}
                                </span>
                                <span className="text-xs text-gray-400 font-medium px-2 py-0.5 bg-gray-50 rounded-md border border-gray-100">
                                  {a.type}
                                </span>
                                {rule ? (
                                  <span className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-gray-50 rounded-md border border-gray-100">
                                    {rule.name}
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-1 text-sm text-purple-800/80">
                                {a.message}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {canAdmin && (
                              <button
                                type="button"
                                onClick={() => createIncidentFromAlert(a, rule)}
                                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                              >
                                Incident
                              </button>
                            )}
                            {canAdmin &&
                              a.status !== "Acknowledged" &&
                              a.status !== "Resolved" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateAlert(a.id, "Acknowledged")
                                  }
                                  className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-purple-50"
                                >
                                  {t("alerts.acknowledge")}
                                </button>
                              )}
                            {canAdmin && a.status !== "Resolved" && (
                              <button
                                type="button"
                                onClick={() => updateAlert(a.id, "Resolved")}
                                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-100 hover:bg-emerald-50"
                              >
                                {t("alerts.resolve")}
                              </button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1 border border-gray-100">
                            <Clock size={12} />
                            {t("alerts.lastSeen")}:{" "}
                            {formatTime(a.lastSeenAt, locale)}
                          </span>
                          <span className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100">
                            {t("alerts.occurrences")}: {a.occurrences}
                          </span>
                          {a.entityType &&
                            a.entityId &&
                            (() => {
                              const href = getEntityHref(
                                a.entityType,
                                a.entityId,
                              );
                              const text = `${a.entityType}:${a.entityId.slice(0, 18)}…`;
                              return href ? (
                                href.startsWith("/api/") ? (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100 font-mono hover:bg-white"
                                  >
                                    {text}
                                  </a>
                                ) : (
                                  <Link
                                    href={href as Route}
                                    className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100 font-mono hover:bg-white"
                                  >
                                    {text}
                                  </Link>
                                )
                              ) : (
                                <span className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100 font-mono">
                                  {text}
                                </span>
                              );
                            })()}
                          {rule?.owner ? (
                            <span className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100">
                              {t("alerts.owner")}:{" "}
                              <span className="font-mono">{rule.owner}</span>
                            </span>
                          ) : null}
                          {rule?.runbook
                            ? (() => {
                                const internal = getSafeInternalPath(
                                  rule.runbook,
                                );
                                if (internal) {
                                  if (internal.startsWith("/api/")) {
                                    return (
                                      <a
                                        href={internal}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100 hover:bg-white"
                                      >
                                        {t("alerts.runbook")}
                                      </a>
                                    );
                                  }
                                  return (
                                    <Link
                                      href={internal as Route}
                                      className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100 hover:bg-white"
                                    >
                                      {t("alerts.runbook")}
                                    </Link>
                                  );
                                }
                                const external = getSafeExternalUrl(
                                  rule.runbook,
                                );
                                return external ? (
                                  <a
                                    href={external}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100 hover:bg-white"
                                  >
                                    {t("alerts.runbook")}
                                  </a>
                                ) : null;
                              })()
                            : null}
                        </div>

                        {canAdmin && rule ? (
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            {isSilenced ? (
                              <>
                                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1">
                                  {t("alerts.silencedUntil")}:{" "}
                                  {formatTime(
                                    new Date(silencedUntilMs).toISOString(),
                                    locale,
                                  )}
                                </span>
                                <button
                                  type="button"
                                  disabled={rulesSaving}
                                  onClick={() =>
                                    setRuleSilenceMinutes(rule.id, null)
                                  }
                                  className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-800 shadow-sm ring-1 ring-amber-100 hover:bg-amber-50 disabled:opacity-50"
                                >
                                  {t("alerts.unsilence")}
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled={rulesSaving}
                                  onClick={() =>
                                    setRuleSilenceMinutes(rule.id, 30)
                                  }
                                  className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-800 shadow-sm ring-1 ring-amber-100 hover:bg-amber-50 disabled:opacity-50"
                                >
                                  {t("alerts.silence30m")}
                                </button>
                                <button
                                  type="button"
                                  disabled={rulesSaving}
                                  onClick={() =>
                                    setRuleSilenceMinutes(rule.id, 120)
                                  }
                                  className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-800 shadow-sm ring-1 ring-amber-100 hover:bg-amber-50 disabled:opacity-50"
                                >
                                  {t("alerts.silence2h")}
                                </button>
                                <button
                                  type="button"
                                  disabled={rulesSaving}
                                  onClick={() =>
                                    setRuleSilenceMinutes(rule.id, 1440)
                                  }
                                  className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-800 shadow-sm ring-1 ring-amber-100 hover:bg-amber-50 disabled:opacity-50"
                                >
                                  {t("alerts.silence24h")}
                                </button>
                              </>
                            )}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })(),
              )}

            {!loading && nextCursor !== null && (
              <button
                type="button"
                onClick={loadMore}
                className="w-full rounded-xl bg-white/60 px-4 py-2 text-sm font-semibold text-purple-800 shadow-sm ring-1 ring-purple-100 hover:bg-white"
              >
                {t("common.loadMore")}
              </button>
            )}
          </CardContent>
        </Card>

        <Card className="border-purple-100/60 bg-white/60 shadow-sm">
          <CardHeader className="pb-4">
            <div className="text-sm font-semibold text-purple-950">
              {t("alerts.rules")}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-purple-100/60 bg-white/50 p-3">
              <div className="text-sm font-semibold text-purple-950">
                Incidents
              </div>
              {incidentsError ? (
                <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50/50 p-2 text-xs text-rose-700">
                  {getUiErrorMessage(incidentsError, t)}
                </div>
              ) : null}
              {incidentsLoading ? (
                <div className="mt-2 text-xs text-purple-700/70">
                  {t("common.loading")}
                </div>
              ) : incidents.length === 0 ? (
                <div className="mt-2 text-xs text-purple-700/70">
                  {t("common.noData")}
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {incidents.map((i) => {
                    const incidentQuery =
                      i.entityId?.trim() ||
                      (i.alerts ?? [])
                        .map((a) => a.entityId ?? "")
                        .find((x) => x.trim()) ||
                      "";
                    return (
                      <div
                        key={i.id}
                        className="rounded-xl border border-purple-100/60 bg-white/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-purple-950">
                              {i.title}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                                  severityBadge(i.severity),
                                )}
                              >
                                {i.severity}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-gray-50 text-gray-600">
                                {i.status}
                              </span>
                              <span className="text-[11px] text-gray-400">
                                {formatTime(i.updatedAt, locale)}
                              </span>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {incidentQuery ? (
                              <button
                                type="button"
                                onClick={() => applyQuery(incidentQuery)}
                                className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-purple-50"
                              >
                                Alerts
                              </button>
                            ) : null}
                            {canAdmin ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() =>
                                    editingIncidentId === i.id
                                      ? cancelEditIncident()
                                      : startEditIncident(i)
                                  }
                                  className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                                >
                                  {editingIncidentId === i.id
                                    ? "Cancel"
                                    : "Edit"}
                                </button>
                                {i.alertIds?.length ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        incidentAction(i.id, "ack_alerts")
                                      }
                                      className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-purple-50"
                                    >
                                      Ack alerts
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        incidentAction(i.id, "resolve_alerts")
                                      }
                                      className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-100 hover:bg-emerald-50"
                                    >
                                      Resolve alerts
                                    </button>
                                  </>
                                ) : null}
                                {i.status !== "Mitigating" &&
                                i.status !== "Resolved" ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      patchIncidentStatus(i.id, "Mitigating")
                                    }
                                    className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 shadow-sm ring-1 ring-amber-100 hover:bg-amber-50"
                                  >
                                    Mitigating
                                  </button>
                                ) : null}
                                {i.status !== "Resolved" ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      patchIncidentStatus(i.id, "Resolved")
                                    }
                                    className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-100 hover:bg-emerald-50"
                                  >
                                    Resolve
                                  </button>
                                ) : null}
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                          {i.owner ? (
                            <span className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100">
                              Owner:{" "}
                              <span className="font-mono">{i.owner}</span>
                            </span>
                          ) : null}
                          {i.runbook
                            ? (() => {
                                const internal = getSafeInternalPath(i.runbook);
                                if (internal) {
                                  if (internal.startsWith("/api/")) {
                                    return (
                                      <a
                                        href={internal}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100 hover:bg-white"
                                      >
                                        Runbook
                                      </a>
                                    );
                                  }
                                  return (
                                    <Link
                                      href={internal as Route}
                                      className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100 hover:bg-white"
                                    >
                                      Runbook
                                    </Link>
                                  );
                                }
                                const external = getSafeExternalUrl(i.runbook);
                                return external ? (
                                  <a
                                    href={external}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100 hover:bg-white"
                                  >
                                    Runbook
                                  </a>
                                ) : null;
                              })()
                            : null}
                          {i.entityType && i.entityId
                            ? (() => {
                                const href = getEntityHref(
                                  i.entityType,
                                  i.entityId,
                                );
                                const text = `${i.entityType}:${i.entityId.slice(0, 18)}…`;
                                return href ? (
                                  href.startsWith("/api/") ? (
                                    <a
                                      href={href}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100 font-mono hover:bg-white"
                                    >
                                      {text}
                                    </a>
                                  ) : (
                                    <Link
                                      href={href as Route}
                                      className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100 font-mono hover:bg-white"
                                    >
                                      {text}
                                    </Link>
                                  )
                                ) : (
                                  <span className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100 font-mono">
                                    {text}
                                  </span>
                                );
                              })()
                            : null}
                        </div>
                        {i.summary ? (
                          <div className="mt-2 text-xs text-purple-800/80 whitespace-pre-wrap">
                            {i.summary}
                          </div>
                        ) : null}

                        {editingIncidentId === i.id && incidentDraft ? (
                          <div className="mt-3 space-y-2 rounded-xl border border-purple-100/60 bg-white/60 p-3">
                            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                              <label className="space-y-1">
                                <div className="text-[11px] font-semibold text-purple-900/80">
                                  Title
                                </div>
                                <input
                                  value={incidentDraft.title}
                                  onChange={(e) =>
                                    setIncidentDraft((prev) =>
                                      prev
                                        ? { ...prev, title: e.target.value }
                                        : prev,
                                    )
                                  }
                                  className="w-full rounded-lg border border-purple-100 bg-white px-2 py-1.5 text-xs text-purple-950 outline-none ring-purple-200 focus:ring-2"
                                />
                              </label>
                              <label className="space-y-1">
                                <div className="text-[11px] font-semibold text-purple-900/80">
                                  Severity
                                </div>
                                <select
                                  value={incidentDraft.severity}
                                  onChange={(e) =>
                                    setIncidentDraft((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            severity: e.target
                                              .value as AlertSeverity,
                                          }
                                        : prev,
                                    )
                                  }
                                  className="w-full rounded-lg border border-purple-100 bg-white px-2 py-1.5 text-xs text-purple-950 outline-none ring-purple-200 focus:ring-2"
                                >
                                  <option value="info">info</option>
                                  <option value="warning">warning</option>
                                  <option value="critical">critical</option>
                                </select>
                              </label>
                              <label className="space-y-1">
                                <div className="text-[11px] font-semibold text-purple-900/80">
                                  Owner
                                </div>
                                <input
                                  value={incidentDraft.owner}
                                  onChange={(e) =>
                                    setIncidentDraft((prev) =>
                                      prev
                                        ? { ...prev, owner: e.target.value }
                                        : prev,
                                    )
                                  }
                                  className="w-full rounded-lg border border-purple-100 bg-white px-2 py-1.5 text-xs text-purple-950 outline-none ring-purple-200 focus:ring-2"
                                />
                              </label>
                              <label className="space-y-1">
                                <div className="text-[11px] font-semibold text-purple-900/80">
                                  Runbook
                                </div>
                                <input
                                  value={incidentDraft.runbook}
                                  onChange={(e) =>
                                    setIncidentDraft((prev) =>
                                      prev
                                        ? { ...prev, runbook: e.target.value }
                                        : prev,
                                    )
                                  }
                                  className="w-full rounded-lg border border-purple-100 bg-white px-2 py-1.5 text-xs text-purple-950 outline-none ring-purple-200 focus:ring-2"
                                />
                              </label>
                              <label className="space-y-1">
                                <div className="text-[11px] font-semibold text-purple-900/80">
                                  Entity Type
                                </div>
                                <input
                                  value={incidentDraft.entityType}
                                  onChange={(e) =>
                                    setIncidentDraft((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            entityType: e.target.value,
                                          }
                                        : prev,
                                    )
                                  }
                                  className="w-full rounded-lg border border-purple-100 bg-white px-2 py-1.5 text-xs text-purple-950 outline-none ring-purple-200 focus:ring-2"
                                />
                              </label>
                              <label className="space-y-1">
                                <div className="text-[11px] font-semibold text-purple-900/80">
                                  Entity ID
                                </div>
                                <input
                                  value={incidentDraft.entityId}
                                  onChange={(e) =>
                                    setIncidentDraft((prev) =>
                                      prev
                                        ? { ...prev, entityId: e.target.value }
                                        : prev,
                                    )
                                  }
                                  className="w-full rounded-lg border border-purple-100 bg-white px-2 py-1.5 text-xs text-purple-950 outline-none ring-purple-200 focus:ring-2"
                                />
                              </label>
                            </div>
                            <label className="space-y-1 block">
                              <div className="text-[11px] font-semibold text-purple-900/80">
                                Summary
                              </div>
                              <textarea
                                value={incidentDraft.summary}
                                onChange={(e) =>
                                  setIncidentDraft((prev) =>
                                    prev
                                      ? { ...prev, summary: e.target.value }
                                      : prev,
                                  )
                                }
                                rows={4}
                                className="w-full rounded-lg border border-purple-100 bg-white px-2 py-1.5 text-xs text-purple-950 outline-none ring-purple-200 focus:ring-2"
                              />
                            </label>
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={saveIncidentEdit}
                                disabled={!incidentDraft.title.trim()}
                                className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-purple-50 disabled:opacity-50"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : null}

                        {i.alerts?.length ? (
                          <div className="mt-3 space-y-2">
                            <div className="text-[11px] font-semibold text-purple-900/80">
                              Linked alerts
                            </div>
                            <div className="space-y-1">
                              {i.alerts.map((a) => (
                                <div
                                  key={a.id}
                                  className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-purple-100/60 bg-white/60 px-2 py-1.5 text-[11px]"
                                >
                                  <div className="min-w-0">
                                    <span className="font-mono text-gray-500">
                                      #{a.id}
                                    </span>{" "}
                                    <span className="text-purple-950">
                                      {a.title}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {a.entityType && a.entityId
                                      ? (() => {
                                          const href = getEntityHref(
                                            a.entityType,
                                            a.entityId,
                                          );
                                          const text = `${a.entityType}:${a.entityId.slice(0, 14)}…`;
                                          return href ? (
                                            href.startsWith("/api/") ? (
                                              <a
                                                href={href}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="rounded-md bg-gray-50 px-2 py-0.5 border border-gray-100 font-mono hover:bg-white"
                                              >
                                                {text}
                                              </a>
                                            ) : (
                                              <Link
                                                href={href as Route}
                                                className="rounded-md bg-gray-50 px-2 py-0.5 border border-gray-100 font-mono hover:bg-white"
                                              >
                                                {text}
                                              </Link>
                                            )
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                applyQuery(a.entityId ?? "")
                                              }
                                              className="rounded-md bg-gray-50 px-2 py-0.5 border border-gray-100 font-mono hover:bg-white"
                                            >
                                              {text}
                                            </button>
                                          );
                                        })()
                                      : null}
                                    <span
                                      className={cn(
                                        "px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                                        severityBadge(a.severity),
                                      )}
                                    >
                                      {a.severity}
                                    </span>
                                    <span
                                      className={cn(
                                        "px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1",
                                        statusBadge(a.status),
                                      )}
                                    >
                                      {a.status}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-purple-100/60 bg-white/50 p-3">
              <div className="text-sm font-semibold text-purple-950">
                Top risks
              </div>
              {risksError ? (
                <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50/50 p-2 text-xs text-rose-700">
                  {getUiErrorMessage(risksError, t)}
                </div>
              ) : null}
              {risksLoading ? (
                <div className="mt-2 text-xs text-purple-700/70">
                  {t("common.loading")}
                </div>
              ) : risks.length === 0 ? (
                <div className="mt-2 text-xs text-purple-700/70">
                  {t("common.noData")}
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {risks.map((r, idx) => {
                    const alertsQuery = (
                      r.assertionId?.trim() ? r.assertionId : r.entityId
                    ).trim();
                    const assertionHref = (
                      r.assertionId?.trim()
                        ? (`/oracle/${r.assertionId}` as Route)
                        : r.entityType === "assertion"
                          ? (`/oracle/${r.entityId}` as Route)
                          : null
                    ) as Route | null;
                    const disputeHref = r.disputeId?.trim()
                      ? (`/disputes?q=${encodeURIComponent(
                          r.disputeId,
                        )}` as Route)
                      : null;
                    const reasons = (r.reasons ?? []).filter(Boolean);
                    return (
                      <div
                        key={`${r.entityType}:${r.entityId}:${idx}`}
                        className="rounded-xl border border-purple-100/60 bg-white/60 p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span
                                className={cn(
                                  "px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                                  severityBadge(r.severity),
                                )}
                              >
                                {r.severity}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-gray-50 text-gray-600">
                                {Math.round(r.score)}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-gray-50 text-gray-600">
                                {r.chain}
                              </span>
                              <span className="truncate text-sm font-semibold text-purple-950">
                                {r.market}
                              </span>
                            </div>
                            {reasons.length ? (
                              <div className="mt-2 space-y-1 text-xs text-purple-800/80">
                                {reasons.map((reason, i) => (
                                  <div
                                    key={`${idx}:${i}`}
                                    className="leading-snug"
                                  >
                                    {reason}
                                  </div>
                                ))}
                              </div>
                            ) : null}
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {alertsQuery ? (
                              <button
                                type="button"
                                onClick={() => applyQuery(alertsQuery)}
                                className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-purple-50"
                              >
                                Alerts
                              </button>
                            ) : null}
                            {assertionHref ? (
                              <Link
                                href={assertionHref}
                                className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-purple-50"
                              >
                                Assertion
                              </Link>
                            ) : null}
                            {disputeHref ? (
                              <Link
                                href={disputeHref}
                                className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 shadow-sm ring-1 ring-amber-100 hover:bg-amber-50"
                              >
                                Dispute
                              </Link>
                            ) : (
                              <Link
                                href={"/disputes" as Route}
                                className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-purple-50"
                              >
                                Disputes
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {rulesError ? (
              <div className="rounded-xl border border-rose-100 bg-rose-50/50 p-3 text-xs text-rose-700">
                {getUiErrorMessage(rulesError, t)}
              </div>
            ) : null}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500">
                {t("alerts.adminToken")}
              </div>
              <input
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder={t("alerts.adminTokenHint")}
                className="h-9 w-full rounded-lg border-none bg-white/50 px-3 text-sm text-purple-900 shadow-sm placeholder:text-purple-300 focus:ring-2 focus:ring-purple-500/20"
              />
              {!canAdmin && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-2">
                  {t("alerts.adminTokenWarning")}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-gray-500">
                {t("alerts.adminActor")}
              </div>
              <input
                value={adminActor}
                onChange={(e) => setAdminActor(e.target.value)}
                placeholder={t("alerts.adminActorPlaceholder")}
                className="h-9 w-full rounded-lg border-none bg-white/50 px-3 text-sm text-purple-900 shadow-sm placeholder:text-purple-300 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
            <AlertRulesManager
              showTitle={false}
              showAdminTokenInput={false}
              showAdminActorInput={false}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
