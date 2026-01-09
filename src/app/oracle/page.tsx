"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { 
  DollarSign, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  ArrowUpRight,
  RotateCw,
  Filter,
  Search
} from "lucide-react";
import { StatsCard } from "@/components/StatsCard";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { cn, fetchApiData, formatDurationMinutes, formatTime, formatUsdCompact, formatUsd } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";
import { getUiErrorMessage, langToLocale } from "@/i18n/translations";
import { useOracleData } from "@/hooks/useOracleData";
import { ConnectWallet } from "@/components/ConnectWallet";
import { OracleCharts } from "@/components/OracleCharts";
import { Leaderboard } from "@/components/Leaderboard";
import { PnLCalculator } from "@/components/PnLCalculator";
import type {
  OracleConfig,
  OracleStatus,
  OracleStatusSnapshot
} from "@/lib/oracleTypes";

function getStatusColor(status: OracleStatus) {
  switch (status) {
    case "Pending":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "Disputed":
      return "bg-rose-100 text-rose-700 border-rose-200";
    case "Resolved":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

export default function OraclePage() {
  const [filterStatus, setFilterStatus] = useState<OracleStatus | "All">("All");
  const [filterChain, setFilterChain] = useState<OracleConfig["chain"] | "All">("All");
  const [query, setQuery] = useState("");

  const { items, stats, loading, loadingMore, error, loadMore, hasMore, refresh } = useOracleData(filterStatus, filterChain, query);

  const [status, setStatus] = useState<{ config: OracleConfig; state: OracleStatusSnapshot } | null>(null);
  const [config, setConfig] = useState<OracleConfig>({
    rpcUrl: "",
    contractAddress: "",
    chain: "Local"
  });
  const [adminToken, setAdminToken] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "leaderboard" | "tools">("overview");

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

  const txUrl = (chain: OracleConfig["chain"], hash: string) => {
    if (!hash) return null;
    if (chain === "Polygon") return `https://polygonscan.com/tx/${hash}`;
    if (chain === "Arbitrum") return `https://arbiscan.io/tx/${hash}`;
    if (chain === "Optimism") return `https://optimistic.etherscan.io/tx/${hash}`;
    return null;
  };

  const formatDurationMs = (ms: number | null | undefined) => {
    if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return "—";
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title={t("oracle.title")} 
        description={t("oracle.description")}
      >
        <div className="flex items-center gap-3">
          <ConnectWallet />
          <button
            type="button"
            disabled
            title={t("common.comingSoon")}
            className="hidden sm:flex items-center gap-2 rounded-xl bg-purple-600/60 px-4 py-2 text-sm font-medium text-white shadow-lg shadow-purple-500/20 cursor-not-allowed"
          >
            <ArrowUpRight size={18} />
            {t("oracle.newAssertion")}
          </button>
        </div>
      </PageHeader>

      <Card className="border-purple-100/60 bg-white/60 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-purple-950">{t("oracle.config.title")}</div>
            <button
              onClick={syncNow}
              disabled={syncing}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium shadow-sm ring-1 ring-purple-100 transition-colors",
                syncing
                  ? "bg-white/50 text-purple-400"
                  : "bg-white text-purple-600 hover:bg-purple-50 hover:text-purple-700"
              )}
            >
              <RotateCw size={14} className={syncing ? "animate-spin" : ""} />
              {t("oracle.config.syncNow")}
            </button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 lg:grid-cols-3">
            <div>
              <div className="mb-1 text-xs font-medium text-purple-500">{t("oracle.config.rpcUrl")}</div>
              <input
                value={config.rpcUrl}
                onChange={(e) => setConfig((c) => ({ ...c, rpcUrl: e.target.value }))}
                placeholder="https://…"
                className="h-9 w-full rounded-lg border-none bg-white/50 px-3 text-sm text-purple-900 shadow-sm placeholder:text-purple-300 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-purple-500">{t("oracle.config.contractAddress")}</div>
              <input
                value={config.contractAddress}
                onChange={(e) => setConfig((c) => ({ ...c, contractAddress: e.target.value }))}
                placeholder="0x…"
                className="h-9 w-full rounded-lg border-none bg-white/50 px-3 font-mono text-sm text-purple-900 shadow-sm placeholder:text-purple-300 focus:ring-2 focus:ring-purple-500/20"
              />
            </div>
            <div>
              <div className="mb-1 text-xs font-medium text-purple-500">{t("oracle.config.chain")}</div>
              <select
                value={config.chain}
                onChange={(e) => setConfig((c) => ({ ...c, chain: e.target.value as OracleConfig["chain"] }))}
                className="h-9 w-full rounded-lg border-none bg-white/50 px-3 text-sm text-purple-900 shadow-sm focus:ring-2 focus:ring-purple-500/20"
              >
                <option value="Local">{t("chain.local")}</option>
                <option value="Polygon">{t("chain.polygon")}</option>
                <option value="Arbitrum">{t("chain.arbitrum")}</option>
                <option value="Optimism">{t("chain.optimism")}</option>
              </select>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-1 text-xs font-medium text-purple-500">{t("oracle.config.adminToken")}</div>
            <input
              value={adminToken}
              onChange={(e) => setAdminToken(e.target.value)}
              placeholder="Bearer …"
              type="password"
              autoComplete="off"
              className="h-9 w-full rounded-lg border-none bg-white/50 px-3 text-sm text-purple-900 shadow-sm placeholder:text-purple-300 focus:ring-2 focus:ring-purple-500/20"
            />
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-md border border-purple-100 bg-white/50 px-2 py-1 text-purple-700/70">
                {t("oracle.config.lastBlock")}: {status ? status.state.lastProcessedBlock : "—"}
              </span>
              <span className="rounded-md border border-purple-100 bg-white/50 px-2 py-1 text-purple-700/70">
                {t("oracle.config.syncStatus")}:{" "}
                {status?.state.syncing
                  ? t("oracle.config.syncing")
                  : status?.state.sync?.lastSuccessAt
                    ? formatTime(status.state.sync.lastSuccessAt, locale)
                    : "—"}
              </span>
              <span className="rounded-md border border-purple-100 bg-white/50 px-2 py-1 text-purple-700/70">
                {t("oracle.config.syncDuration")}: {formatDurationMs(status?.state.sync?.lastDurationMs)}
              </span>
              <span className="rounded-md border border-purple-100 bg-white/50 px-2 py-1 text-purple-700/70">
                {status && status.state.lastProcessedBlock !== "0" ? t("oracle.config.indexed") : t("oracle.config.demo")}
              </span>
            </div>

            <button
              onClick={saveConfig}
              disabled={saving}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-medium shadow-sm ring-1 ring-purple-100 transition-colors",
                saving
                  ? "bg-white/50 text-purple-400"
                  : "bg-purple-600 text-white hover:bg-purple-700"
              )}
            >
              {t("oracle.config.save")}
            </button>
          </div>

          <div className="mt-3 text-xs text-purple-700/60">
            {status && status.state.lastProcessedBlock !== "0" ? t("oracle.config.indexedHint") : t("oracle.config.demoHint")}
          </div>
          {status?.state.sync?.lastError && (
            <div className="mt-2 text-xs text-rose-700/80">
              {t("oracle.config.syncError")}: {getUiErrorMessage(status.state.sync.lastError, t)}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title={t("oracle.stats.tvs")}
          value={formattedStats?.tvs ?? "—"}
          icon={DollarSign}
        />
        <StatsCard
          title={t("oracle.stats.activeDisputes")}
          value={formattedStats?.activeDisputes ?? "—"}
          icon={AlertCircle}
        />
        <StatsCard
          title={t("oracle.stats.resolved24h")}
          value={formattedStats?.resolved24h ?? "—"}
          icon={CheckCircle2}
        />
        <StatsCard
          title={t("oracle.stats.avgResolution")}
          value={formattedStats?.avgResolution ?? "—"}
          icon={Clock}
        />
      </div>

      <div className="flex space-x-1 rounded-xl bg-purple-50/50 p-1">
        <button
          onClick={() => setActiveTab("overview")}
          className={cn(
            "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
            activeTab === "overview"
              ? "bg-white text-purple-700 shadow ring-1 ring-purple-100"
              : "text-purple-600 hover:bg-white/[0.12] hover:text-purple-800"
          )}
        >
          {t("oracle.tabs.overview")}
        </button>
        <button
          onClick={() => setActiveTab("leaderboard")}
          className={cn(
            "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
            activeTab === "leaderboard"
              ? "bg-white text-purple-700 shadow ring-1 ring-purple-100"
              : "text-purple-600 hover:bg-white/[0.12] hover:text-purple-800"
          )}
        >
          {t("oracle.tabs.leaderboard")}
        </button>
        <button
          onClick={() => setActiveTab("tools")}
          className={cn(
            "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
            activeTab === "tools"
              ? "bg-white text-purple-700 shadow ring-1 ring-purple-100"
              : "text-purple-600 hover:bg-white/[0.12] hover:text-purple-800"
          )}
        >
          {t("oracle.tabs.tools")}
        </button>
      </div>

      {activeTab === "overview" ? (
         <>
           <OracleCharts />

           <div className="flex flex-col gap-6">
        {error && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-700 shadow-sm">
            {getUiErrorMessage(error, t)}
          </div>
        )}
        {configError && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-700 shadow-sm">
             {getUiErrorMessage(configError, t)}
          </div>
        )}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            {["All", "Pending", "Disputed", "Resolved"].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status as OracleStatus | "All")}
                className={cn(
                  "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
                  filterStatus === status
                    ? "bg-purple-100 text-purple-900 ring-1 ring-purple-200"
                    : "text-purple-600/70 hover:bg-white/50 hover:text-purple-900"
                )}
              >
                {statusLabel(status as OracleStatus | "All")}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={filterChain}
              onChange={(e) => setFilterChain(e.target.value as OracleConfig["chain"] | "All")}
              className="h-9 rounded-lg border-none bg-white/50 px-3 text-sm text-purple-900 shadow-sm focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="All">{t("common.all")}</option>
              <option value="Local">{t("chain.local")}</option>
              <option value="Polygon">{t("chain.polygon")}</option>
              <option value="Arbitrum">{t("chain.arbitrum")}</option>
              <option value="Optimism">{t("chain.optimism")}</option>
            </select>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
              <input 
                type="text" 
                placeholder={t("oracle.searchPlaceholder")} 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 w-full rounded-lg border-none bg-white/50 pl-9 pr-4 text-sm text-purple-900 shadow-sm placeholder:text-purple-300 focus:ring-2 focus:ring-purple-500/20 md:w-64"
              />
            </div>
            <button
              type="button"
              disabled
              title={t("common.comingSoon")}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/50 text-purple-400 shadow-sm cursor-not-allowed"
            >
              <Filter size={16} />
            </button>
          </div>
        </div>

        {loading && (
          <div className="rounded-2xl border border-purple-100 bg-white/50 p-6 text-sm text-purple-700/70 shadow-sm">
            {t("common.loading")}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {!loading && items.map((item) => (
            <Link href={`/oracle/${item.id}`} key={item.id} className="block h-full">
            <Card className="group h-full relative overflow-hidden border-purple-100/60 bg-white/60 hover:border-purple-200 hover:shadow-lg transition-all duration-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-black/5 text-xs font-bold text-gray-600",
                      item.chain === "Polygon" && "text-violet-600 bg-violet-50",
                      item.chain === "Arbitrum" && "text-blue-600 bg-blue-50",
                      item.chain === "Optimism" && "text-red-600 bg-red-50",
                      item.chain === "Local" && "text-gray-600 bg-gray-50",
                    )}>
                      {item.chain[0]}
                    </div>
                    <div>
                      <div className="text-xs font-medium text-purple-400">{item.protocol}</div>
                      <div className="text-sm font-semibold text-purple-950">{item.id}</div>
                    </div>
                  </div>
                  <span className={cn("px-2.5 py-0.5 rounded-full text-xs font-medium border", getStatusColor(item.status))}>
                    {statusLabel(item.status)}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <h4 className="mb-1 text-sm font-medium text-purple-900/60">{t("oracle.card.marketQuestion")}</h4>
                  <p className="line-clamp-2 text-base font-medium text-purple-950 leading-snug">
                    {item.market}
                  </p>
                </div>

                <div className="mb-4 grid gap-2 rounded-xl bg-white/40 p-3 text-xs text-purple-900/70 ring-1 ring-purple-100/60">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-purple-500">{t("oracle.card.asserter")}</span>
                    <span className="font-mono text-purple-700">{shortAddress(item.asserter)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-purple-500">{t("oracle.card.disputer")}</span>
                    <span className="font-mono text-purple-700">{item.disputer ? shortAddress(item.disputer) : "—"}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-purple-500">{t("oracle.card.bond")}</span>
                    <span className="font-medium text-purple-700">{formatUsd(item.bondUsd, locale)}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-purple-100/50 pt-3">
                  <div className="flex items-center gap-1.5 text-xs text-purple-400">
                    <Clock size={12} />
                    <span>{formatTime(item.assertedAt, locale)}</span>
                  </div>
                  <a
                    href={txUrl(item.chain as OracleConfig["chain"], item.txHash) || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-medium text-purple-600 transition-colors hover:text-purple-800"
                  >
                    {t("common.viewTx")}
                    <ArrowUpRight size={12} />
                  </a>
                </div>
              </CardContent>
            </Card>
            </Link>
          ))}
        </div>

        {items.length > 0 && (
          <div className="flex justify-center pt-6 pb-12">
            {hasMore ? (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="group flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-medium text-purple-700 shadow-sm ring-1 ring-purple-100 transition-all hover:bg-purple-50 hover:shadow-md disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <RotateCw size={16} className="animate-spin" />
                    <span>{t("common.loading")}</span>
                  </>
                ) : (
                  <>
                    <ArrowUpRight size={16} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    <span>{t("common.loadMore")}</span>
                  </>
                )}
              </button>
            ) : (
              <div className="text-sm text-purple-400 italic flex items-center gap-2">
                <CheckCircle2 size={14} />
                <span>{t("common.allLoaded")}</span>
              </div>
            )}
          </div>
        )}
      </div>
      </>
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
