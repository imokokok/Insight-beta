"use client";

import { useCallback } from "react";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useInfiniteList, BaseResponse } from "@/hooks/useInfiniteList";
import { Assertion } from "@/lib/oracleTypes";
import { AssertionList } from "@/components/AssertionList";
import { PageHeader } from "@/components/PageHeader";
import { useI18n } from "@/i18n/LanguageProvider";
import { Star } from "lucide-react";
import Link from "next/link";

export default function WatchlistPage() {
  const { t } = useI18n();
  const { watchlist, mounted } = useWatchlist();

  const getUrl = useCallback(
    (pageIndex: number, previousPageData: BaseResponse<Assertion> | null) => {
      if (!mounted || watchlist.length === 0) return null;
      if (previousPageData && previousPageData.nextCursor === null) return null;

      const params = new URLSearchParams();
      params.set("ids", watchlist.join(","));
      params.set("limit", "30");

      if (pageIndex > 0 && previousPageData?.nextCursor) {
        params.set("cursor", String(previousPageData.nextCursor));
      }

      return `/api/oracle/assertions?${params.toString()}`;
    },
    [watchlist, mounted]
  );

  const { items, loading, loadingMore, hasMore, loadMore } =
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
            href="/oracle"
            className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium shadow-lg shadow-purple-500/20"
          >
            {t("nav.oracle")}
          </Link>
        </div>
      ) : (
        <AssertionList
          items={items}
          loading={loading}
          hasMore={hasMore}
          loadMore={loadMore}
          loadingMore={loadingMore}
          emptyStateMessage={t("common.noData")}
          viewMode="grid"
        />
      )}
    </main>
  );
}
