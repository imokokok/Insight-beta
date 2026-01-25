"use client";

import type { Dispatch, SetStateAction } from "react";
import Link from "next/link";
import type { Route } from "next";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn, formatDurationMinutes, formatTime } from "@/lib/utils";
import { getUiErrorMessage, type TranslationKey } from "@/i18n/translations";
import type {
  Alert,
  AlertRule,
  AlertSeverity,
  AlertStatus,
  Incident,
  OpsMetrics,
  OpsMetricsSeriesPoint,
  OpsSloStatus,
} from "@/lib/types/oracleTypes";
import {
  alertInsightMap,
  formatSloTarget,
  formatSloValue,
  getEntityHref,
  getSafeExternalUrl,
  getSafeInternalPath,
  severityBadge,
  sloLabels,
  sloStatusBadge,
  sloStatusLabel,
  statusBadge,
  type RootCauseOption,
  type SloEntry,
} from "./alertsUtils";

export type IncidentDraft = {
  title: string;
  severity: AlertSeverity;
  owner: string;
  rootCause: string;
  runbook: string;
  entityType: string;
  entityId: string;
  summary: string;
};

export type IncidentWithAlerts = Incident & { alerts?: Alert[] };

export type OpsSeriesPoint = OpsMetricsSeriesPoint & { label: string };

type AlertCardProps = {
  alert: Alert;
  rule?: AlertRule;
  isSilenced: boolean;
  silencedUntilMs: number;
  locale: string;
  canAdmin: boolean;
  rulesSaving: boolean;
  isSloRelated: boolean;
  t: (key: TranslationKey) => string;
  onScrollToSlo: () => void;
  onCreateIncident: () => void;
  onUpdateAlert: (alertId: number, status: AlertStatus) => void;
  onSetRuleSilenceMinutes: (ruleId: string, minutes: number | null) => void;
  attachInstanceId: (path: string) => string;
};

type SloStatusCardProps = {
  slo: OpsSloStatus;
  sloEntries: SloEntry[];
  t: (key: TranslationKey) => string;
  onBreachClick: (key: string) => void;
  onCreateIncidentFromSlo: () => void;
  sloIncidentError: string | null;
  sloIncidentCreating: boolean;
  canAdmin: boolean;
};

type OpsMetricsCardProps = {
  opsMetrics: OpsMetrics | null;
  opsMetricsError: string | null;
  opsMetricsLoading: boolean;
  locale: string;
  t: (key: TranslationKey) => string;
  hasOpsSeries: boolean;
  opsSeriesChartData: OpsSeriesPoint[];
  slo: OpsSloStatus | null;
  sloEntries: SloEntry[];
  onHandleSloBreachClick: (key: string) => void;
  onCreateIncidentFromSlo: () => void;
  sloIncidentError: string | null;
  sloIncidentCreating: boolean;
  canAdmin: boolean;
  onFocusOpenCritical: () => void;
  onFocusOpenAlerts: () => void;
  onScrollToIncidents: () => void;
};

type IncidentCardProps = {
  incident: IncidentWithAlerts;
  isSloIncident: boolean;
  incidentQuery: string;
  canAdmin: boolean;
  editingIncidentId: number | null;
  incidentDraft: IncidentDraft | null;
  setIncidentDraft: Dispatch<SetStateAction<IncidentDraft | null>>;
  rootCauseOptions: RootCauseOption[];
  locale: string;
  onStartEditIncident: (i: IncidentWithAlerts) => void;
  onCancelEditIncident: () => void;
  onSaveIncidentEdit: () => void;
  onPatchIncidentStatus: (id: number, status: Incident["status"]) => void;
  onIncidentAction: (
    id: number,
    action: "ack_alerts" | "resolve_alerts",
  ) => void;
  onApplyQuery: (query: string) => void;
  onScrollToSlo: () => void;
  attachInstanceId: (path: string) => string;
};

type EntityPillProps = {
  entityType: string | null | undefined;
  entityId: string | null | undefined;
  attachInstanceId: (path: string) => string;
  sliceChars?: number;
  density?: "default" | "compact";
  onNoHrefClick?: (() => void) | undefined;
};

export function EntityPill({
  entityType,
  entityId,
  attachInstanceId,
  sliceChars = 18,
  density = "default",
  onNoHrefClick,
}: EntityPillProps) {
  if (!entityType || !entityId) return null;
  const rawHref = getEntityHref(entityType, entityId);
  const href = rawHref ? attachInstanceId(rawHref) : null;
  const display =
    entityId.length > sliceChars
      ? `${entityId.slice(0, sliceChars)}…`
      : entityId;
  const text = `${entityType}:${display}`;
  const baseClassName = cn(
    "rounded-md bg-gray-50 px-2 border border-gray-100 font-mono",
    density === "compact" ? "py-0.5 text-[11px]" : "py-1 text-xs",
  );
  const interactiveClassName = cn(baseClassName, "hover:bg-white");

  if (href) {
    if (href.startsWith("/api/")) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={interactiveClassName}
        >
          {text}
        </a>
      );
    }
    return (
      <Link href={href as Route} className={interactiveClassName}>
        {text}
      </Link>
    );
  }

  if (onNoHrefClick) {
    return (
      <button
        type="button"
        onClick={onNoHrefClick}
        className={interactiveClassName}
      >
        {text}
      </button>
    );
  }

  return <span className={baseClassName}>{text}</span>;
}

type RunbookPillProps = {
  label: string;
  runbook: string | null | undefined;
};

export function RunbookPill({ label, runbook }: RunbookPillProps) {
  const raw = (runbook ?? "").trim();
  if (!raw) return null;
  const internal = getSafeInternalPath(raw);
  if (internal) {
    if (internal.startsWith("/api/")) {
      return (
        <a
          href={internal}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100 hover:bg-white"
        >
          {label}
        </a>
      );
    }
    return (
      <Link
        href={internal as Route}
        className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100 hover:bg-white"
      >
        {label}
      </Link>
    );
  }
  const external = getSafeExternalUrl(raw);
  return external ? (
    <a
      href={external}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100 hover:bg-white"
    >
      {label}
    </a>
  ) : null;
}

export function AlertCard({
  alert,
  rule,
  isSilenced,
  silencedUntilMs,
  locale,
  canAdmin,
  rulesSaving,
  isSloRelated,
  t,
  onScrollToSlo,
  onCreateIncident,
  onUpdateAlert,
  onSetRuleSilenceMinutes,
  attachInstanceId,
}: AlertCardProps) {
  return (
    <Card className="border-purple-100/60 bg-white/60 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="flex gap-3">
            <div
              className={cn(
                "mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm",
                alert.severity === "critical"
                  ? "bg-rose-100 text-rose-600"
                  : alert.severity === "warning"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-600",
              )}
            >
              {alert.status === "Resolved" ? (
                <CheckCircle2 size={18} />
              ) : (
                <AlertTriangle size={18} />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-semibold text-purple-950">
                  {alert.title}
                </h3>
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                    severityBadge(alert.severity),
                  )}
                >
                  {alert.severity}
                </span>
                <span
                  className={cn(
                    "px-2.5 py-0.5 rounded-full text-xs font-medium ring-1",
                    statusBadge(alert.status),
                  )}
                >
                  {alert.status}
                </span>
                <span className="text-xs text-gray-400 font-medium px-2 py-0.5 bg-gray-50 rounded-md border border-gray-100">
                  {alert.type}
                </span>
                {rule ? (
                  <span className="text-xs text-gray-500 font-medium px-2 py-0.5 bg-gray-50 rounded-md border border-gray-100">
                    {rule.name}
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-purple-800/80">{alert.message}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isSloRelated ? (
              <button
                type="button"
                onClick={onScrollToSlo}
                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-purple-50"
              >
                SLO
              </button>
            ) : null}
            {canAdmin && (
              <button
                type="button"
                onClick={onCreateIncident}
                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
              >
                Incident
              </button>
            )}
            {canAdmin &&
              alert.status !== "Acknowledged" &&
              alert.status !== "Resolved" && (
                <button
                  type="button"
                  onClick={() => onUpdateAlert(alert.id, "Acknowledged")}
                  className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-purple-50"
                >
                  {t("alerts.acknowledge")}
                </button>
              )}
            {canAdmin && alert.status !== "Resolved" && (
              <button
                type="button"
                onClick={() => onUpdateAlert(alert.id, "Resolved")}
                className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-100 hover:bg-emerald-50"
              >
                {t("alerts.resolve")}
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {(() => {
          const insight = alertInsightMap[alert.type];
          if (!insight) return null;
          return (
            <div className="mb-3 rounded-xl border border-slate-100 bg-white/70 p-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                {t("alerts.explanation")}
              </div>
              <div className="mt-1 text-sm text-gray-700">
                {t(insight.explanation)}
              </div>
              <div className="mt-3 text-[11px] font-bold uppercase tracking-wider text-gray-500">
                {t("alerts.recommendedActions")}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {insight.actions.map((actionKey) => (
                  <span
                    key={actionKey}
                    className="rounded-md border border-gray-100 bg-white px-2 py-1 text-[11px] font-semibold text-gray-600"
                  >
                    {t(actionKey)}
                  </span>
                ))}
              </div>
            </div>
          );
        })()}
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1.5 rounded-md bg-gray-50 px-2 py-1 border border-gray-100">
            <Clock size={12} />
            {t("alerts.lastSeen")}: {formatTime(alert.lastSeenAt, locale)}
          </span>
          <span className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100">
            {t("alerts.occurrences")}: {alert.occurrences}
          </span>
          <EntityPill
            entityType={alert.entityType}
            entityId={alert.entityId}
            attachInstanceId={attachInstanceId}
          />
          {rule?.owner ? (
            <span className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100">
              {t("alerts.owner")}:{" "}
              <span className="font-mono">{rule.owner}</span>
            </span>
          ) : null}
          <RunbookPill label={t("alerts.runbook")} runbook={rule?.runbook} />
        </div>

        {canAdmin && rule ? (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {isSilenced ? (
              <>
                <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-100 rounded-md px-2 py-1">
                  {t("alerts.silencedUntil")}:{" "}
                  {formatTime(new Date(silencedUntilMs).toISOString(), locale)}
                </span>
                <button
                  type="button"
                  disabled={rulesSaving}
                  onClick={() => onSetRuleSilenceMinutes(rule.id, null)}
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
                  onClick={() => onSetRuleSilenceMinutes(rule.id, 30)}
                  className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-800 shadow-sm ring-1 ring-amber-100 hover:bg-amber-50 disabled:opacity-50"
                >
                  {t("alerts.silence30m")}
                </button>
                <button
                  type="button"
                  disabled={rulesSaving}
                  onClick={() => onSetRuleSilenceMinutes(rule.id, 120)}
                  className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-amber-800 shadow-sm ring-1 ring-amber-100 hover:bg-amber-50 disabled:opacity-50"
                >
                  {t("alerts.silence2h")}
                </button>
                <button
                  type="button"
                  disabled={rulesSaving}
                  onClick={() => onSetRuleSilenceMinutes(rule.id, 1440)}
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
}

export function SloStatusCard({
  slo,
  sloEntries,
  t,
  onBreachClick,
  onCreateIncidentFromSlo,
  sloIncidentError,
  sloIncidentCreating,
  canAdmin,
}: SloStatusCardProps) {
  return (
    <div
      id="slo-panel"
      className="mt-3 rounded-lg border border-purple-100/60 bg-white/60 p-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] text-purple-700/70">SLO status</div>
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
            <div className="text-[11px] text-purple-700/70">{entry.label}</div>
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
              onClick={() => onBreachClick(breach.key)}
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
            onClick={onCreateIncidentFromSlo}
            disabled={sloIncidentCreating}
            className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-purple-50 disabled:opacity-50"
          >
            {sloIncidentCreating ? "Creating incident..." : "Create incident"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function OpsMetricsCard({
  opsMetrics,
  opsMetricsError,
  opsMetricsLoading,
  locale,
  t,
  hasOpsSeries,
  opsSeriesChartData,
  slo,
  sloEntries,
  onHandleSloBreachClick,
  onCreateIncidentFromSlo,
  sloIncidentError,
  sloIncidentCreating,
  canAdmin,
  onFocusOpenCritical,
  onFocusOpenAlerts,
  onScrollToIncidents,
}: OpsMetricsCardProps) {
  return (
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
            <SloStatusCard
              slo={slo}
              sloEntries={sloEntries}
              t={t}
              onBreachClick={onHandleSloBreachClick}
              onCreateIncidentFromSlo={onCreateIncidentFromSlo}
              sloIncidentError={sloIncidentError}
              sloIncidentCreating={sloIncidentCreating}
              canAdmin={canAdmin}
            />
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-purple-700/70">
            <button
              type="button"
              onClick={onFocusOpenCritical}
              className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-rose-700 shadow-sm ring-1 ring-rose-100 hover:bg-rose-50"
            >
              Open critical alerts
            </button>
            <button
              type="button"
              onClick={onFocusOpenAlerts}
              className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-purple-50"
            >
              Open alerts
            </button>
            <button
              type="button"
              onClick={onScrollToIncidents}
              className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
            >
              Incidents
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export function IncidentCard({
  incident,
  isSloIncident,
  incidentQuery,
  canAdmin,
  editingIncidentId,
  incidentDraft,
  setIncidentDraft,
  rootCauseOptions,
  locale,
  onStartEditIncident,
  onCancelEditIncident,
  onSaveIncidentEdit,
  onPatchIncidentStatus,
  onIncidentAction,
  onApplyQuery,
  onScrollToSlo,
  attachInstanceId,
}: IncidentCardProps) {
  return (
    <div className="rounded-xl border border-purple-100/60 bg-white/60 p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-purple-950">
            {incident.title}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
            <span
              className={cn(
                "px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                severityBadge(incident.severity),
              )}
            >
              {incident.severity}
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-gray-50 text-gray-600">
              {incident.status}
            </span>
            {incident.rootCause ? (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-purple-50 text-purple-700">
                {incident.rootCause}
              </span>
            ) : null}
            <span className="text-[11px] text-gray-400">
              {formatTime(incident.updatedAt, locale)}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {isSloIncident ? (
            <button
              type="button"
              onClick={onScrollToSlo}
              className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-purple-50"
            >
              SLO
            </button>
          ) : null}
          {incidentQuery ? (
            <button
              type="button"
              onClick={() => onApplyQuery(incidentQuery)}
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
                  editingIncidentId === incident.id
                    ? onCancelEditIncident()
                    : onStartEditIncident(incident)
                }
                className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
              >
                {editingIncidentId === incident.id ? "Cancel" : "Edit"}
              </button>
              {incident.alertIds?.length ? (
                <>
                  <button
                    type="button"
                    onClick={() => onIncidentAction(incident.id, "ack_alerts")}
                    className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-purple-50"
                  >
                    Ack alerts
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onIncidentAction(incident.id, "resolve_alerts")
                    }
                    className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-100 hover:bg-emerald-50"
                  >
                    Resolve alerts
                  </button>
                </>
              ) : null}
              {incident.status !== "Mitigating" &&
              incident.status !== "Resolved" ? (
                <button
                  type="button"
                  onClick={() =>
                    onPatchIncidentStatus(incident.id, "Mitigating")
                  }
                  className="rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 shadow-sm ring-1 ring-amber-100 hover:bg-amber-50"
                >
                  Mitigating
                </button>
              ) : null}
              {incident.status !== "Resolved" ? (
                <button
                  type="button"
                  onClick={() => onPatchIncidentStatus(incident.id, "Resolved")}
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
        {incident.owner ? (
          <span className="rounded-md bg-gray-50 px-2 py-1 border border-gray-100">
            Owner: <span className="font-mono">{incident.owner}</span>
          </span>
        ) : null}
        <RunbookPill label="Runbook" runbook={incident.runbook} />
        <EntityPill
          entityType={incident.entityType}
          entityId={incident.entityId}
          attachInstanceId={attachInstanceId}
        />
      </div>
      {incident.summary ? (
        <div className="mt-2 text-xs text-purple-800/80 whitespace-pre-wrap">
          {incident.summary}
        </div>
      ) : null}

      {editingIncidentId === incident.id && incidentDraft ? (
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
                    prev ? { ...prev, title: e.target.value } : prev,
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
                          severity: e.target.value as AlertSeverity,
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
                    prev ? { ...prev, owner: e.target.value } : prev,
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
                    prev ? { ...prev, rootCause: e.target.value } : prev,
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
                    prev ? { ...prev, runbook: e.target.value } : prev,
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
                    prev ? { ...prev, entityType: e.target.value } : prev,
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
                    prev ? { ...prev, entityId: e.target.value } : prev,
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
                  prev ? { ...prev, summary: e.target.value } : prev,
                )
              }
              rows={4}
              className="w-full rounded-lg border border-purple-100 bg-white px-2 py-1.5 text-xs text-purple-950 outline-none ring-purple-200 focus:ring-2"
            />
          </label>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onSaveIncidentEdit}
              disabled={!incidentDraft.title.trim()}
              className="rounded-lg bg-white px-3 py-1.5 text-[11px] font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-purple-50 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      ) : null}

      {incident.alerts?.length ? (
        <div className="mt-3 space-y-2">
          <div className="text-[11px] font-semibold text-purple-900/80">
            Linked alerts
          </div>
          <div className="space-y-1">
            {incident.alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-purple-100/60 bg-white/60 px-2 py-1.5 text-[11px]"
              >
                <div className="min-w-0">
                  <span className="font-mono text-gray-500">#{alert.id}</span>{" "}
                  <span className="text-purple-950">{alert.title}</span>
                </div>
                <div className="flex items-center gap-2">
                  <EntityPill
                    entityType={alert.entityType}
                    entityId={alert.entityId}
                    attachInstanceId={attachInstanceId}
                    sliceChars={14}
                    density="compact"
                    onNoHrefClick={() => onApplyQuery(alert.entityId ?? "")}
                  />
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                      severityBadge(alert.severity),
                    )}
                  >
                    {alert.severity}
                  </span>
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[11px] font-semibold ring-1",
                      statusBadge(alert.status),
                    )}
                  >
                    {alert.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
