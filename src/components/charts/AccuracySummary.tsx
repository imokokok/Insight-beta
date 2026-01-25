"use client";

import { cn } from "@/lib/utils";
import type {
  TabKey,
  Translator,
  AccuracyStats,
  AccuracyAnomaly,
} from "./types";

const ANOMALY_WARNING_THRESHOLD = 0.02;

interface AccuracySummaryProps {
  activeTab: TabKey;
  accuracyLoading: boolean;
  hasAccuracyData: boolean;
  accuracyStats: AccuracyStats | null;
  healthScore: number;
  accuracyAnomalies: AccuracyAnomaly[];
  formatPercent: (value: number | null) => string;
  t: Translator;
  locale: string;
}

function AccuracySummary({
  activeTab,
  accuracyLoading,
  hasAccuracyData,
  accuracyStats,
  healthScore,
  accuracyAnomalies,
  formatPercent,
  t,
  locale,
}: AccuracySummaryProps) {
  if (activeTab !== "accuracy" || accuracyLoading || !hasAccuracyData)
    return null;

  return (
    <div className="mt-4 grid gap-4 lg:grid-cols-3">
      <div className="lg:col-span-2 rounded-2xl bg-white/60 ring-1 ring-black/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-bold text-gray-900">
            {t("oracle.charts.dataQualitySummary")}
          </div>
          <div className="text-xs text-gray-500">
            {t("oracle.charts.lastSample")}:{" "}
            {accuracyStats?.lastTimestamp
              ? new Date(accuracyStats.lastTimestamp).toLocaleString(locale, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "—"}
          </div>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 px-3 py-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              {t("oracle.charts.healthScore")}
            </div>
            <div className="text-xl font-black text-emerald-900">
              {healthScore}
            </div>
          </div>
          <div className="rounded-xl border border-slate-100 bg-white/60 px-3 py-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
              {t("oracle.charts.deviationAvg")}
            </div>
            <div className="text-xl font-black text-gray-900">
              {formatPercent(accuracyStats?.avgDeviation ?? null)}
            </div>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50/60 px-3 py-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-rose-600">
              {t("oracle.charts.deviationMax")}
            </div>
            <div className="text-xl font-black text-rose-800">
              {formatPercent(accuracyStats?.maxDeviation ?? null)}
            </div>
          </div>
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2">
            <div className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              {t("oracle.charts.deviationLatest")}
            </div>
            <div className="text-xl font-black text-blue-800">
              {formatPercent(accuracyStats?.lastDeviation ?? null)}
            </div>
          </div>
        </div>
        <div className="mt-3 text-xs text-gray-500">
          {t("oracle.charts.dataSamples")}: {accuracyStats?.samples ?? 0}
        </div>
      </div>
      <div className="rounded-2xl bg-white/60 ring-1 ring-black/5 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="text-sm font-bold text-gray-900">
            {t("oracle.charts.anomalyView")}
          </div>
          <div className="text-[11px] font-semibold text-gray-500">
            {t("oracle.charts.anomalyThreshold")}:{" "}
            {(ANOMALY_WARNING_THRESHOLD * 100).toFixed(1)}%
          </div>
        </div>
        {accuracyAnomalies.length === 0 ? (
          <div className="mt-3 text-xs text-emerald-700">
            {t("oracle.charts.anomalyNone")}
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            {accuracyAnomalies.map((item, idx) => (
              <div
                key={`${item.timestamp}-${idx}`}
                className={cn(
                  "flex items-center justify-between gap-3 rounded-xl px-3 py-2 border",
                  item.severity === "critical"
                    ? "bg-rose-50/60 border-rose-100 text-rose-800"
                    : "bg-amber-50/60 border-amber-100 text-amber-800",
                )}
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold truncate">
                    {new Date(item.timestamp).toLocaleString(locale, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {t("oracle.charts.deviationPercent")}:{" "}
                    {formatPercent(item.deviation)}
                  </div>
                </div>
                <div
                  className={cn(
                    "shrink-0 text-[10px] font-black uppercase tracking-wider rounded-lg px-2 py-1",
                    item.severity === "critical"
                      ? "bg-rose-100 text-rose-700"
                      : "bg-amber-100 text-amber-700",
                  )}
                >
                  {t(
                    item.severity === "critical"
                      ? "oracle.alerts.severities.critical"
                      : "oracle.alerts.severities.warning",
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { AccuracySummary };
