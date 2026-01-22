"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { ConnectWallet } from "@/components/ConnectWallet";
import { AssertionList } from "@/components/AssertionList";
import { UserStatsCard } from "@/components/UserStatsCard";
import { useOracleData } from "@/hooks/useOracleData";
import { useUserStats } from "@/hooks/useUserStats";
import { useWallet } from "@/contexts/WalletContext";
import { useI18n } from "@/i18n/LanguageProvider";
import { getUiErrorMessage } from "@/i18n/translations";
import { LayoutGrid, List, Search, Wallet, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export default function MyAssertionsPage() {
  const { address } = useWallet();
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams?.toString() ?? "";
  const instanceIdFromUrl = searchParams?.get("instanceId")?.trim() || "";
  const queryFromUrl = searchParams?.get("q")?.trim() || "";
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [query, setQuery] = useState("");
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
  }, [queryFromUrl, query]);

  useEffect(() => {
    const normalized = instanceId.trim();
    const normalizedQuery = query.trim();
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
  }, [instanceId, pathname, router, currentSearch, query]);

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
      };
      window.localStorage.setItem("oracleFilters", JSON.stringify(next));
    } catch {
      void 0;
    }
  }, [instanceId]);

  const { items, loading, loadingMore, hasMore, loadMore, error } =
    useOracleData("All", "All", query, address, instanceId);
  const { stats, loading: statsLoading } = useUserStats(address, instanceId);

  if (!address) {
    return (
      <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <PageHeader
          title={t("nav.myAssertions")}
          description={t("oracle.myAssertions.description")}
        >
          <ConnectWallet />
        </PageHeader>

        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="p-6 rounded-full bg-purple-50 text-purple-600 mb-6">
            <Wallet size={48} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {t("oracle.myAssertions.connectWalletTitle")}
          </h2>
          <p className="text-gray-500 max-w-md mx-auto mb-8">
            {t("oracle.myAssertions.connectWalletDesc")}
          </p>
          <ConnectWallet />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title={t("nav.myAssertions")}
        description={t("oracle.myAssertions.description")}
      >
        <ConnectWallet />
      </PageHeader>

      {/* User Stats */}
      <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
        <UserStatsCard stats={stats} loading={statsLoading} />
      </div>

      {/* Toolbar */}
      <div className="glass-panel sticky top-4 z-20 rounded-2xl p-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shadow-xl shadow-purple-900/5 backdrop-blur-xl border-white/60 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
        <div className="flex items-center gap-3">
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

          <div className="relative flex-1 sm:flex-initial">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("oracle.myAssertions.searchPlaceholder")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="glass-input h-9 w-full rounded-xl pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500/20 md:w-64"
            />
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
              <FileText size={48} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {t("oracle.myAssertions.noAssertions")}
            </h2>
            <p className="text-gray-500 max-w-md mx-auto">
              {t("oracle.myAssertions.createFirst")}
            </p>
          </div>
        ) : (
          <AssertionList
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
