"use client";

import { useEffect, useState } from "react";
import type { Route } from "next";
import {
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation";
import { ExternalLink, LayoutGrid, List as ListIcon } from "lucide-react";
import { useI18n } from "@/i18n/LanguageProvider";
import { getUiErrorMessage } from "@/i18n/translations";
import { UserStatsCard } from "@/components/UserStatsCard";
import { AssertionList } from "@/components/AssertionList";
import { DisputeList } from "@/components/DisputeList";
import { AddressAvatar } from "@/components/AddressAvatar";
import { CopyButton } from "@/components/CopyButton";
import { cn, getExplorerUrl } from "@/lib/utils";
import { useOracleData } from "@/hooks/useOracleData";
import { useDisputes } from "@/hooks/useDisputes";
import { useUserStats } from "@/hooks/useUserStats";

export default function AddressProfilePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const address = params.address as string;
  const { t } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const currentSearch = searchParams?.toString() ?? "";
  const [activeTab, setActiveTab] = useState<"assertions" | "disputes">(
    "assertions",
  );
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
  const instanceIdFromUrl = searchParams?.get("instanceId")?.trim() || "";
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
    const normalized = instanceId.trim();
    const params = new URLSearchParams(currentSearch);
    if (normalized) params.set("instanceId", normalized);
    else params.delete("instanceId");
    const nextSearch = params.toString();
    const nextUrl = nextSearch ? `${pathname}?${nextSearch}` : pathname;
    const currentUrl = currentSearch
      ? `${pathname}?${currentSearch}`
      : pathname;
    if (nextUrl !== currentUrl)
      router.replace(nextUrl as Route, { scroll: false });
  }, [currentSearch, instanceId, pathname, router]);

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
        viewMode,
      };
      window.localStorage.setItem("oracleFilters", JSON.stringify(next));
    } catch {
      void 0;
    }
  }, [instanceId, viewMode]);

  // Fetch User Stats
  const { stats, loading: statsLoading } = useUserStats(address, instanceId);

  // Fetch Assertions (reusing useOracleData)
  const {
    items: assertions,
    loading: assertionsLoading,
    loadingMore: assertionsLoadingMore,
    error: assertionsError,
    hasMore: assertionsHasMore,
    loadMore: loadMoreAssertions,
  } = useOracleData("All", "All", "", address, instanceId);

  // Fetch Disputes
  const {
    items: disputes,
    loading: disputesLoading,
    loadingMore: disputesLoadingMore,
    error: disputesError,
    hasMore: disputesHasMore,
    loadMore: loadMoreDisputes,
  } = useDisputes("All", "All", "", address, instanceId);
  const activeError =
    activeTab === "assertions" ? assertionsError : disputesError;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-7xl">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
        <div>
          <div className="flex items-center gap-4 mb-3">
            <div className="p-1 bg-white rounded-full ring-4 ring-purple-50 shadow-sm">
              <AddressAvatar address={address} size={48} />
            </div>
            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
              {t("oracle.profile.title")}
            </h1>
          </div>
          <div className="flex items-center gap-3 ml-1">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 border border-gray-200/60 shadow-sm">
              <code className="text-gray-600 font-mono text-sm font-semibold">
                {address}
              </code>
              <div className="h-4 w-px bg-gray-300 mx-1" />
              <CopyButton
                text={address}
                label="Address"
                className="h-6 w-6 p-1 hover:bg-white"
                iconSize={14}
              />
            </div>
            {getExplorerUrl("Mainnet", address, "address") && (
              <a
                href={getExplorerUrl("Mainnet", address, "address")!}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors border border-transparent hover:border-purple-100"
                title={t("common.viewOnExplorer")}
              >
                <ExternalLink size={18} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <UserStatsCard stats={stats ?? null} loading={statsLoading} />

      {/* Content Tabs */}
      <div className="space-y-6">
        <div className="flex items-center justify-between border-b border-gray-200/60 pb-1">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("assertions")}
              className={cn(
                "pb-3 text-sm font-bold transition-all relative",
                activeTab === "assertions"
                  ? "text-purple-600"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              {t("oracle.profile.assertionsHistory")}
              {activeTab === "assertions" && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-full" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("disputes")}
              className={cn(
                "pb-3 text-sm font-bold transition-all relative",
                activeTab === "disputes"
                  ? "text-purple-600"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              {t("oracle.profile.disputesHistory")}
              {activeTab === "disputes" && (
                <span className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-full" />
              )}
            </button>
          </div>

          <div className="flex bg-gray-100/50 p-1 rounded-lg border border-gray-200/50">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === "grid"
                  ? "bg-white shadow-sm text-purple-600"
                  : "text-gray-400 hover:text-gray-600",
              )}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === "list"
                  ? "bg-white shadow-sm text-purple-600"
                  : "text-gray-400 hover:text-gray-600",
              )}
            >
              <ListIcon size={16} />
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeError ? (
            <div className="mb-4 rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-700 shadow-sm">
              {getUiErrorMessage(activeError, t)}
            </div>
          ) : null}
          {activeTab === "assertions" ? (
            <AssertionList
              items={assertions}
              loading={assertionsLoading}
              viewMode={viewMode}
              hasMore={assertionsHasMore}
              loadMore={loadMoreAssertions}
              loadingMore={assertionsLoadingMore}
              instanceId={instanceId}
            />
          ) : (
            <DisputeList
              items={disputes}
              loading={disputesLoading}
              viewMode={viewMode}
              hasMore={disputesHasMore}
              loadMore={loadMoreDisputes}
              loadingMore={disputesLoadingMore}
              instanceId={instanceId}
            />
          )}
        </div>
      </div>
    </div>
  );
}
