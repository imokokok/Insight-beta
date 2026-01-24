"use client";

import { AlertTriangle, Info, ShieldAlert } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { AlertRule, AlertSeverity } from "@/lib/oracleTypes";

interface AlertRuleHeaderProps {
  rule: AlertRule;
  isTesting: boolean;
  canAdmin: boolean;
  ruleError: string | null;
  onToggle: (id: string, enabled: boolean) => void;
  onTest: (ruleId: string) => void;
  t: (key: string) => string;
}

function getSeverityIcon(severity: AlertSeverity) {
  switch (severity) {
    case "critical":
      return <ShieldAlert className="text-rose-500" size={18} />;
    case "warning":
      return <AlertTriangle className="text-amber-500" size={18} />;
    default:
      return <Info className="text-blue-500" size={18} />;
  }
}

function getSeverityLabel(severity: AlertSeverity, t: (key: string) => string) {
  switch (severity) {
    case "critical":
      return t("oracle.alerts.severities.critical");
    case "warning":
      return t("oracle.alerts.severities.warning");
    default:
      return t("oracle.alerts.severities.info");
  }
}

function getSeverityBg(severity: AlertSeverity) {
  switch (severity) {
    case "critical":
      return "bg-rose-50 text-rose-700 ring-rose-500/20";
    case "warning":
      return "bg-amber-50 text-amber-700 ring-amber-500/20";
    default:
      return "bg-blue-50 text-blue-700 ring-blue-500/20";
  }
}

function getEventLabel(event: AlertRule["event"], t: (key: string) => string) {
  if (event === "dispute_created")
    return t("oracle.alerts.events.dispute_created");
  if (event === "contract_paused")
    return t("oracle.alerts.events.contract_paused");
  if (event === "sync_error") return t("oracle.alerts.events.sync_error");
  if (event === "stale_sync") return t("oracle.alerts.events.stale_sync");
  if (event === "sync_backlog") return t("oracle.alerts.events.sync_backlog");
  if (event === "backlog_assertions")
    return t("oracle.alerts.events.backlog_assertions");
  if (event === "backlog_disputes")
    return t("oracle.alerts.events.backlog_disputes");
  if (event === "market_stale") return t("oracle.alerts.events.market_stale");
  if (event === "execution_delayed")
    return t("oracle.alerts.events.execution_delayed");
  if (event === "low_participation")
    return t("oracle.alerts.events.low_participation");
  if (event === "high_vote_divergence")
    return t("oracle.alerts.events.high_vote_divergence");
  if (event === "high_dispute_rate")
    return t("oracle.alerts.events.high_dispute_rate");
  if (event === "slow_api_request")
    return t("oracle.alerts.events.slow_api_request");
  if (event === "high_error_rate")
    return t("oracle.alerts.events.high_error_rate");
  if (event === "database_slow_query")
    return t("oracle.alerts.events.database_slow_query");
  if (event === "liveness_expiring")
    return t("oracle.alerts.events.liveness_expiring");
  if (event === "price_deviation")
    return t("oracle.alerts.events.price_deviation");
  if (event === "low_gas") return t("oracle.alerts.events.low_gas");
  return event;
}

export function AlertRuleHeader({
  rule,
  isTesting,
  canAdmin,
  ruleError,
  onToggle,
  onTest,
  t,
}: AlertRuleHeaderProps) {
  return (
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
            <h3 className="font-bold text-gray-900 truncate">{rule.name}</h3>
            <span
              className={cn(
                "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ring-1 ring-inset",
                getSeverityBg(rule.severity),
              )}
            >
              {getSeverityLabel(rule.severity, t)}
            </span>
          </div>
          <p className="text-sm text-gray-500 font-mono">
            {t("oracle.alerts.ruleId")}: {rule.id} • {t("oracle.alerts.event")}:{" "}
            {getEventLabel(rule.event, t)}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onTest(rule.id)}
          disabled={!canAdmin || Boolean(ruleError) || isTesting}
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
          onCheckedChange={(checked) => onToggle(rule.id, checked)}
          className={cn("data-[state=checked]:bg-purple-600", "h-7 w-12")}
        />
      </div>
    </div>
  );
}
