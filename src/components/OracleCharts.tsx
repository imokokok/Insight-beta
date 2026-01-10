"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState, useMemo } from "react";
import { BarChart3, Activity, PieChart, Clock } from "lucide-react";
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchApiData } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";
import { getUiErrorMessage, langToLocale } from "@/i18n/translations";

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

export function OracleCharts() {
  const [rawData, setRawData] = useState<ChartItem[]>([]);
  const [rawSyncMetrics, setRawSyncMetrics] = useState<SyncMetricItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"activity" | "tvs" | "sync">("activity");
  const { t, lang } = useI18n();
  const locale = langToLocale[lang];

  useEffect(() => {
    const controller = new AbortController();
    fetchApiData<ChartItem[]>("/api/oracle/charts", { signal: controller.signal })
      .then((charts) => setRawData(charts))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "unknown_error"))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (activeTab !== "sync") return;
    if (syncLoading || rawSyncMetrics.length > 0 || syncError) return;
    const controller = new AbortController();
    setSyncLoading(true);
    fetchApiData<{ items: SyncMetricItem[] }>("/api/oracle/sync-metrics?minutes=360&limit=720", { signal: controller.signal })
      .then((r) => setRawSyncMetrics(r.items))
      .catch((e: unknown) => setSyncError(e instanceof Error ? e.message : "unknown_error"))
      .finally(() => setSyncLoading(false));
    return () => controller.abort();
  }, [activeTab, rawSyncMetrics.length, syncError, syncLoading]);

  const chartData = useMemo(() => {
    if (rawData.length === 0) return [];
    
    // Calculate cumulative volume
    let cumulative = 0;
    return rawData.map(item => {
      cumulative += item.volume;
      return {
        ...item,
        date: new Date(item.date).toLocaleDateString(locale, { month: "short", day: "numeric" }),
        cumulativeVolume: cumulative
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
        label: new Date(item.recordedAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })
      };
    });
  }, [locale, rawSyncMetrics]);

  const hasAssertionsData = chartData.length >= 2;
  const hasSyncData = syncChartData.length >= 2;

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
          <h3 className="text-lg font-bold text-gray-700 mb-1">{t("oracle.charts.noData")}</h3>
          <p className="text-sm text-gray-400 max-w-xs">
            {t("oracle.charts.waitingData")}
          </p>
      </div>
    );
  }

  const tabBorder =
    activeTab === "activity" ? "border-purple-100/20" : activeTab === "tvs" ? "border-pink-100/20" : "border-blue-100/20";

  return (
    <div className={cn(
      "glass-card rounded-2xl p-6 relative overflow-hidden transition-all duration-500",
      tabBorder
    )}>
      {/* Artistic Background Mesh - Dynamic based on tab */}
      <div className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-700",
          activeTab === "activity" ? "opacity-20" : "opacity-0"
      )}>
          <div className="absolute -left-[10%] -top-[10%] h-[150%] w-[50%] bg-gradient-to-br from-purple-200/30 via-indigo-100/10 to-transparent blur-3xl rounded-full" />
          <div className="absolute right-0 bottom-0 h-[60%] w-[40%] bg-gradient-to-tl from-blue-100/20 via-transparent to-transparent blur-2xl rounded-full" />
      </div>
      <div className={cn(
          "absolute inset-0 pointer-events-none transition-opacity duration-700",
          activeTab === "tvs" ? "opacity-20" : "opacity-0"
      )}>
          <div className="absolute -right-[10%] -top-[10%] h-[150%] w-[50%] bg-gradient-to-bl from-pink-200/30 via-rose-100/10 to-transparent blur-3xl rounded-full" />
          <div className="absolute left-0 bottom-0 h-[60%] w-[40%] bg-gradient-to-tr from-purple-100/20 via-transparent to-transparent blur-2xl rounded-full" />
      </div>

      {/* Header & Tabs */}
      <div className="relative z-10 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-3">
           <div className={cn(
             "rounded-xl p-3 shadow-inner ring-1 backdrop-blur-md transition-colors duration-500",
             activeTab === "activity"
               ? "bg-gradient-to-br from-purple-500/10 to-indigo-500/10 text-purple-600 ring-purple-500/20"
               : activeTab === "tvs"
                 ? "bg-gradient-to-br from-pink-500/10 to-rose-500/10 text-pink-600 ring-pink-500/20"
                 : "bg-gradient-to-br from-blue-500/10 to-cyan-500/10 text-blue-600 ring-blue-500/20"
           )}>
              {activeTab === "activity" ? <Activity className="h-6 w-6" /> : activeTab === "tvs" ? <PieChart className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
           </div>
           <div>
             <h3 className="text-lg font-bold text-gray-800">
            {activeTab === "activity" ? t("oracle.charts.dailyAssertions") : activeTab === "tvs" ? t("oracle.charts.tvsCumulative") : t("oracle.charts.syncHealth")}
          </h3>
          <p className="text-sm text-gray-500">
            {activeTab === "activity" ? t("oracle.charts.activityDesc") : activeTab === "tvs" ? t("oracle.charts.tvsDesc") : t("oracle.charts.syncDesc")}
          </p>
        </div>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100/50 backdrop-blur-sm border border-gray-200/50">
          <button
            onClick={() => setActiveTab("activity")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
              activeTab === "activity"
                ? "bg-white text-purple-700 shadow-sm ring-1 ring-black/5"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
            )}
          >
            <Activity size={14} />
            {t("oracle.charts.dailyAssertions")}
          </button>
          <button
            onClick={() => setActiveTab("tvs")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
              activeTab === "tvs"
                ? "bg-white text-pink-700 shadow-sm ring-1 ring-black/5"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
            )}
          >
            <PieChart size={14} />
            {t("oracle.charts.tvsCumulative")}
          </button>
          <button
            onClick={() => setActiveTab("sync")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
              activeTab === "sync"
                ? "bg-white text-blue-700 shadow-sm ring-1 ring-black/5"
                : "text-gray-500 hover:text-gray-700 hover:bg-white/50"
            )}
          >
            <Clock size={14} />
            {t("oracle.charts.syncHealth")}
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
                   <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                   <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                 </linearGradient>
               </defs>
               <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3e8ff" strokeOpacity={0.5} />
               <XAxis 
                 dataKey="date" 
                 tick={{ fontSize: 12, fill: '#9ca3af' }} 
                 axisLine={false}
                 tickLine={false}
                 dy={10}
               />
               <YAxis 
                 tick={{ fontSize: 12, fill: '#9ca3af' }} 
                 axisLine={false}
                 tickLine={false}
                 dx={-10}
               />
               <Tooltip 
                 contentStyle={{ 
                   backgroundColor: 'rgba(255, 255, 255, 0.8)', 
                   borderRadius: '12px', 
                   border: '1px solid rgba(255, 255, 255, 0.5)',
                   backdropFilter: 'blur(8px)',
                   boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                 }}
                 itemStyle={{ color: '#4b5563', fontSize: '12px' }}
                 labelStyle={{ color: '#111827', fontWeight: 'bold', marginBottom: '4px' }}
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
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#fce7f3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12, fill: '#9ca3af' }} 
                  axisLine={false}
                  tickLine={false}
                  dy={10}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#9ca3af' }} 
                  axisLine={false}
                  tickLine={false}
                  dx={-10}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.6)', 
                    borderRadius: '16px', 
                    border: '1px solid rgba(255, 255, 255, 0.6)',
                    backdropFilter: 'blur(12px)',
                    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                    padding: '12px'
                  }}
                  itemStyle={{ color: '#4b5563', fontSize: '12px', fontWeight: 500 }}
                  labelStyle={{ color: '#111827', fontWeight: 'bold', marginBottom: '8px', fontSize: '13px' }}
                  cursor={{ stroke: '#ec4899', strokeWidth: 2, strokeDasharray: '4 4' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="cumulativeVolume" 
                  stroke="#ec4899" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorVolume)" 
                  activeDot={{ r: 6, strokeWidth: 0, fill: '#ec4899' }}
                  animationDuration={1500}
                />
              </AreaChart>
            )
          ) : (
            syncLoading ? (
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
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#dbeafe" strokeOpacity={0.6} />
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
                    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
                  }}
                  formatter={(value: unknown, name: unknown) => {
                    const node = typeof value === "number" ? value : String(value);
                    if (name === "lagBlocks") return [node, t("oracle.charts.syncLagBlocks")];
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
            )
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
