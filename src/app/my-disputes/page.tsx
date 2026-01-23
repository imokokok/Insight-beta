"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { ConnectWallet } from "@/components/ConnectWallet";
import { DisputeList } from "@/components/DisputeList";
import { UserStatsCard } from "@/components/UserStatsCard";
import { useDisputes } from "@/hooks/useDisputes";
import { useUserStats } from "@/hooks/useUserStats";
import { useWallet } from "@/contexts/WalletContext";
import { useI18n } from "@/i18n/LanguageProvider";
import { getUiErrorMessage } from "@/i18n/translations";
import { LayoutGrid, List, Search, Wallet, ChevronDown } from "lucide-react";
import { cn, fetchApiData } from "@/lib/utils";
import type {
  OracleConfig,
  OracleInstance,
  DisputeStatus,
} from "@/lib/oracleTypes";

export default function MyDisputesPage() {
  const { address } = useWallet();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams?.toString() ?? "";
  const instanceIdFromUrl = searchParams?.get("instanceId")?.trim() || "";
  const queryFromUrl = searchParams?.get("q")?.trim() || "";
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    try {
      if (typeof window === "undefined") return "grid";
      const raw = window.localStorage.getItem("oracleFilters");
      if (!raw) return "grid";
      const parsed = JSON.parse(raw) as { viewMode?: unknown } | null;
      const value =
        parsed && typeof parsed === "object" ? parsed.viewMode : null;
      if (value === "grid" || value === "list") return value;
    } catch {
      return "grid";
    }
    return "grid";
  });
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<DisputeStatus | "All">(
    () => {
      try {
        if (typeof window === "undefined") return "All";
        const saved = window.localStorage.getItem("oracleFilters");
        if (!saved) return "All";
        const parsed = JSON.parse(saved) as { disputeStatus?: unknown } | null;
        const status =
          parsed && typeof parsed === "object" ? parsed.disputeStatus : null;
        if (
          status === "Voting" ||
          status === "Pending Execution" ||
          status === "Executed" ||
          status === "All"
        )
          return status;
      } catch {
        return "All";
      }
      return "All";
    },
  );
  const [filterChain, setFilterChain] = useState<OracleConfig["chain"] | "All">(
    () => {
      try {
        if (typeof window === "undefined") return "All";
        const saved = window.localStorage.getItem("oracleFilters");
        if (!saved) return "All";
        const parsed = JSON.parse(saved) as { chain?: unknown } | null;
        const chain =
          parsed && typeof parsed === "object" ? parsed.chain : null;
        if (
          chain === "Polygon" ||
          chain === "PolygonAmoy" ||
          chain === "Arbitrum" ||
          chain === "Optimism" ||
          chain === "Local" ||
          chain === "All"
        )
          return chain;
      } catch {
        return "All";
      }
      return "All";
    },
  );
  const [instances, setInstances] = useState<OracleInstance[] | null>(null);
  const [instanceId, setInstanceId] = useState<string>(() => {
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
  });

  useEffect(() => {
    if (!instanceIdFromUrl) return;
    if (instanceIdFromUrl === instanceId) return;
    setInstanceId(instanceIdFromUrl);
  }, [instanceIdFromUrl, instanceId]);

  useEffect(() => {
    if (queryFromUrl === query) return;
    setQuery(queryFromUrl);
    setDebouncedQuery(queryFromUrl);
  }, [queryFromUrl, query]);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const normalized = instanceId.trim();
    const normalizedQuery = debouncedQuery.trim();
    const params = new URLSearchParams(currentSearch);
    if (normalized) params.set("instanceId", normalized);
    else params.delete("instanceId");
    if (normalizedQuery) params.set("q", normalizedQuery);
    else params.delete("q");
    const nextSearch = params.toString();
    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    const currentUrl = currentSearch
      ? `${pathname}?${currentSearch}`
      : pathname;
    if (nextUrl !== currentUrl)
      router.replace(nextUrl as Route, { scroll: false });
  }, [instanceId, pathname, router, currentSearch, debouncedQuery]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("oracleFilters");
      const parsed =
        raw && raw.trim()
          ? (JSON.parse(raw) as Record<string, unknown> | null)
          : null;
      const next = {
        ...(parsed && typeof parsed === "object" ? parsed : {}),
        instanceId,
        chain: filterChain,
        viewMode,
        disputeStatus: filterStatus,
      };
      window.localStorage.setItem("oracleFilters", JSON.stringify(next));
    } catch {
      void 0;
    }
  }, [instanceId, filterChain, viewMode, filterStatus]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    fetchApiData<{ instances: OracleInstance[] }>("/api/oracle/instances", {
      signal: controller.signal,
    })
      .then((r) => {
        if (!cancelled) setInstances(r.instances);
      })
      .catch(() => {
        if (!cancelled) setInstances(null);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const { items, loading, loadingMore, hasMore, loadMore, error } = useDisputes(
    filterStatus,
    filterChain,
    debouncedQuery,
    address,
    instanceId,
  );
  const { stats, loading: statsLoading } = useUserStats(address, instanceId);

  if (!address) {
    return (
      <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <PageHeader
          title={t("nav.myDisputes")}
          description={t("oracle.myDisputes.description")}
        >
          <ConnectWallet />
        </PageHeader>

        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-6 rounded-full bg-purple-50 text-purple-600 mb-6">
            <Wallet size={48} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {t("oracle.myDisputes.connectWalletTitle")}
          </h2>
          <p className="text-gray-500 max-w-md mx-auto mb-8">
            {t("oracle.myDisputes.connectWalletDesc")}
          </p>
          <ConnectWallet />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title={t("nav.myDisputes")}
        description={t("oracle.myDisputes.description")}
      >
        <ConnectWallet />
      </PageHeader>

      {/* User Stats */}
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
        <UserStatsCard stats={stats} loading={statsLoading} />
      </div>

      {/* Toolbar */}
      <div className="glass-panel sticky top-4 z-20 rounded-2xl p-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shadow-xl shadow-purple-900/5 backdrop-blur-xl border-white/60 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-1.5 overflow-x-auto p-1 sm:p-0 no-scrollbar">
            {(["All", "Voting", "Pending Execution", "Executed"] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() =>
                    setFilterStatus(status as DisputeStatus | "All")
                  }
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2",
                    filterStatus === status
                      ? "bg-white shadow-md shadow-purple-500/10 ring-1 ring-black/5 scale-105"
                      : "text-gray-500 hover:bg-white/40 hover:text-gray-900",
                    filterStatus === status &&
                      status === "Voting" &&
                      "text-blue-600 ring-blue-100",
                    filterStatus === status &&
                      status === "Pending Execution" &&
                      "text-amber-600 ring-amber-100",
                    filterStatus === status &&
                      status === "Executed" &&
                      "text-emerald-600 ring-emerald-100",
                    filterStatus === status &&
                      status === "All" &&
                      "text-purple-700 ring-purple-100",
                  )}
                >
                  {status === "Voting" && (
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full bg-blue-500",
                        filterStatus !== status && "opacity-50",
                      )}
                    />
                  )}
                  {status === "Pending Execution" && (
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full bg-amber-500",
                        filterStatus !== status && "opacity-50",
                      )}
                    />
                  )}
                  {status === "Executed" && (
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full bg-emerald-500",
                        filterStatus !== status && "opacity-50",
                      )}
                    />
                  )}
                  {status === "All" && (
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full bg-purple-500",
                        filterStatus !== status && "opacity-50",
                      )}
                    />
                  )}
                  {status === "All" && t("common.all")}
                  {status === "Voting" && t("status.voting")}
                  {status === "Pending Execution" &&
                    t("status.pendingExecution")}
                  {status === "Executed" && t("status.executed")}
                </button>
              ),
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3">
            <div className="flex bg-gray-100/50 p-1 rounded-xl">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  viewMode === "grid"
                    ? "bg-white shadow text-purple-600"
                    : "text-gray-400 hover:text-gray-600",
                )}
                title={t("oracle.card.gridView")}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-1.5 rounded-md transition-all",
                  viewMode === "list"
                    ? "bg-white shadow text-purple-600"
                    : "text-gray-400 hover:text-gray-600",
                )}
                title={t("oracle.card.listView")}
              >
                <List size={16} />
              </button>
            </div>

            {instances && instances.length > 0 ? (
              <div className="relative w-full md:hidden">
                <select
                  value={instanceId}
                  onChange={(e) => setInstanceId(e.target.value)}
                  className="glass-input h-9 w-full rounded-xl border-none pl-3 pr-8 text-sm font-medium text-gray-600 hover:bg-white/80 focus:ring-2 focus:ring-purple-500/20 cursor-pointer appearance-none"
                >
                  {instances.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={14}
                />
              </div>
            ) : null}

            <div className="relative w-full md:hidden">
              <select
                value={filterChain}
                onChange={(e) =>
                  setFilterChain(
                    e.target.value as OracleConfig["chain"] | "All",
                  )
                }
                className="glass-input h-9 w-full rounded-xl border-none pl-3 pr-8 text-sm font-medium text-gray-600 hover:bg-white/80 focus:ring-2 focus:ring-purple-500/20 cursor-pointer appearance-none"
              >
                <option value="All">{t("common.all")}</option>
                <option value="Local">{t("chain.local")}</option>
                <option value="Polygon">{t("chain.polygon")}</option>
                <option value="PolygonAmoy">{t("chain.polygon")} (Amoy)</option>
                <option value="Arbitrum">{t("chain.arbitrum")}</option>
                <option value="Optimism">{t("chain.optimism")}</option>
              </select>
              <ChevronDown
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                size={14}
              />
            </div>

            {instances && instances.length > 0 ? (
              <>
                <div className="relative hidden md:block">
                  <select
                    value={instanceId}
                    onChange={(e) => setInstanceId(e.target.value)}
                    className="glass-input h-9 rounded-xl border-none pl-3 pr-8 text-sm font-medium text-gray-600 hover:bg-white/80 focus:ring-2 focus:ring-purple-500/20 cursor-pointer appearance-none"
                  >
                    {instances.map((inst) => (
                      <option key={inst.id} value={inst.id}>
                        {inst.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                    size={14}
                  />
                </div>
                <div className="h-4 w-px bg-gray-200 hidden md:block"></div>
              </>
            ) : null}

            <div className="relative hidden md:block">
              <select
                value={filterChain}
                onChange={(e) =>
                  setFilterChain(
                    e.target.value as OracleConfig["chain"] | "All",
                  )
                }
                className="glass-input h-9 rounded-xl border-none pl-3 pr-8 text-sm font-medium text-gray-600 hover:bg-white/80 focus:ring-2 focus:ring-purple-500/20 cursor-pointer appearance-none"
              >
                <option value="All">{t("common.all")}</option>
                <option value="Local">{t("chain.local")}</option>
                <option value="Polygon">{t("chain.polygon")}</option>
                <option value="PolygonAmoy">{t("chain.polygon")} (Amoy)</option>
                <option value="Arbitrum">{t("chain.arbitrum")}</option>
                <option value="Optimism">{t("chain.optimism")}</option>
              </select>
              <ChevronDown
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                size={14}
              />
            </div>

            <div className="relative w-full md:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={t("oracle.myDisputes.searchPlaceholder")}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="glass-input h-9 w-full rounded-xl pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500/20 md:w-64"
              />
            </div>

            {(filterStatus !== "All" ||
              filterChain !== "All" ||
              query.trim()) && (
              <button
                type="button"
                onClick={() => {
                  setFilterStatus("All");
                  setFilterChain("All");
                  setQuery("");
                  if (typeof window !== "undefined") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
                className="h-9 rounded-xl bg-white px-3 text-sm font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-purple-50"
              >
                {t("audit.clear")}
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
        {error ? (
          <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-700 shadow-sm">
            {getUiErrorMessage(error, t)}
          </div>
        ) : null}
        {!loading && !error && items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="p-6 rounded-full bg-purple-50 text-purple-600 mb-6">
              <Wallet size={48} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {t("oracle.myDisputes.noDisputes")}
            </h2>
            <p className="text-gray-500 max-w-md mx-auto">
              {t("oracle.myDisputes.description")}
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href={
                  instanceId
                    ? `/oracle?instanceId=${encodeURIComponent(instanceId)}`
                    : "/oracle"
                }
                className="rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-purple-500/20 transition-all hover:from-purple-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-purple-500/30"
              >
                {t("nav.oracle")}
              </Link>
              <Link
                href={
                  instanceId
                    ? `/disputes?instanceId=${encodeURIComponent(instanceId)}`
                    : "/disputes"
                }
                className="px-6 py-3 rounded-xl border border-purple-200 text-purple-700 bg-white hover:bg-purple-50 transition-colors font-medium"
              >
                {t("nav.disputes")}
              </Link>
            </div>
          </div>
        ) : (
          <DisputeList
            items={items}
            loading={loading}
            viewMode={viewMode}
            hasMore={hasMore}
            loadMore={loadMore}
            loadingMore={loadingMore}
            instanceId={instanceId}
          />
        )}
      </div>
    </div>
  );
}
