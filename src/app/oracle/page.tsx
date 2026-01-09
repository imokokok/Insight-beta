"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { 
  CheckCircle2,
  Clock,
  ArrowUpRight,
  RotateCw,
  Search,
  Settings2,
  ChevronDown,
  LayoutGrid,
  List,
  LayoutDashboard,
  Trophy,
  Wrench
} from "lucide-react";
import { OracleStatsBanner } from "@/components/OracleStatsBanner";
import { PageHeader } from "@/components/PageHeader";
import { cn, fetchApiData, formatDurationMinutes, formatTime, formatUsdCompact, formatUsd } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";
import { getUiErrorMessage, langToLocale } from "@/i18n/translations";
import { useOracleData } from "@/hooks/useOracleData";
import { ConnectWallet } from "@/components/ConnectWallet";
import { Leaderboard } from "@/components/Leaderboard";
import { PnLCalculator } from "@/components/PnLCalculator";
import type {
  OracleConfig,
  OracleStatus,
  OracleStatusSnapshot
} from "@/lib/oracleTypes";

const CreateAssertionModal = dynamic(() => import("@/components/CreateAssertionModal").then(mod => mod.CreateAssertionModal), { ssr: false });
const OracleCharts = dynamic(() => import("@/components/OracleCharts").then(mod => mod.OracleCharts), { 
  loading: () => <div className="h-[400px] w-full bg-white/5 animate-pulse rounded-2xl" />,
  ssr: false 
});

function getStatusColor(status: OracleStatus) {
  switch (status) {
    case "Pending":
      return "bg-blue-50 text-blue-700 ring-blue-500/30 ring-1";
    case "Disputed":
      return "bg-rose-50 text-rose-700 ring-rose-500/30 ring-1";
    case "Resolved":
      return "bg-emerald-50 text-emerald-700 ring-emerald-500/30 ring-1";
    default:
      return "bg-gray-50 text-gray-700 ring-gray-500/30 ring-1";
  }
}

export default function OraclePage() {
  const [filterStatus, setFilterStatus] = useState<OracleStatus | "All">("All");
  const [filterChain, setFilterChain] = useState<OracleConfig["chain"] | "All">("All");
  const [query, setQuery] = useState("");
  const [showConfig, setShowConfig] = useState(false);

  const { items, stats, loading, loadingMore, error, loadMore, hasMore, refresh } = useOracleData(filterStatus, filterChain, query);

  const [status, setStatus] = useState<{ config: OracleConfig; state: OracleStatusSnapshot } | null>(null);
  const [config, setConfig] = useState<OracleConfig>({
    rpcUrl: "",
    contractAddress: "",
    chain: "Local",
    startBlock: 0,
    maxBlockRange: 10000,
    votingPeriodHours: 72
  });
  const [adminToken, setAdminToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "leaderboard" | "tools">("overview");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { t, lang } = useI18n();
  const locale = langToLocale[lang];

  useEffect(() => {
    const saved = window.sessionStorage.getItem("insight_admin_token");
    if (saved) setAdminToken(saved);
  }, []);

  useEffect(() => {
    const trimmed = adminToken.trim();
    if (trimmed) window.sessionStorage.setItem("insight_admin_token", trimmed);
    else window.sessionStorage.removeItem("insight_admin_token");
  }, [adminToken]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadStatus = async () => {
      try {
        const data = await fetchApiData<{ config: OracleConfig; state: OracleStatusSnapshot }>("/api/oracle/status", {
          signal: controller.signal
        });
        if (cancelled) return;
        setStatus(data);
        setConfig(data.config);
      } catch {
        if (!cancelled) setStatus(null);
      }
    };

    loadStatus();
    const id = window.setInterval(loadStatus, 15_000);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(id);
    };
  }, []);

  const saveConfig = async () => {
    setSaving(true);
    setConfigError(null);
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      const trimmed = adminToken.trim();
      if (trimmed) headers["x-admin-token"] = trimmed;
      const data = await fetchApiData<OracleConfig>("/api/oracle/config", {
        method: "PUT",
        headers,
        body: JSON.stringify(config)
      });
      setConfig(data);
      setStatus((prev) => (prev ? { ...prev, config: data } : prev));
    } catch (e) {
      setConfigError(e instanceof Error ? e.message : "unknown_error");
    } finally {
      setSaving(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    setConfigError(null);
    try {
      const headers: Record<string, string> = {};
      const trimmed = adminToken.trim();
      if (trimmed) headers["x-admin-token"] = trimmed;
      await fetchApiData<{ updated: boolean } | { updated: boolean; chain: unknown }>("/api/oracle/sync", {
        method: "POST",
        headers
      });
      refresh();
      const data = await fetchApiData<{ config: OracleConfig; state: OracleStatusSnapshot }>("/api/oracle/status");
      setStatus(data);
    } catch (e) {
      setConfigError(e instanceof Error ? e.message : "unknown_error");
    } finally {
      setSyncing(false);
    }
  };

  const statusLabel = (status: OracleStatus | "All") => {
    if (status === "All") return t("common.all");
    if (status === "Pending") return t("common.pending");
    if (status === "Disputed") return t("common.disputed");
    return t("common.resolved");
  };

  const formattedStats = useMemo(() => {
    if (!stats) return null;
    return {
      tvs: formatUsdCompact(stats.tvsUsd, locale),
      activeDisputes: String(stats.activeDisputes),
      resolved24h: String(stats.resolved24h),
      avgResolution: formatDurationMinutes(stats.avgResolutionMinutes)
    };
  }, [locale, stats]);

  const shortAddress = (value: string) => {
    if (!value) return "—";
    if (value.length <= 12) return value;
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader 
        title={t("oracle.title")} 
        description={t("oracle.description")}
      >
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <ConnectWallet />
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="hidden sm:flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all"
          >
            <ArrowUpRight size={18} />
            {t("oracle.newAssertion")}
          </button>
        </div>
      </PageHeader>

      <CreateAssertionModal 
        isOpen={isCreateModalOpen} 
        onClose={() => setIsCreateModalOpen(false)} 
        contractAddress={config.contractAddress}
        chain={config.chain}
      />

      <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
        <OracleStatsBanner stats={formattedStats} loading={loading} />
      </div>

      <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
        <div className="glass-panel p-1.5 rounded-2xl flex items-center gap-1 shadow-lg shadow-purple-500/5 bg-white/40 backdrop-blur-xl border-white/60">
          <button
            onClick={() => setActiveTab("overview")}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
              activeTab === "overview"
                ? "bg-white text-purple-700 shadow-md shadow-purple-500/10 ring-1 ring-black/5 scale-[1.02]"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
            )}
          >
            <LayoutDashboard size={18} className={cn("transition-transform duration-300", activeTab === "overview" ? "scale-110 text-purple-600" : "text-gray-400")} />
            {t("oracle.tabs.overview")}
          </button>
          <button
            onClick={() => setActiveTab("leaderboard")}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
              activeTab === "leaderboard"
                 ? "bg-white text-purple-700 shadow-md shadow-purple-500/10 ring-1 ring-black/5 scale-[1.02]"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
            )}
          >
            <Trophy size={18} className={cn("transition-transform duration-300", activeTab === "leaderboard" ? "scale-110 text-amber-500" : "text-gray-400")} />
            {t("oracle.tabs.leaderboard")}
          </button>
          <button
            onClick={() => setActiveTab("tools")}
            className={cn(
              "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
              activeTab === "tools"
                 ? "bg-white text-purple-700 shadow-md shadow-purple-500/10 ring-1 ring-black/5 scale-[1.02]"
                : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
            )}
          >
            <Wrench size={18} className={cn("transition-transform duration-300", activeTab === "tools" ? "scale-110 text-slate-600" : "text-gray-400")} />
            {t("oracle.tabs.tools")}
          </button>
        </div>
      </div>

      {activeTab === "overview" ? (
         <div className="space-y-8">
           <OracleCharts />

           <div className="flex flex-col gap-6">
            {/* Configuration Toggle */}
            <div className="flex justify-end">
              <button 
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-purple-600 transition-colors"
              >
                <Settings2 size={16} />
                {t("oracle.config.title")}
                <ChevronDown size={14} className={cn("transition-transform", showConfig && "rotate-180")} />
              </button>
            </div>

            {/* Config Panel */}
            {showConfig && (
              <div className="glass-panel rounded-2xl p-6 animate-in slide-in-from-top-4 fade-in duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-800">{t("oracle.config.title")}</h3>
                  <button
                    onClick={syncNow}
                    disabled={syncing}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                      syncing
                        ? "bg-gray-100 text-gray-400"
                        : "bg-purple-50 text-purple-600 hover:bg-purple-100"
                    )}
                  >
                    <RotateCw size={14} className={syncing ? "animate-spin" : ""} />
                    {t("oracle.config.syncNow")}
                  </button>
                </div>
                
                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("oracle.config.rpcUrl")}</label>
                    <input
                      value={config.rpcUrl}
                      onChange={(e) => setConfig((c) => ({ ...c, rpcUrl: e.target.value }))}
                      placeholder="https://…"
                      className="glass-input h-10 w-full rounded-xl px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("oracle.config.contractAddress")}</label>
                    <input
                      value={config.contractAddress}
                      onChange={(e) => setConfig((c) => ({ ...c, contractAddress: e.target.value }))}
                      placeholder="0x…"
                      className="glass-input h-10 w-full rounded-xl px-4 font-mono text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("oracle.config.chain")}</label>
                    <div className="relative">
                      <select
                        value={config.chain}
                        onChange={(e) => setConfig((c) => ({ ...c, chain: e.target.value as OracleConfig["chain"] }))}
                        className="glass-input h-10 w-full appearance-none rounded-xl px-4 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                      >
                        <option value="Local">{t("chain.local")}</option>
                        <option value="Polygon">{t("chain.polygon")}</option>
                        <option value="Arbitrum">{t("chain.arbitrum")}</option>
                        <option value="Optimism">{t("chain.optimism")}</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("oracle.config.startBlock")}</label>
                    <input
                      value={config.startBlock ?? 0}
                      onChange={(e) => setConfig((c) => ({ ...c, startBlock: Number(e.target.value) }))}
                      placeholder="0"
                      type="number"
                      min={0}
                      step={1}
                      className="glass-input h-10 w-full rounded-xl px-4 font-mono text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("oracle.config.maxBlockRange")}</label>
                    <input
                      value={config.maxBlockRange ?? 10000}
                      onChange={(e) => setConfig((c) => ({ ...c, maxBlockRange: Number(e.target.value) }))}
                      placeholder="10000"
                      type="number"
                      min={100}
                      step={100}
                      className="glass-input h-10 w-full rounded-xl px-4 font-mono text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("oracle.config.votingPeriodHours")}</label>
                    <input
                      value={config.votingPeriodHours ?? 72}
                      onChange={(e) => setConfig((c) => ({ ...c, votingPeriodHours: Number(e.target.value) }))}
                      placeholder="72"
                      type="number"
                      min={1}
                      step={1}
                      className="glass-input h-10 w-full rounded-xl px-4 font-mono text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                    />
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t("oracle.config.adminToken")}</label>
                  <input
                    value={adminToken}
                    onChange={(e) => setAdminToken(e.target.value)}
                    placeholder="Bearer …"
                    type="password"
                    autoComplete="off"
                    className="glass-input h-10 w-full rounded-xl px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-t border-gray-100 pt-6">
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                      {t("oracle.config.lastBlock")}: <span className="font-mono font-medium">{status ? status.state.lastProcessedBlock : "—"}</span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-gray-600">
                      <span className={cn("w-1.5 h-1.5 rounded-full", status?.state.syncing ? "bg-blue-500 animate-pulse" : "bg-emerald-500")}></span>
                      {status?.state.syncing
                        ? t("oracle.config.syncing")
                        : status?.state.sync?.lastSuccessAt
                          ? formatTime(status.state.sync.lastSuccessAt, locale)
                          : "—"}
                    </div>
                  </div>

                  <button
                    onClick={saveConfig}
                    disabled={saving}
                    className={cn(
                      "rounded-xl px-6 py-2 text-sm font-medium transition-all shadow-sm",
                      saving
                        ? "bg-gray-100 text-gray-400"
                        : "bg-purple-600 text-white hover:bg-purple-700 hover:shadow-purple-500/25"
                    )}
                  >
                    {t("oracle.config.save")}
                  </button>
                </div>
                
                {configError && (
                  <div className="mt-4 p-3 rounded-xl bg-rose-50 text-xs text-rose-600 border border-rose-100">
                    {getUiErrorMessage(configError, t)}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="glass-panel rounded-2xl border-l-4 border-l-rose-500 p-4 text-sm text-rose-700">
                {getUiErrorMessage(error, t)}
              </div>
            )}

            {/* Filters & Search Toolbar */}
            <div className="glass-panel sticky top-4 z-20 rounded-2xl p-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shadow-xl shadow-purple-900/5 backdrop-blur-xl border-white/60">
              <div className="flex items-center gap-1.5 overflow-x-auto p-1 sm:p-0 no-scrollbar">
                {["All", "Pending", "Disputed", "Resolved"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status as OracleStatus | "All")}
                    className={cn(
                      "rounded-xl px-4 py-2 text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2",
                      filterStatus === status
                        ? "bg-white shadow-md shadow-purple-500/10 ring-1 ring-black/5 scale-105"
                        : "text-gray-500 hover:bg-white/40 hover:text-gray-900",
                      filterStatus === status && status === "Pending" && "text-blue-600 ring-blue-100",
                      filterStatus === status && status === "Disputed" && "text-rose-600 ring-rose-100",
                      filterStatus === status && status === "Resolved" && "text-emerald-600 ring-emerald-100",
                      filterStatus === status && status === "All" && "text-purple-700 ring-purple-100"
                    )}
                  >
                    {status === "Pending" && <div className={cn("w-2 h-2 rounded-full bg-blue-500", filterStatus !== status && "opacity-50")} />}
                    {status === "Disputed" && <div className={cn("w-2 h-2 rounded-full bg-rose-500", filterStatus !== status && "opacity-50")} />}
                    {status === "Resolved" && <div className={cn("w-2 h-2 rounded-full bg-emerald-500", filterStatus !== status && "opacity-50")} />}
                    {status === "All" && <div className={cn("w-2 h-2 rounded-full bg-purple-500", filterStatus !== status && "opacity-50")} />}
                    {statusLabel(status as OracleStatus | "All")}
                  </button>
                ))}
              </div>
              
              <div className="flex items-center gap-3">
                <div className="hidden md:flex bg-gray-100/50 p-1 rounded-xl">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      viewMode === "grid" ? "bg-white shadow text-purple-600" : "text-gray-400 hover:text-gray-600"
                    )}
                    title={t("oracle.card.gridView")}
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "p-1.5 rounded-md transition-all",
                      viewMode === "list" ? "bg-white shadow text-purple-600" : "text-gray-400 hover:text-gray-600"
                    )}
                    title={t("oracle.card.listView")}
                  >
                    <List size={16} />
                  </button>
                </div>

                <div className="relative hidden md:block">
                  <select
                    value={filterChain}
                    onChange={(e) => setFilterChain(e.target.value as OracleConfig["chain"] | "All")}
                    className="glass-input h-9 rounded-xl border-none pl-3 pr-8 text-sm font-medium text-gray-600 hover:bg-white/80 focus:ring-2 focus:ring-purple-500/20 cursor-pointer appearance-none"
                  >
                    <option value="All">{t("common.all")}</option>
                    <option value="Local">{t("chain.local")}</option>
                    <option value="Polygon">{t("chain.polygon")}</option>
                    <option value="Arbitrum">{t("chain.arbitrum")}</option>
                    <option value="Optimism">{t("chain.optimism")}</option>
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
                </div>
                
                <div className="h-4 w-px bg-gray-200 hidden md:block"></div>

                <div className="relative flex-1 sm:flex-initial">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input 
                    type="text" 
                    placeholder={t("oracle.searchPlaceholder")} 
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="glass-input h-9 w-full rounded-xl pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500/20 md:w-64"
                  />
                </div>
              </div>
            </div>

            {loading && (
              <div className="text-center py-20">
                <div className="inline-block p-4 rounded-full bg-white/50 backdrop-blur-sm shadow-sm">
                   <RotateCw size={32} className="animate-spin text-purple-500" />
                </div>
                <p className="mt-4 text-gray-500 font-medium">{t("common.loading")}</p>
              </div>
            )}

            <div className={cn(
              "grid gap-6",
              viewMode === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
            )}>
              {!loading && items.map((item) => (
                <Link href={`/oracle/${item.id}`} key={item.id} className="block h-full">
                <div className={cn(
                  "glass-card rounded-2xl p-5 relative group border border-white/60 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 hover:border-purple-200/50",
                  viewMode === "grid" ? "h-full" : "flex flex-col md:flex-row md:items-center gap-6"
                )}>
                  {/* Header: Icon, ID, Protocol */}
                  <div className={cn("flex items-start justify-between", viewMode === "list" && "md:w-1/4 shrink-0")}>
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ring-1 ring-black/5 text-sm font-bold transition-transform group-hover:scale-110 duration-300",
                        item.chain === "Polygon" && "bg-gradient-to-br from-violet-50 to-violet-100 text-violet-600",
                        item.chain === "Arbitrum" && "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600",
                        item.chain === "Optimism" && "bg-gradient-to-br from-red-50 to-red-100 text-red-600",
                        item.chain === "Local" && "bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600",
                      )}>
                        {item.chain[0]}
                      </div>
                      <div>
                        <div className="text-xs font-medium text-gray-400 mb-0.5">{item.protocol}</div>
                        <div className="text-sm font-bold text-gray-900 font-mono tracking-tight">{item.id}</div>
                      </div>
                    </div>
                    {/* Status badge for Grid view */}
                    {viewMode === "grid" && (
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-semibold", getStatusColor(item.status))}>
                        {statusLabel(item.status)}
                      </span>
                    )}
                  </div>

                  {/* Question */}
                  <div className={cn(
                    viewMode === "grid" ? "mb-6 mt-4" : "flex-1 min-w-0"
                  )}>
                    {viewMode === "grid" && <h4 className="mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">{t("oracle.card.marketQuestion")}</h4>}
                    <p className={cn(
                      "font-medium text-gray-800 leading-relaxed group-hover:text-purple-900 transition-colors",
                      viewMode === "grid" ? "line-clamp-3 text-base" : "line-clamp-2 text-sm md:text-base"
                    )}>
                      {item.market}
                    </p>
                    {viewMode === "list" && (
                      <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                         <span className="flex items-center gap-1.5">
                            <Clock size={14} />
                            {formatTime(item.assertedAt, locale)}
                         </span>
                         <span className={cn("px-2 py-0.5 rounded-full font-medium", getStatusColor(item.status))}>
                            {statusLabel(item.status)}
                         </span>
                      </div>
                    )}
                  </div>

                  {/* Stats */}
                  <div className={cn(
                    viewMode === "grid" ? "grid grid-cols-2 gap-3 mb-5" : "flex items-center gap-6 md:w-auto shrink-0 mt-4 md:mt-0"
                  )}>
                    <div className={cn(viewMode === "grid" ? "p-3 rounded-xl bg-gray-50/50" : "text-right")}>
                      <div className="text-xs text-gray-500 mb-1">{t("oracle.card.asserter")}</div>
                      <div className="font-mono text-xs font-medium text-gray-700">{shortAddress(item.asserter)}</div>
                    </div>
                    <div className={cn(viewMode === "grid" ? "p-3 rounded-xl bg-gray-50/50" : "text-right")}>
                      <div className="text-xs text-gray-500 mb-1">{t("oracle.card.bond")}</div>
                      <div className="font-medium text-gray-900">{formatUsd(item.bondUsd, locale)}</div>
                    </div>
                  </div>

                  {/* Footer for Grid View */}
                  {viewMode === "grid" && (
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                        <Clock size={14} />
                        <span>{formatTime(item.assertedAt, locale)}</span>
                      </div>
                      <span className="flex items-center gap-1 text-xs font-bold text-purple-600 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0">
                        {t("common.viewDetails")}
                        <ArrowUpRight size={12} />
                      </span>
                    </div>
                  )}
                  
                  {/* View Details arrow for List View */}
                  {viewMode === "list" && (
                     <div className="hidden md:flex items-center text-purple-600 opacity-0 group-hover:opacity-100 transition-all transform translate-x-[-10px] group-hover:translate-x-0 pl-4 border-l border-gray-100">
                        <ArrowUpRight size={20} />
                     </div>
                  )}
                </div>
                </Link>
              ))}
            </div>

            {items.length > 0 && (
              <div className="flex justify-center pt-8">
                {hasMore ? (
                  <button
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="group flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-bold text-purple-600 shadow-lg shadow-purple-500/10 ring-1 ring-purple-100 transition-all hover:bg-purple-50 hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    {loadingMore ? (
                      <>
                        <RotateCw size={18} className="animate-spin" />
                        <span>{t("common.loading")}</span>
                      </>
                    ) : (
                      <>
                        <ArrowUpRight size={18} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        <span>{t("common.loadMore")}</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="text-sm font-medium text-gray-400 flex items-center gap-2 py-4">
                    <CheckCircle2 size={16} />
                    <span>{t("common.allLoaded")}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === "leaderboard" ? (
        <Leaderboard />
      ) : (
        <div className="mt-8 max-w-2xl mx-auto">
          <PnLCalculator />
        </div>
      )}
    </div>
  );
}
