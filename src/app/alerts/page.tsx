"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader } from "@/components/PageHeader";
import { AlertRulesManager } from "@/components/AlertRulesManager";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  cn,
  fetchApiData,
  formatDurationMinutes,
  formatTime,
  getErrorCode,
} from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";
import { getUiErrorMessage, langToLocale } from "@/i18n/translations";
import { useAdminSession } from "@/hooks/useAdminSession";
import type {
  Alert,
  AlertRule,
  AlertSeverity,
  AlertStatus,
  Incident,
  OpsMetrics,
  OpsMetricsSeriesPoint,
  OpsSloStatus,
  OracleInstance,
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

const sloLabels: Record<string, string> = {
  lagBlocks: "Sync lag blocks",
  syncStalenessMinutes: "Sync staleness",
  alertMttaMinutes: "Alert MTTA",
  alertMttrMinutes: "Alert MTTR",
  incidentMttrMinutes: "Incident MTTR",
  openAlerts: "Open alerts",
  openCriticalAlerts: "Open critical",
};

function sloStatusBadge(status: OpsSloStatus["status"]) {
  if (status === "met")
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "degraded") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-rose-50 text-rose-700 ring-rose-200";
}

function sloStatusLabel(status: OpsSloStatus["status"]) {
  if (status === "met") return "Met";
  if (status === "degraded") return "Degraded";
  return "Breached";
}

function formatSloValue(key: string, value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  if (key.includes("Minutes")) return formatDurationMinutes(value);
  return value.toLocaleString();
}

function formatSloTarget(key: string, value: number) {
  if (!Number.isFinite(value)) return "—";
  if (key.includes("Minutes")) return formatDurationMinutes(value);
  return value.toLocaleString();
}

function getSloEntries(slo: OpsSloStatus) {
  return [
    {
      key: "lagBlocks",
      label: sloLabels.lagBlocks,
      current: slo.current.lagBlocks,
      target: slo.targets.maxLagBlocks,
    },
    {
      key: "syncStalenessMinutes",
      label: sloLabels.syncStalenessMinutes,
      current: slo.current.syncStalenessMinutes,
      target: slo.targets.maxSyncStalenessMinutes,
    },
    {
      key: "alertMttaMinutes",
      label: sloLabels.alertMttaMinutes,
      current: slo.current.alertMttaMinutes,
      target: slo.targets.maxAlertMttaMinutes,
    },
    {
      key: "alertMttrMinutes",
      label: sloLabels.alertMttrMinutes,
      current: slo.current.alertMttrMinutes,
      target: slo.targets.maxAlertMttrMinutes,
    },
    {
      key: "incidentMttrMinutes",
      label: sloLabels.incidentMttrMinutes,
      current: slo.current.incidentMttrMinutes,
      target: slo.targets.maxIncidentMttrMinutes,
    },
    {
      key: "openAlerts",
      label: sloLabels.openAlerts,
      current: slo.current.openAlerts,
      target: slo.targets.maxOpenAlerts,
    },
    {
      key: "openCriticalAlerts",
      label: sloLabels.openCriticalAlerts,
      current: slo.current.openCriticalAlerts,
      target: slo.targets.maxOpenCriticalAlerts,
    },
  ];
}

export default function AlertsPage() {
  const { t, lang } = useI18n();
  const locale = langToLocale[lang];
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams?.toString() ?? "";
  const instanceIdFromUrl = searchParams?.get("instanceId")?.trim() || "";

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
  const [filterType, setFilterType] = useState<string | "All">("All");
  const [query, setQuery] = useState("");
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [instanceId, setInstanceId] = useState<string>(() => {
    try {
      if (typeof window === "undefined") return "default";
      const saved = window.localStorage.getItem("oracleFilters");
      if (!saved) return "default";
      const parsed = JSON.parse(saved) as { instanceId?: unknown } | null;
      const value =
        parsed && typeof parsed === "object" ? parsed.instanceId : null;
      if (typeof value === "string" && value.trim()) return value.trim();
    } catch {
      return "default";
    }
    return "default";
  });
  const [instances, setInstances] = useState<OracleInstance[] | null>(null);
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
    rootCause: string;
    runbook: string;
    entityType: string;
    entityId: string;
    summary: string;
  } | null>(null);
  const [risks, setRisks] = useState<RiskItem[]>([]);
  const [risksError, setRisksError] = useState<string | null>(null);
  const [risksLoading, setRisksLoading] = useState(false);
  const [opsMetrics, setOpsMetrics] = useState<OpsMetrics | null>(null);
  const [opsMetricsSeries, setOpsMetricsSeries] = useState<
    OpsMetricsSeriesPoint[] | null
  >(null);
  const [opsMetricsError, setOpsMetricsError] = useState<string | null>(null);
  const [opsMetricsLoading, setOpsMetricsLoading] = useState(false);
  const [sloIncidentCreating, setSloIncidentCreating] = useState(false);
  const [sloIncidentError, setSloIncidentError] = useState<string | null>(null);
  const rootCauseOptions = useMemo(
    () => [
      { value: "", label: "Unspecified" },
      { value: "sync", label: "Sync" },
      { value: "rpc", label: "RPC provider" },
      { value: "chain", label: "Chain issue" },
      { value: "contract", label: "Contract" },
      { value: "infra", label: "Infrastructure" },
      { value: "config", label: "Configuration" },
      { value: "data", label: "Data quality" },
      { value: "external", label: "External dependency" },
      { value: "unknown", label: "Unknown" },
    ],
    [],
  );
  const sloAlertTypes = useMemo(
    () =>
      new Set([
        "sync_backlog",
        "sync_error",
        "backlog_assertions",
        "backlog_disputes",
        "stale_sync",
        "contract_paused",
        "market_stale",
        "slow_api_request",
        "high_error_rate",
        "database_slow_query",
      ]),
    [],
  );

  const rulesById = useCallback(() => {
    const map = new Map<string, AlertRule>();
    for (const r of rules ?? []) map.set(r.id, r);
    return map;
  }, [rules]);

  useEffect(() => {
    if (!instanceIdFromUrl) return;
    if (instanceIdFromUrl === instanceId) return;
    setInstanceId(instanceIdFromUrl);
  }, [instanceIdFromUrl, instanceId]);

  useEffect(() => {
    const normalized = instanceId.trim();
    const params = new URLSearchParams(currentSearch);
    if (normalized) params.set("instanceId", normalized);
    else params.delete("instanceId");
    const nextSearch = params.toString();
    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    const currentUrl = currentSearch
      ? `${pathname}?${currentSearch}`
      : pathname;
    if (nextUrl !== currentUrl)
      router.replace(nextUrl as Route, { scroll: false });
  }, [instanceId, pathname, router, currentSearch]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    fetchApiData<{ instances: OracleInstance[] }>("/api/oracle/instances", {
      signal: controller.signal,
    })
      .then((r) => {
        if (!cancelled) setInstances(r.instances);
      })
      .catch(() => {
        if (!cancelled) setInstances(null);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("oracleFilters");
      const parsed =
        raw && raw.trim()
          ? (JSON.parse(raw) as Record<string, unknown> | null)
          : null;
      const next = {
        ...(parsed && typeof parsed === "object" ? parsed : {}),
        instanceId,
      };
      window.localStorage.setItem("oracleFilters", JSON.stringify(next));
    } catch {
      void 0;
    }
  }, [instanceId]);

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

  const attachInstanceId = useCallback(
    (path: string) => {
      if (!instanceId) return path;
      if (!path.startsWith("/oracle") && !path.startsWith("/disputes"))
        return path;
      const normalized = instanceId.trim();
      if (!normalized) return path;
      const url = new URL(path, "http://insight.local");
      url.searchParams.set("instanceId", normalized);
      return `${url.pathname}${url.search}${url.hash}`;
    },
    [instanceId],
  );

  const loadIncidents = useCallback(async () => {
    setIncidentsError(null);
    setIncidentsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      params.set("includeAlerts", "1");
      if (instanceId) params.set("instanceId", instanceId);
      const data = await fetchApiData<{ items: IncidentWithAlerts[] }>(
        `/api/oracle/incidents?${params.toString()}`,
      );
      setIncidents(data.items ?? []);
    } catch (e) {
      setIncidentsError(getErrorCode(e));
    } finally {
      setIncidentsLoading(false);
    }
  }, [instanceId]);

  const loadRisks = useCallback(async () => {
    setRisksError(null);
    setRisksLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", "20");
      if (instanceId) params.set("instanceId", instanceId);
      const data = await fetchApiData<{ items: RiskItem[] }>(
        `/api/oracle/risks?${params.toString()}`,
      );
      setRisks(data.items ?? []);
    } catch (e) {
      setRisksError(getErrorCode(e));
    } finally {
      setRisksLoading(false);
    }
  }, [instanceId]);

  const loadOpsMetrics = useCallback(async () => {
    setOpsMetricsError(null);
    setOpsMetricsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("windowDays", "7");
      params.set("seriesDays", "7");
      if (instanceId) params.set("instanceId", instanceId);
      const data = await fetchApiData<{
        metrics: OpsMetrics;
        series: OpsMetricsSeriesPoint[] | null;
      }>(`/api/oracle/ops-metrics?${params.toString()}`);
      setOpsMetrics(data.metrics ?? null);
      setOpsMetricsSeries(data.series ?? null);
    } catch (e) {
      setOpsMetricsError(getErrorCode(e));
      setOpsMetricsSeries(null);
    } finally {
      setOpsMetricsLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    void loadIncidents();
    void loadRisks();
    void loadOpsMetrics();
  }, [loadIncidents, loadOpsMetrics, loadRisks]);

  const loadAlerts = useCallback(
    async (cursor: number | null) => {
      setError(null);
      const params = new URLSearchParams();
      if (instanceId) params.set("instanceId", instanceId);
      if (filterStatus !== "All") params.set("status", filterStatus);
      if (filterSeverity !== "All") params.set("severity", filterSeverity);
      if (filterType !== "All") params.set("type", filterType);
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
    [filterSeverity, filterStatus, filterType, query, instanceId],
  );

  const focusOpenCritical = useCallback(() => {
    setFilterStatus("Open");
    setFilterSeverity("critical");
    setFilterType("All");
    setQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const focusOpenAlerts = useCallback(() => {
    setFilterStatus("Open");
    setFilterSeverity("All");
    setFilterType("All");
    setQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const scrollToIncidents = useCallback(() => {
    const el = document.getElementById("incidents-panel");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, []);

  const scrollToSlo = useCallback(() => {
    const el = document.getElementById("slo-panel");
    if (el) el.scrollIntoView({ behavior: "smooth" });
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await loadAlerts(null);
      setItems(data.items ?? []);
      setNextCursor(data.nextCursor ?? null);
      void loadIncidents();
      void loadRisks();
      void loadOpsMetrics();
    } catch (e) {
      setError(getErrorCode(e));
    } finally {
      setLoading(false);
    }
  }, [loadAlerts, loadIncidents, loadOpsMetrics, loadRisks]);

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

  const collectSloAlertIds = useCallback(
    async (slo: OpsSloStatus) => {
      const keys = new Set(slo.breaches.map((b) => b.key));
      const ids = new Set<number>();
      const lagTypes = [
        "sync_backlog",
        "sync_error",
        "backlog_assertions",
        "backlog_disputes",
      ];
      const stalenessTypes = [
        "stale_sync",
        "sync_error",
        "contract_paused",
        "market_stale",
      ];
      const performanceTypes = [
        "slow_api_request",
        "high_error_rate",
        "database_slow_query",
      ];

      const fetchIds = async (params: {
        status?: AlertStatus | "All";
        severity?: AlertSeverity | "All";
        type?: string | "All";
      }) => {
        const search = new URLSearchParams();
        if (instanceId) search.set("instanceId", instanceId);
        if (params.status && params.status !== "All")
          search.set("status", params.status);
        if (params.severity && params.severity !== "All")
          search.set("severity", params.severity);
        if (params.type && params.type !== "All")
          search.set("type", params.type);
        search.set("limit", "50");
        const data = await fetchApiData<{ items: Alert[] }>(
          `/api/oracle/alerts?${search.toString()}`,
        );
        for (const item of data.items ?? []) {
          if (Number.isFinite(item.id)) ids.add(item.id);
        }
      };

      if (keys.has("lagBlocks")) {
        for (const type of lagTypes) {
          await fetchIds({ status: "Open", type });
        }
      }
      if (keys.has("syncStalenessMinutes")) {
        for (const type of stalenessTypes) {
          await fetchIds({ status: "Open", type });
        }
      }
      if (keys.has("openAlerts")) {
        await fetchIds({ status: "Open" });
      }
      if (keys.has("openCriticalAlerts")) {
        await fetchIds({ status: "Open", severity: "critical" });
      }
      if (keys.has("alertMttaMinutes")) {
        await fetchIds({ status: "Acknowledged" });
        await fetchIds({ status: "Open" });
        for (const type of performanceTypes) {
          await fetchIds({ status: "Open", type });
        }
      }
      if (keys.has("alertMttrMinutes")) {
        await fetchIds({ status: "Resolved" });
        await fetchIds({ status: "Open" });
        for (const type of performanceTypes) {
          await fetchIds({ status: "Open", type });
        }
      }
      if (keys.has("incidentMttrMinutes")) {
        for (const incident of incidents) {
          for (const id of incident.alertIds ?? []) {
            if (Number.isFinite(id)) ids.add(id);
          }
        }
      }

      return Array.from(ids);
    },
    [incidents, instanceId],
  );

  const createIncidentFromSlo = useCallback(async () => {
    if (!canAdmin) return;
    const slo = opsMetrics?.slo ?? null;
    if (!slo || slo.status === "met") return;
    setSloIncidentError(null);
    setSloIncidentCreating(true);
    try {
      const severity: AlertSeverity =
        slo.status === "breached" ? "critical" : "warning";
      const title = `SLO ${sloStatusLabel(slo.status)}`;
      const breachText =
        slo.breaches.length > 0
          ? slo.breaches
              .map(
                (b) =>
                  `${sloLabels[b.key] ?? b.key}: ${formatSloValue(
                    b.key,
                    b.actual,
                  )} > ${formatSloTarget(b.key, b.target)}`,
              )
              .join("; ")
          : "Missing SLO data";
      const summary = `Instance ${instanceId || "default"}; ${breachText}`;
      const alertIds = await collectSloAlertIds(slo);
      await fetchApiData<{ ok: true; incident: Incident }>(
        "/api/oracle/incidents",
        {
          method: "POST",
          headers: { "content-type": "application/json", ...adminHeaders },
          body: JSON.stringify({
            title,
            severity,
            summary,
            entityType: "slo",
            entityId: instanceId || "default",
            alertIds: alertIds.length > 0 ? alertIds : undefined,
          }),
        },
      );
      await loadIncidents();
      scrollToIncidents();
    } catch (e) {
      setSloIncidentError(getErrorCode(e));
    } finally {
      setSloIncidentCreating(false);
    }
  }, [
    adminHeaders,
    canAdmin,
    collectSloAlertIds,
    instanceId,
    loadIncidents,
    opsMetrics,
    scrollToIncidents,
  ]);

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
      rootCause: i.rootCause ?? "",
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
      rootCause: incidentDraft.rootCause.trim()
        ? incidentDraft.rootCause.trim()
        : null,
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
    setFilterType("All");
    setQuery("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const alertTypeOptions = useMemo(() => {
    const set = new Set<string>();
    for (const r of rules ?? []) {
      if (r.event) set.add(r.event);
    }
    for (const a of items ?? []) {
      if (a.type) set.add(a.type);
    }
    return Array.from(set).sort();
  }, [items, rules]);

  const handleSloBreachClick = useCallback(
    (key: string) => {
      if (key === "openCriticalAlerts") {
        focusOpenCritical();
        return;
      }
      if (key === "openAlerts") {
        focusOpenAlerts();
        return;
      }
      if (key === "incidentMttrMinutes") {
        scrollToIncidents();
        return;
      }
      if (key === "alertMttaMinutes" || key === "alertMttrMinutes") {
        focusOpenAlerts();
        return;
      }
      if (key === "lagBlocks") {
        setFilterType("sync_backlog");
        setFilterStatus("Open");
        setFilterSeverity("All");
        setQuery("");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      if (key === "syncStalenessMinutes") {
        setFilterType("stale_sync");
        setFilterStatus("Open");
        setFilterSeverity("All");
        setQuery("");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      setFilterType("All");
      applyQuery(key);
    },
    [applyQuery, focusOpenAlerts, focusOpenCritical, scrollToIncidents],
  );

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
        if (filterType !== "All") params.set("type", filterType);
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
  }, [filterStatus, filterSeverity, filterType, query]);

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

  const slo = opsMetrics?.slo ?? null;
  const sloEntries = slo ? getSloEntries(slo) : [];
  const opsSeriesChartData = useMemo(() => {
    if (!opsMetricsSeries || opsMetricsSeries.length === 0) return [];
    return opsMetricsSeries.map((point) => ({
      ...point,
      label: new Date(point.date).toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
      }),
    }));
  }, [locale, opsMetricsSeries]);
  const hasOpsSeries = opsSeriesChartData.length >= 2;

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
                  value={instanceId}
                  onChange={(e) => setInstanceId(e.target.value)}
                  className="h-9 rounded-lg border-none bg-white/50 px-3 text-sm text-purple-900 shadow-sm focus:ring-2 focus:ring-purple-500/20"
                >
                  {(() => {
                    const list = (instances ?? []).filter(
                      (i) => i.enabled || i.id === instanceId,
                    );
                    if (list.length === 0) {
                      return (
                        <option value={instanceId}>
                          {instanceId || "default"}
                        </option>
                      );
                    }
                    return list.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} ({i.id})
                      </option>
                    ));
                  })()}
                </select>
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

                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="h-9 rounded-lg border-none bg-white/50 px-3 text-sm text-purple-900 shadow-sm focus:ring-2 focus:ring-purple-500/20"
                >
                  <option value="All">{t("common.all")}</option>
                  {filterType !== "All" &&
                  !alertTypeOptions.includes(filterType) ? (
                    <option value={filterType}>{filterType}</option>
                  ) : null}
                  {alertTypeOptions.map((event) => (
                    <option key={event} value={event}>
                      {event}
                    </option>
                  ))}
                </select>

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("alerts.searchPlaceholder")}
                  className="h-9 w-full rounded-lg border-none bg-white/50 px-3 text-sm text-purple-900 shadow-sm placeholder:text-purple-300 focus:ring-2 focus:ring-purple-500/20 sm:w-64"
                />
                {filterStatus !== "All" ||
                filterSeverity !== "All" ||
                filterType !== "All" ||
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
                  const isSloRelated = sloAlertTypes.has(a.type);
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
                            {isSloRelated ? (
                              <button
                                type="button"
                                onClick={scrollToSlo}
                                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-purple-50"
                              >
                                SLO
                              </button>
                            ) : null}
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
                              const rawHref = getEntityHref(
                                a.entityType,
                                a.entityId,
                              );
                              const href = rawHref
                                ? attachInstanceId(rawHref)
                                : null;
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
              <div className="flex items-start justify-between gap-2">
                <div className="text-sm font-semibold text-purple-950">
                  {t("oracle.alerts.opsTitle")} (7d)
                </div>
                <div className="text-[11px] text-purple-700/70">
                  {opsMetrics?.generatedAt
                    ? formatTime(opsMetrics.generatedAt, locale)
                    : "—"}
                </div>
              </div>

              {opsMetricsError ? (
                <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50/50 p-2 text-xs text-rose-700">
                  {getUiErrorMessage(opsMetricsError, t)}
                </div>
              ) : null}

              {opsMetricsLoading ? (
                <div className="mt-2 text-xs text-purple-700/70">
                  {t("common.loading")}
                </div>
              ) : !opsMetrics ? (
                <div className="mt-2 text-xs text-purple-700/70">
                  {t("common.noData")}
                </div>
              ) : (
                <>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg border border-purple-100/60 bg-white/60 p-2">
                      <div className="text-[11px] text-purple-700/70">
                        {t("oracle.alerts.opsAlertsOpen")}
                      </div>
                      <div className="text-sm font-semibold text-purple-950">
                        {opsMetrics.alerts.open}
                      </div>
                    </div>
                    <div className="rounded-lg border border-purple-100/60 bg-white/60 p-2">
                      <div className="text-[11px] text-purple-700/70">
                        {t("oracle.alerts.opsAlertsAcknowledged")}
                      </div>
                      <div className="text-sm font-semibold text-purple-950">
                        {opsMetrics.alerts.acknowledged}
                      </div>
                    </div>
                    <div className="rounded-lg border border-purple-100/60 bg-white/60 p-2">
                      <div className="text-[11px] text-purple-700/70">
                        {t("oracle.alerts.opsMtta")}
                      </div>
                      <div className="text-sm font-semibold text-purple-950">
                        {formatDurationMinutes(
                          (opsMetrics.alerts.mttaMs ?? 0) / 60_000,
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border border-purple-100/60 bg-white/60 p-2">
                      <div className="text-[11px] text-purple-700/70">
                        {t("oracle.alerts.opsAlertMttr")}
                      </div>
                      <div className="text-sm font-semibold text-purple-950">
                        {formatDurationMinutes(
                          (opsMetrics.alerts.mttrMs ?? 0) / 60_000,
                        )}
                      </div>
                    </div>
                    <div className="rounded-lg border border-purple-100/60 bg-white/60 p-2">
                      <div className="text-[11px] text-purple-700/70">
                        {t("oracle.alerts.opsIncidentsOpen")}
                      </div>
                      <div className="text-sm font-semibold text-purple-950">
                        {opsMetrics.incidents.open}
                      </div>
                    </div>
                    <div className="rounded-lg border border-purple-100/60 bg-white/60 p-2">
                      <div className="text-[11px] text-purple-700/70">
                        {t("oracle.alerts.opsIncidentMttr")}
                      </div>
                      <div className="text-sm font-semibold text-purple-950">
                        {formatDurationMinutes(
                          (opsMetrics.incidents.mttrMs ?? 0) / 60_000,
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-purple-100/60 bg-white/60 p-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-[11px] text-purple-700/70">
                        {t("oracle.alerts.opsTrend")}
                      </div>
                      <div className="text-[11px] text-purple-700/70">7d</div>
                    </div>
                    {opsMetricsLoading ? (
                      <div className="mt-2 text-xs text-purple-700/70">
                        {t("common.loading")}
                      </div>
                    ) : !hasOpsSeries ? (
                      <div className="mt-2 text-xs text-purple-700/70">
                        {t("common.noData")}
                      </div>
                    ) : (
                      <div className="mt-2 h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={opsSeriesChartData}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              vertical={false}
                              stroke="#ede9fe"
                            />
                            <XAxis
                              dataKey="label"
                              tick={{ fontSize: 10 }}
                              axisLine={false}
                              tickLine={false}
                            />
                            <YAxis
                              tick={{ fontSize: 10 }}
                              axisLine={false}
                              tickLine={false}
                              allowDecimals={false}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "rgba(255, 255, 255, 0.9)",
                                borderRadius: "12px",
                                border: "1px solid rgba(148, 163, 184, 0.2)",
                              }}
                            />
                            <Legend
                              verticalAlign="bottom"
                              height={18}
                              wrapperStyle={{ fontSize: "10px" }}
                            />
                            <Line
                              type="monotone"
                              dataKey="alertsCreated"
                              name="Alerts created"
                              stroke="#8b5cf6"
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="alertsResolved"
                              name="Alerts resolved"
                              stroke="#22c55e"
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="incidentsCreated"
                              name="Incidents created"
                              stroke="#f97316"
                              strokeWidth={2}
                              dot={false}
                            />
                            <Line
                              type="monotone"
                              dataKey="incidentsResolved"
                              name="Incidents resolved"
                              stroke="#0ea5e9"
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                  {slo ? (
                    <div
                      id="slo-panel"
                      className="mt-3 rounded-lg border border-purple-100/60 bg-white/60 p-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[11px] text-purple-700/70">
                          SLO status
                        </div>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1",
                            sloStatusBadge(slo.status),
                          )}
                        >
                          {slo.status === "met" ? (
                            <CheckCircle2 size={12} />
                          ) : (
                            <AlertTriangle size={12} />
                          )}
                          {sloStatusLabel(slo.status)}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                        {sloEntries.map((entry) => (
                          <div
                            key={entry.key}
                            className="rounded-lg border border-purple-100/60 bg-white/60 p-2"
                          >
                            <div className="text-[11px] text-purple-700/70">
                              {entry.label}
                            </div>
                            <div className="text-sm font-semibold text-purple-950">
                              {formatSloValue(entry.key, entry.current)} /{" "}
                              {formatSloTarget(entry.key, entry.target)}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-purple-700/70">
                        {slo.breaches.length === 0 ? (
                          <span className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-700 ring-1 ring-emerald-100">
                            No breaches
                          </span>
                        ) : (
                          slo.breaches.map((breach) => (
                            <button
                              key={`${breach.key}-${breach.target}`}
                              type="button"
                              onClick={() => handleSloBreachClick(breach.key)}
                              className="rounded-md bg-rose-50 px-2 py-1 text-rose-700 ring-1 ring-rose-100 hover:bg-rose-100"
                            >
                              {sloLabels[breach.key] ?? breach.key}{" "}
                              {formatSloValue(breach.key, breach.actual)} &gt;{" "}
                              {formatSloTarget(breach.key, breach.target)}
                            </button>
                          ))
                        )}
                      </div>
                      {sloIncidentError ? (
                        <div className="mt-2 rounded-lg border border-rose-100 bg-rose-50/50 p-2 text-xs text-rose-700">
                          {getUiErrorMessage(sloIncidentError, t)}
                        </div>
                      ) : null}
                      {canAdmin && slo.status !== "met" ? (
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-purple-700/70">
                          <button
                            type="button"
                            onClick={createIncidentFromSlo}
                            disabled={sloIncidentCreating}
                            className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-purple-50 disabled:opacity-50"
                          >
                            {sloIncidentCreating
                              ? "Creating incident..."
                              : "Create incident"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-purple-700/70">
                    <button
                      type="button"
                      onClick={focusOpenCritical}
                      className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 shadow-sm ring-1 ring-rose-100 hover:bg-rose-50"
                    >
                      Open critical alerts
                    </button>
                    <button
                      type="button"
                      onClick={focusOpenAlerts}
                      className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-purple-50"
                    >
                      Open alerts
                    </button>
                    <button
                      type="button"
                      onClick={scrollToIncidents}
                      className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                    >
                      Incidents
                    </button>
                  </div>
                </>
              )}
            </div>

            <div
              id="incidents-panel"
              className="rounded-xl border border-purple-100/60 bg-white/50 p-3"
            >
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
                    const isSloIncident =
                      i.entityType === "slo" ||
                      (i.alerts ?? []).some((a) => sloAlertTypes.has(a.type));
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
                              {i.rootCause ? (
                                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-purple-50 text-purple-700">
                                  {i.rootCause}
                                </span>
                              ) : null}
                              <span className="text-[11px] text-gray-400">
                                {formatTime(i.updatedAt, locale)}
                              </span>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {isSloIncident ? (
                              <button
                                type="button"
                                onClick={scrollToSlo}
                                className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-purple-50"
                              >
                                SLO
                              </button>
                            ) : null}
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
                                const rawHref = getEntityHref(
                                  i.entityType,
                                  i.entityId,
                                );
                                const href = rawHref
                                  ? attachInstanceId(rawHref)
                                  : null;
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
                                  Root cause
                                </div>
                                <select
                                  value={incidentDraft.rootCause}
                                  onChange={(e) =>
                                    setIncidentDraft((prev) =>
                                      prev
                                        ? {
                                            ...prev,
                                            rootCause: e.target.value,
                                          }
                                        : prev,
                                    )
                                  }
                                  className="w-full rounded-lg border border-purple-100 bg-white px-2 py-1.5 text-xs text-purple-950 outline-none ring-purple-200 focus:ring-2"
                                >
                                  {rootCauseOptions.map((o) => (
                                    <option key={o.value} value={o.value}>
                                      {o.label}
                                    </option>
                                  ))}
                                </select>
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
                                          const rawHref = getEntityHref(
                                            a.entityType,
                                            a.entityId,
                                          );
                                          const href = rawHref
                                            ? attachInstanceId(rawHref)
                                            : null;
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
                {t("oracle.alerts.topRisks")}
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
                    const assertionHrefRaw = r.assertionId?.trim()
                      ? (`/oracle/${r.assertionId}` as Route)
                      : r.entityType === "assertion"
                        ? (`/oracle/${r.entityId}` as Route)
                        : null;
                    const assertionHref = assertionHrefRaw
                      ? (attachInstanceId(assertionHrefRaw) as Route)
                      : null;
                    const disputeHrefRaw = r.disputeId?.trim()
                      ? (`/disputes?q=${encodeURIComponent(
                          r.disputeId,
                        )}` as Route)
                      : null;
                    const disputeHref = disputeHrefRaw
                      ? (attachInstanceId(disputeHrefRaw) as Route)
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
                                href={attachInstanceId("/disputes") as Route}
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
