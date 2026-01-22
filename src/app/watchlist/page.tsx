"use client";

import { useCallback, useEffect, useState } from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useInfiniteList, BaseResponse } from "@/hooks/useInfiniteList";
import { Assertion } from "@/lib/oracleTypes";
import { AssertionList } from "@/components/AssertionList";
import { PageHeader } from "@/components/PageHeader";
import { useI18n } from "@/i18n/LanguageProvider";
import { getUiErrorMessage } from "@/i18n/translations";
import { Star } from "lucide-react";
import Link from "next/link";

export default function WatchlistPage() {
  const { t } = useI18n();
  const { watchlist, mounted } = useWatchlist();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams?.toString() ?? "";
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
  }, [instanceId, pathname, router, currentSearch]);

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

  const getUrl = useCallback(
    (pageIndex: number, previousPageData: BaseResponse<Assertion> | null) => {
      if (!mounted || watchlist.length === 0) return null;
      if (previousPageData && previousPageData.nextCursor === null) return null;

      const params = new URLSearchParams();
      if (instanceId) params.set("instanceId", instanceId);
      params.set("ids", watchlist.join(","));
      params.set("limit", "30");

      if (pageIndex > 0 && previousPageData?.nextCursor) {
        params.set("cursor", String(previousPageData.nextCursor));
      }

      return `/api/oracle/assertions?${params.toString()}`;
    },
    [watchlist, mounted, instanceId],
  );

  const { items, loading, loadingMore, hasMore, loadMore, error } =
    useInfiniteList<Assertion>(getUrl, { revalidateOnFocus: true });

  return (
    <main className="container mx-auto px-4 py-8 pb-24">
      <PageHeader title={t("nav.watchlist")} />

      {!mounted ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
        </div>
      ) : watchlist.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
            <Star size={48} className="text-gray-300" />
          </div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">
            {t("common.noData")}
          </h2>
          <p className="text-gray-500 max-w-md mb-8">
            {t("watchlist.emptyDesc")}
          </p>
          <Link
            href={
              instanceId
                ? `/oracle?instanceId=${encodeURIComponent(instanceId)}`
                : "/oracle"
            }
            className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium shadow-lg shadow-purple-500/20"
          >
            {t("nav.oracle")}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {error ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-700 shadow-sm">
              {getUiErrorMessage(error, t)}
            </div>
          ) : null}
          <AssertionList
            items={items}
            loading={loading}
            hasMore={hasMore}
            loadMore={loadMore}
            loadingMore={loadingMore}
            emptyStateMessage={t("common.noData")}
            viewMode="grid"
            instanceId={instanceId}
          />
        </div>
      )}
    </main>
  );
}
