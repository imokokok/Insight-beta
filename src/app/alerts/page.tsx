"use client";

import { useCallback, useEffect, useState } from "react";
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
import type { Alert, AlertSeverity, AlertStatus } from "@/lib/oracleTypes";

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
    } catch (e) {
      setError(getErrorCode(e));
    } finally {
      setLoading(false);
    }
  }, [loadAlerts]);

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
              items.map((a) => (
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
                          </div>
                          <p className="mt-1 text-sm text-purple-800/80">
                            {a.message}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {canAdmin &&
                          a.status !== "Acknowledged" &&
                          a.status !== "Resolved" && (
                            <button
                              type="button"
                              onClick={() => updateAlert(a.id, "Acknowledged")}
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
                      {a.entityType && a.entityId && (
                        <span className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100 font-mono">
                          {a.entityType}:{a.entityId.slice(0, 10)}…
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

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
