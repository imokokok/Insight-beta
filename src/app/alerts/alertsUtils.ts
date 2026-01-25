import { formatDurationMinutes } from "@/lib/utils";
import type {
  AlertSeverity,
  AlertStatus,
  OpsSloStatus,
} from "@/lib/types/oracleTypes";
import type { TranslationKey } from "@/i18n/translations";

export type RootCauseOption = { value: string; label: string };

export type SloEntry = {
  key: string;
  label: string | undefined;
  current: number | null;
  target: number;
};

export function getEntityHref(entityType: string, entityId: string) {
  const id = entityId.trim();
  if (!id) return null;
  if (entityType === "api" && id.startsWith("/")) return id;
  if (entityType === "oracle" && /^0x[a-fA-F0-9]{40}$/.test(id))
    return `/oracle/address/${id}`;
  if (/^0x[a-fA-F0-9]{40}$/.test(id)) return `/oracle/address/${id}`;
  if (/^0x[a-fA-F0-9]{64}$/.test(id)) return `/oracle/${id}`;
  return null;
}

export function getSafeExternalUrl(raw: string) {
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

export function getSafeInternalPath(raw: string) {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (/\s/.test(trimmed)) return null;
  return trimmed;
}

export function severityBadge(severity: AlertSeverity) {
  if (severity === "critical")
    return "bg-rose-100 text-rose-700 border-rose-200";
  if (severity === "warning")
    return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function statusBadge(status: AlertStatus) {
  if (status === "Open") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (status === "Acknowledged")
    return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-emerald-50 text-emerald-700 ring-emerald-200";
}

export const sloLabels: Record<string, string> = {
  lagBlocks: "Sync lag blocks",
  syncStalenessMinutes: "Sync staleness",
  alertMttaMinutes: "Alert MTTA",
  alertMttrMinutes: "Alert MTTR",
  incidentMttrMinutes: "Incident MTTR",
  openAlerts: "Open alerts",
  openCriticalAlerts: "Open critical",
};

export const rootCauseOptions: RootCauseOption[] = [
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
];

export const sloAlertTypes = new Set([
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
]);

export const alertInsightMap: Record<
  string,
  { explanation: TranslationKey; actions: TranslationKey[] }
> = {
  dispute_created: {
    explanation: "alerts.explanations.dispute_created",
    actions: [
      "alerts.actions.dispute_created.1",
      "alerts.actions.dispute_created.2",
    ],
  },
  liveness_expiring: {
    explanation: "alerts.explanations.liveness_expiring",
    actions: [
      "alerts.actions.liveness_expiring.1",
      "alerts.actions.liveness_expiring.2",
    ],
  },
  sync_error: {
    explanation: "alerts.explanations.sync_error",
    actions: ["alerts.actions.sync_error.1", "alerts.actions.sync_error.2"],
  },
  stale_sync: {
    explanation: "alerts.explanations.stale_sync",
    actions: ["alerts.actions.stale_sync.1", "alerts.actions.stale_sync.2"],
  },
  contract_paused: {
    explanation: "alerts.explanations.contract_paused",
    actions: [
      "alerts.actions.contract_paused.1",
      "alerts.actions.contract_paused.2",
    ],
  },
  sync_backlog: {
    explanation: "alerts.explanations.sync_backlog",
    actions: ["alerts.actions.sync_backlog.1", "alerts.actions.sync_backlog.2"],
  },
  backlog_assertions: {
    explanation: "alerts.explanations.backlog_assertions",
    actions: [
      "alerts.actions.backlog_assertions.1",
      "alerts.actions.backlog_assertions.2",
    ],
  },
  backlog_disputes: {
    explanation: "alerts.explanations.backlog_disputes",
    actions: [
      "alerts.actions.backlog_disputes.1",
      "alerts.actions.backlog_disputes.2",
    ],
  },
  market_stale: {
    explanation: "alerts.explanations.market_stale",
    actions: ["alerts.actions.market_stale.1", "alerts.actions.market_stale.2"],
  },
  execution_delayed: {
    explanation: "alerts.explanations.execution_delayed",
    actions: [
      "alerts.actions.execution_delayed.1",
      "alerts.actions.execution_delayed.2",
    ],
  },
  low_participation: {
    explanation: "alerts.explanations.low_participation",
    actions: [
      "alerts.actions.low_participation.1",
      "alerts.actions.low_participation.2",
    ],
  },
  high_vote_divergence: {
    explanation: "alerts.explanations.high_vote_divergence",
    actions: [
      "alerts.actions.high_vote_divergence.1",
      "alerts.actions.high_vote_divergence.2",
    ],
  },
  high_dispute_rate: {
    explanation: "alerts.explanations.high_dispute_rate",
    actions: [
      "alerts.actions.high_dispute_rate.1",
      "alerts.actions.high_dispute_rate.2",
    ],
  },
  slow_api_request: {
    explanation: "alerts.explanations.slow_api_request",
    actions: [
      "alerts.actions.slow_api_request.1",
      "alerts.actions.slow_api_request.2",
    ],
  },
  high_error_rate: {
    explanation: "alerts.explanations.high_error_rate",
    actions: [
      "alerts.actions.high_error_rate.1",
      "alerts.actions.high_error_rate.2",
    ],
  },
  database_slow_query: {
    explanation: "alerts.explanations.database_slow_query",
    actions: [
      "alerts.actions.database_slow_query.1",
      "alerts.actions.database_slow_query.2",
    ],
  },
  price_deviation: {
    explanation: "alerts.explanations.price_deviation",
    actions: [
      "alerts.actions.price_deviation.1",
      "alerts.actions.price_deviation.2",
    ],
  },
  low_gas: {
    explanation: "alerts.explanations.low_gas",
    actions: ["alerts.actions.low_gas.1", "alerts.actions.low_gas.2"],
  },
};

export function sloStatusBadge(status: OpsSloStatus["status"]) {
  if (status === "met")
    return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "degraded") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-rose-50 text-rose-700 ring-rose-200";
}

export function sloStatusLabel(status: OpsSloStatus["status"]) {
  if (status === "met") return "Met";
  if (status === "degraded") return "Degraded";
  return "Breached";
}

export function formatSloValue(key: string, value: number | null) {
  if (value === null || !Number.isFinite(value)) return "—";
  if (key.includes("Minutes")) return formatDurationMinutes(value);
  return value.toLocaleString();
}

export function formatSloTarget(key: string, value: number) {
  if (!Number.isFinite(value)) return "—";
  if (key.includes("Minutes")) return formatDurationMinutes(value);
  return value.toLocaleString();
}

export function getSloEntries(slo: OpsSloStatus): SloEntry[] {
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

export function getInitialInstanceId() {
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
}
