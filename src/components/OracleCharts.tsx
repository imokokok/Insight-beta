"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchApiData } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";
import { getUiErrorMessage, langToLocale } from "@/i18n/translations";
import { ChartBackground } from "./charts/ChartBackground";
import { ChartsHeader } from "./charts/ChartsHeader";
import { ChartsContent } from "./charts/ChartsContent";
import { AccuracySummary } from "./charts/AccuracySummary";
import type { PricePoint } from "@/server/oracle/priceFetcher";
import { calculateHealthScore } from "@/server/oracle/priceFetcher";
import type {
  ChartItem,
  SyncMetricItem,
  MarketStat,
  AccuracyAnomaly,
  TabKey,
  Translator,
} from "./charts/types";

const getTabBorder = (activeTab: TabKey) =>
  activeTab === "activity"
    ? "border-purple-100/20"
    : activeTab === "tvs"
      ? "border-pink-100/20"
      : activeTab === "sync"
        ? "border-blue-100/20"
        : activeTab === "markets"
          ? "border-orange-100/20"
          : "border-green-100/20";

export function OracleCharts({ instanceId }: { instanceId?: string | null }) {
  const [rawData, setRawData] = useState<ChartItem[]>([]);
  const [rawSyncMetrics, setRawSyncMetrics] = useState<SyncMetricItem[]>([]);
  const [marketStats, setMarketStats] = useState<MarketStat[]>([]);
  const [accuracyData, setAccuracyData] = useState<PricePoint[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  const [marketsLoading, setMarketsLoading] = useState(false);
  const [marketsError, setMarketsError] = useState<string | null>(null);

  const [accuracyLoading, setAccuracyLoading] = useState(false);
  const [accuracyError, setAccuracyError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("activity");

  const { t, lang } = useI18n();
  const locale = langToLocale[lang];
  const normalizedInstanceId = (instanceId ?? "").trim();

  useEffect(() => {
    setRawData([]);
    setRawSyncMetrics([]);
    setMarketStats([]);
    setAccuracyData([]);
    setError(null);
    setSyncError(null);
    setMarketsError(null);
    setAccuracyError(null);
    setLoading(true);
  }, [normalizedInstanceId]);

  useEffect(() => {
    const controller = new AbortController();
    const url = normalizedInstanceId
      ? `/api/oracle/charts?instanceId=${encodeURIComponent(normalizedInstanceId)}`
      : "/api/oracle/charts";
    fetchApiData<ChartItem[]>(url, {
      signal: controller.signal,
    })
      .then((charts) => setRawData(charts))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "unknown_error"),
      )
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [normalizedInstanceId]);

  useEffect(() => {
    if (activeTab !== "sync") return;
    if (syncLoading || rawSyncMetrics.length > 0 || syncError) return;
    const controller = new AbortController();
    setSyncLoading(true);
    const url = new URLSearchParams({
      minutes: "360",
      limit: "720",
      ...(normalizedInstanceId ? { instanceId: normalizedInstanceId } : {}),
    });
    fetchApiData<{ items: SyncMetricItem[] }>(
      `/api/oracle/sync-metrics?${url.toString()}`,
      { signal: controller.signal },
    )
      .then((r) => setRawSyncMetrics(r.items))
      .catch((e: unknown) =>
        setSyncError(e instanceof Error ? e.message : "unknown_error"),
      )
      .finally(() => setSyncLoading(false));
    return () => controller.abort();
  }, [
    activeTab,
    normalizedInstanceId,
    rawSyncMetrics.length,
    syncError,
    syncLoading,
  ]);

  useEffect(() => {
    if (activeTab !== "markets") return;
    if (marketsLoading || marketStats.length > 0 || marketsError) return;
    const controller = new AbortController();
    setMarketsLoading(true);
    const url = new URLSearchParams({
      days: "30",
      limit: "10",
      ...(normalizedInstanceId ? { instanceId: normalizedInstanceId } : {}),
    });
    fetchApiData<MarketStat[]>(
      `/api/oracle/analytics/markets?${url.toString()}`,
      { signal: controller.signal },
    )
      .then((data) => setMarketStats(data))
      .catch((e: unknown) =>
        setMarketsError(e instanceof Error ? e.message : "unknown_error"),
      )
      .finally(() => setMarketsLoading(false));
    return () => controller.abort();
  }, [
    activeTab,
    normalizedInstanceId,
    marketStats.length,
    marketsError,
    marketsLoading,
  ]);

  useEffect(() => {
    if (activeTab !== "accuracy") return;
    if (accuracyLoading || accuracyData.length > 0 || accuracyError) return;
    const controller = new AbortController();
    setAccuracyLoading(true);
    const url = new URLSearchParams({
      symbol: "ETH",
      days: "30",
      ...(normalizedInstanceId ? { instanceId: normalizedInstanceId } : {}),
    });
    fetchApiData<PricePoint[]>(
      `/api/oracle/analytics/accuracy?${url.toString()}`,
      { signal: controller.signal },
    )
      .then((data) => setAccuracyData(data))
      .catch((e: unknown) =>
        setAccuracyError(e instanceof Error ? e.message : "unknown_error"),
      )
      .finally(() => setAccuracyLoading(false));
    return () => controller.abort();
  }, [
    activeTab,
    normalizedInstanceId,
    accuracyData.length,
    accuracyError,
    accuracyLoading,
  ]);

  const chartData = useMemo(() => {
    if (rawData.length === 0) return [];

    let cumulative = 0;
    return rawData.map((item) => {
      cumulative += item.volume;
      return {
        ...item,
        date: new Date(item.date).toLocaleDateString(locale, {
          month: "short",
          day: "numeric",
        }),
        cumulativeVolume: cumulative,
      };
    });
  }, [locale, rawData]);

  const syncChartData = useMemo(() => {
    if (rawSyncMetrics.length === 0) return [];
    return rawSyncMetrics.map((item) => {
      const lagBlocks = item.lagBlocks !== null ? Number(item.lagBlocks) : null;
      return {
        ...item,
        lagBlocks: Number.isFinite(lagBlocks) ? lagBlocks : null,
        label: new Date(item.recordedAt).toLocaleTimeString(locale, {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    });
  }, [locale, rawSyncMetrics]);

  const accuracyChartData = useMemo(() => {
    if (accuracyData.length === 0) return [];
    return accuracyData.map((item) => ({
      ...item,
      label: new Date(item.timestamp).toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
      }),
      deviationPct: (item.deviation * 100).toFixed(2),
    }));
  }, [locale, accuracyData]);

  const healthScore = useMemo(() => {
    return calculateHealthScore(accuracyData);
  }, [accuracyData]);

  const accuracyStats = useMemo(() => {
    if (accuracyData.length === 0) return null;
    const deviations = accuracyData.map((p) => p.deviation);
    const avgDeviation =
      deviations.reduce((sum, v) => sum + v, 0) / deviations.length;
    const maxDeviation = Math.max(...deviations);
    const lastPoint = accuracyData[accuracyData.length - 1] ?? null;
    return {
      avgDeviation,
      maxDeviation,
      lastDeviation: lastPoint?.deviation ?? null,
      lastTimestamp: lastPoint?.timestamp ?? null,
      samples: accuracyData.length,
    };
  }, [accuracyData]);

  const accuracyAnomalies = useMemo<AccuracyAnomaly[]>(() => {
    if (accuracyData.length === 0) return [];
    return accuracyData
      .filter((p) => p.deviation >= 0.02)
      .map((p) => {
        const severity =
          p.deviation >= 0.05 ? ("critical" as const) : ("warning" as const);
        return {
          ...p,
          severity,
        };
      })
      .sort((a, b) => b.deviation - a.deviation)
      .slice(0, 5);
  }, [accuracyData]);

  const formatPercent = (value: number | null) => {
    if (value === null || !Number.isFinite(value)) return "—";
    return `${(value * 100).toFixed(2)}%`;
  };

  const hasAssertionsData = chartData.length >= 2;
  const hasSyncData = syncChartData.length >= 2;
  const hasAccuracyData = accuracyChartData.length >= 2;

  if (loading) {
    return (
      <div className="w-full h-[400px]">
        <Skeleton className="h-full w-full rounded-2xl" />
      </div>
    );
  }
  if (activeTab === "sync" && syncError) {
    return (
      <div className="glass-panel rounded-2xl p-6 shadow-sm border-rose-100 bg-rose-50/50">
        <div className="text-sm text-rose-700">
          {getUiErrorMessage(syncError, t)}
        </div>
      </div>
    );
  }
  if (activeTab === "markets" && marketsError) {
    return (
      <div className="glass-panel rounded-2xl p-6 shadow-sm border-rose-100 bg-rose-50/50">
        <div className="text-sm text-rose-700">
          {getUiErrorMessage(marketsError, t)}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="glass-panel rounded-2xl p-6 shadow-sm border-rose-100 bg-rose-50/50">
        <div className="text-sm text-rose-700">
          {getUiErrorMessage(error, t)}
        </div>
      </div>
    );
  }
  if (!hasAssertionsData && !hasSyncData) {
    return (
      <div className="w-full h-[400px] glass-panel rounded-2xl p-8 flex flex-col items-center justify-center text-center border-dashed border-2 border-indigo-100/50 bg-white/40">
        <div className="p-4 rounded-full bg-indigo-50/50 mb-4 ring-1 ring-indigo-100">
          <BarChart3 className="h-8 w-8 text-indigo-300" />
        </div>
        <h3 className="text-lg font-bold text-gray-700 mb-1">
          {t("oracle.charts.noData")}
        </h3>
        <p className="text-sm text-gray-400 max-w-xs">
          {t("oracle.charts.waitingData")}
        </p>
      </div>
    );
  }

  if (activeTab === "accuracy" && accuracyError) {
    return (
      <div className="glass-panel rounded-2xl p-6 shadow-sm border-rose-100 bg-rose-50/50">
        <div className="text-sm text-rose-700">
          {getUiErrorMessage(accuracyError, t)}
        </div>
      </div>
    );
  }

  const tabBorder = getTabBorder(activeTab);

  return (
    <div
      className={cn(
        "glass-card rounded-2xl p-6 relative overflow-hidden transition-all duration-500",
        tabBorder,
      )}
    >
      <ChartBackground activeTab={activeTab} />
      <ChartsHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        t={t as Translator}
      />
      <ChartsContent
        activeTab={activeTab}
        t={t as Translator}
        chartData={chartData}
        hasAssertionsData={hasAssertionsData}
        marketsLoading={marketsLoading}
        marketStats={marketStats}
        accuracyLoading={accuracyLoading}
        hasAccuracyData={hasAccuracyData}
        healthScore={healthScore}
        accuracyChartData={accuracyChartData}
        syncLoading={syncLoading}
        hasSyncData={hasSyncData}
        syncChartData={syncChartData}
      />
      <AccuracySummary
        activeTab={activeTab}
        accuracyLoading={accuracyLoading}
        hasAccuracyData={hasAccuracyData}
        accuracyStats={accuracyStats}
        healthScore={healthScore}
        accuracyAnomalies={accuracyAnomalies}
        formatPercent={formatPercent}
        t={t as Translator}
        locale={locale}
      />
    </div>
  );
}
