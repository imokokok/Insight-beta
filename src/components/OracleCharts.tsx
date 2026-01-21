"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo } from "react";
import { BarChart3, Activity, PieChart, Clock, Target } from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  Legend,
  Pie,
  PieChart as RechartsPieChart,
  ComposedChart,
  Line,
  Bar,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchApiData } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";
import { getUiErrorMessage, langToLocale } from "@/i18n/translations";
import { OracleHealthScore } from "./OracleHealthScore";
import { calculateHealthScore, PricePoint } from "@/server/oracle/priceFetcher";

type ChartItem = {
  date: string;
  count: number;
  volume: number;
};

type SyncMetricItem = {
  recordedAt: string;
  lagBlocks: string | null;
  durationMs: number | null;
  error: string | null;
};

type MarketStat = {
  market: string;
  count: number;
  volume: number;
};

const COLORS = [
  "#8b5cf6",
  "#ec4899",
  "#f43f5e",
  "#a855f7",
  "#6366f1",
  "#3b82f6",
  "#0ea5e9",
  "#10b981",
];

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

  const [activeTab, setActiveTab] = useState<
    "activity" | "tvs" | "sync" | "markets" | "accuracy"
  >("activity");

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

    // Calculate cumulative volume
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

  const tabBorder =
    activeTab === "activity"
      ? "border-purple-100/20"
      : activeTab === "tvs"
        ? "border-pink-100/20"
        : activeTab === "sync"
          ? "border-blue-100/20"
          : activeTab === "markets"
            ? "border-orange-100/20"
            : "border-green-100/20"; // Accuracy color

  return (
    <div
      className={cn(
        "glass-card rounded-2xl p-6 relative overflow-hidden transition-all duration-500",
        tabBorder,
      )}
    >
      {/* Artistic Background Mesh - Dynamic based on tab */}
      <div
        className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-700",
          activeTab === "activity" ? "opacity-20" : "opacity-0",
        )}
      >
        <div className="absolute -left-[10%] -top-[10%] h-[150%] w-[50%] bg-gradient-to-br from-purple-200/30 via-indigo-100/10 to-transparent blur-3xl rounded-full" />
        <div className="absolute right-0 bottom-0 h-[60%] w-[40%] bg-gradient-to-tl from-blue-100/20 via-transparent to-transparent blur-2xl rounded-full" />
      </div>
      <div
        className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-700",
          activeTab === "tvs" ? "opacity-20" : "opacity-0",
        )}
      >
        <div className="absolute -right-[10%] -top-[10%] h-[150%] w-[50%] bg-gradient-to-bl from-pink-200/30 via-rose-100/10 to-transparent blur-3xl rounded-full" />
        <div className="absolute left-0 bottom-0 h-[60%] w-[40%] bg-gradient-to-tr from-purple-100/20 via-transparent to-transparent blur-2xl rounded-full" />
      </div>
      <div
        className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-700",
          activeTab === "sync" ? "opacity-20" : "opacity-0",
        )}
      >
        <div className="absolute -left-[10%] -bottom-[10%] h-[150%] w-[50%] bg-gradient-to-tr from-blue-200/30 via-cyan-100/10 to-transparent blur-3xl rounded-full" />
        <div className="absolute right-0 top-0 h-[60%] w-[40%] bg-gradient-to-bl from-indigo-100/20 via-transparent to-transparent blur-2xl rounded-full" />
      </div>
      <div
        className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-700",
          activeTab === "markets" ? "opacity-20" : "opacity-0",
        )}
      >
        <div className="absolute right-[20%] -top-[10%] h-[120%] w-[60%] bg-gradient-to-b from-orange-200/30 via-amber-100/10 to-transparent blur-3xl rounded-full" />
        <div className="absolute left-0 bottom-0 h-[50%] w-[40%] bg-gradient-to-tr from-red-100/20 via-transparent to-transparent blur-2xl rounded-full" />
      </div>
      <div
        className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-700",
          activeTab === "accuracy" ? "opacity-20" : "opacity-0",
        )}
      >
        <div className="absolute left-[20%] -top-[10%] h-[120%] w-[60%] bg-gradient-to-b from-green-200/30 via-emerald-100/10 to-transparent blur-3xl rounded-full" />
        <div className="absolute right-0 bottom-0 h-[50%] w-[40%] bg-gradient-to-tr from-teal-100/20 via-transparent to-transparent blur-2xl rounded-full" />
      </div>

      {/* Header & Tabs */}
      <div className="relative z-10 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "rounded-xl p-3 shadow-inner ring-1 backdrop-blur-md transition-colors duration-500",
              activeTab === "activity"
                ? "bg-gradient-to-br from-purple-500/10 to-indigo-500/10 text-purple-600 ring-purple-500/20"
                : activeTab === "tvs"
                  ? "bg-gradient-to-br from-pink-500/10 to-rose-500/10 text-pink-600 ring-pink-500/20"
                  : activeTab === "sync"
                    ? "bg-gradient-to-br from-blue-500/10 to-cyan-500/10 text-blue-600 ring-blue-500/20"
                    : activeTab === "markets"
                      ? "bg-gradient-to-br from-orange-500/10 to-amber-500/10 text-orange-600 ring-orange-500/20"
                      : "bg-gradient-to-br from-green-500/10 to-emerald-500/10 text-green-600 ring-green-500/20",
            )}
          >
            {activeTab === "activity" ? (
              <Activity className="h-6 w-6" />
            ) : activeTab === "tvs" ? (
              <PieChart className="h-6 w-6" />
            ) : activeTab === "sync" ? (
              <Clock className="h-6 w-6" />
            ) : activeTab === "markets" ? (
              <BarChart3 className="h-6 w-6" />
            ) : (
              <Target className="h-6 w-6" />
            )}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-800">
              {activeTab === "activity"
                ? t("oracle.charts.dailyAssertions")
                : activeTab === "tvs"
                  ? t("oracle.charts.tvsCumulative")
                  : activeTab === "sync"
                    ? t("oracle.charts.syncHealth")
                    : activeTab === "markets"
                      ? t("oracle.charts.topMarkets")
                      : "Data Accuracy"}
            </h3>
            <p className="text-sm text-gray-500">
              {activeTab === "activity"
                ? t("oracle.charts.activityDesc")
                : activeTab === "tvs"
                  ? t("oracle.charts.tvsDesc")
                  : activeTab === "sync"
                    ? t("oracle.charts.syncDesc")
                    : activeTab === "markets"
                      ? "Most active markets by disputes"
                      : "Oracle vs Reference Price Deviation"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100/50 backdrop-blur-sm border border-gray-200/50 overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab("activity")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap",
              activeTab === "activity"
                ? "bg-white text-purple-700 shadow-sm ring-1 ring-black/5"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50",
            )}
          >
            <Activity size={14} />
            {t("oracle.charts.dailyAssertions")}
          </button>
          <button
            onClick={() => setActiveTab("tvs")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap",
              activeTab === "tvs"
                ? "bg-white text-pink-700 shadow-sm ring-1 ring-black/5"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50",
            )}
          >
            <PieChart size={14} />
            {t("oracle.charts.tvsCumulative")}
          </button>
          <button
            onClick={() => setActiveTab("sync")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap",
              activeTab === "sync"
                ? "bg-white text-blue-700 shadow-sm ring-1 ring-black/5"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50",
            )}
          >
            <Clock size={14} />
            {t("oracle.charts.syncHealth")}
          </button>
          <button
            onClick={() => setActiveTab("markets")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap",
              activeTab === "markets"
                ? "bg-white text-orange-700 shadow-sm ring-1 ring-black/5"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50",
            )}
          >
            <BarChart3 size={14} />
            {t("oracle.charts.topMarkets")}
          </button>
          <button
            onClick={() => setActiveTab("accuracy")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap",
              activeTab === "accuracy"
                ? "bg-white text-green-700 shadow-sm ring-1 ring-black/5"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50",
            )}
          >
            <Target size={14} />
            Accuracy
          </button>
        </div>
      </div>

      <div className="relative z-10 h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {activeTab === "activity" ? (
            !hasAssertionsData ? (
              <div className="h-full w-full flex items-center justify-center text-sm text-gray-400">
                {t("oracle.charts.waitingData")}
              </div>
            ) : (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f3e8ff"
                  strokeOpacity={0.5}
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.8)",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.5)",
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                  itemStyle={{ color: "#4b5563", fontSize: "12px" }}
                  labelStyle={{
                    color: "#111827",
                    fontWeight: "bold",
                    marginBottom: "4px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#8b5cf6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorCount)"
                  animationDuration={1500}
                />
              </AreaChart>
            )
          ) : activeTab === "tvs" ? (
            !hasAssertionsData ? (
              <div className="h-full w-full flex items-center justify-center text-sm text-gray-400">
                {t("oracle.charts.waitingData")}
              </div>
            ) : (
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#fce7f3"
                />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#9ca3af" }}
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.6)",
                    borderRadius: "16px",
                    border: "1px solid rgba(255, 255, 255, 0.6)",
                    backdropFilter: "blur(12px)",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    padding: "12px",
                  }}
                  itemStyle={{
                    color: "#4b5563",
                    fontSize: "12px",
                    fontWeight: 500,
                  }}
                  labelStyle={{
                    color: "#111827",
                    fontWeight: "bold",
                    marginBottom: "8px",
                    fontSize: "13px",
                  }}
                  cursor={{
                    stroke: "#ec4899",
                    strokeWidth: 2,
                    strokeDasharray: "4 4",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="cumulativeVolume"
                  stroke="#ec4899"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorVolume)"
                  activeDot={{ r: 6, strokeWidth: 0, fill: "#ec4899" }}
                  animationDuration={1500}
                />
              </AreaChart>
            )
          ) : activeTab === "markets" ? (
            marketsLoading ? (
              <div className="h-full w-full flex items-center justify-center text-sm text-gray-400">
                {t("common.loading")}
              </div>
            ) : marketStats.length === 0 ? (
              <div className="h-full w-full flex items-center justify-center text-sm text-gray-400">
                {t("oracle.charts.waitingData")}
              </div>
            ) : (
              <RechartsPieChart>
                <Pie
                  data={marketStats}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="count"
                >
                  {marketStats.map((_entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(
                    value: unknown,
                    _name: unknown,
                    props: { payload?: MarketStat },
                  ) => {
                    const numericValue =
                      typeof value === "number" ? value : Number(value ?? 0);
                    const market = props.payload?.market ?? "";
                    return [`${numericValue} disputes`, market];
                  }}
                  contentStyle={{
                    backgroundColor: "rgba(255, 255, 255, 0.85)",
                    borderRadius: "12px",
                    border: "1px solid rgba(255, 255, 255, 0.5)",
                    backdropFilter: "blur(8px)",
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                  }}
                  itemStyle={{ color: "#4b5563", fontSize: "12px" }}
                />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  wrapperStyle={{ fontSize: "12px", maxWidth: "40%" }}
                />
              </RechartsPieChart>
            )
          ) : activeTab === "accuracy" ? (
            accuracyLoading ? (
              <div className="h-full w-full flex items-center justify-center text-sm text-gray-400">
                {t("common.loading")}
              </div>
            ) : !hasAccuracyData ? (
              <div className="h-full w-full flex items-center justify-center text-sm text-gray-400">
                {t("oracle.charts.waitingData")}
              </div>
            ) : (
              <div className="relative w-full h-full flex flex-col">
                <div className="absolute top-0 right-0 z-20">
                  <OracleHealthScore
                    score={healthScore}
                    isLoading={accuracyLoading}
                  />
                </div>
                <div className="flex-1 w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={accuracyChartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        vertical={false}
                        stroke="#dcfce7"
                      />
                      <XAxis
                        dataKey="label"
                        scale="point"
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="left"
                        orientation="left"
                        domain={["auto", "auto"]}
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="right"
                        tick={{ fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        unit="%"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "rgba(255, 255, 255, 0.9)",
                          borderRadius: "8px",
                          border: "none",
                          boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                          fontSize: "12px",
                        }}
                      />
                      <Legend verticalAlign="top" height={36} />
                      <Bar
                        yAxisId="right"
                        dataKey="deviationPct"
                        name="Deviation %"
                        barSize={20}
                        fill="#f87171"
                        opacity={0.5}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="oraclePrice"
                        name="Oracle Price"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                      />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="referencePrice"
                        name="Ref Price"
                        stroke="#6b7280"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )
          ) : syncLoading ? (
            <div className="h-full w-full flex items-center justify-center text-sm text-gray-400">
              {t("common.loading")}
            </div>
          ) : !hasSyncData ? (
            <div className="h-full w-full flex items-center justify-center text-sm text-gray-400">
              {t("oracle.charts.waitingData")}
            </div>
          ) : (
            <AreaChart data={syncChartData}>
              <defs>
                <linearGradient id="colorLagBlocks" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#dbeafe"
                strokeOpacity={0.6}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#9ca3af" }}
                axisLine={false}
                tickLine={false}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "rgba(255, 255, 255, 0.85)",
                  borderRadius: "12px",
                  border: "1px solid rgba(255, 255, 255, 0.5)",
                  backdropFilter: "blur(8px)",
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                }}
                formatter={(value: unknown, name: unknown) => {
                  const node =
                    typeof value === "number" ? value : String(value);
                  if (name === "lagBlocks")
                    return [node, t("oracle.charts.syncLagBlocks")];
                  return [node, String(name)];
                }}
              />
              <Area
                type="monotone"
                dataKey="lagBlocks"
                stroke="#3b82f6"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorLagBlocks)"
                animationDuration={1500}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
