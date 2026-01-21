import { memo, forwardRef, ComponentPropsWithoutRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import {
  CheckCircle2,
  Clock,
  ArrowUpRight,
  RotateCw,
  FileQuestion,
  Star,
} from "lucide-react";
import { Virtuoso, VirtuosoGrid } from "react-virtuoso";
import { cn, formatTime, formatUsd, getExplorerUrl } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";
import { langToLocale } from "@/i18n/translations";
import { useWatchlist } from "@/hooks/useWatchlist";
import type { Assertion, OracleStatus } from "@/lib/oracleTypes";
import { CopyButton } from "@/components/CopyButton";
import { SkeletonList } from "./SkeletonList";
import { LivenessProgressBar } from "./LivenessProgressBar";

interface AssertionListProps {
  items: Assertion[];
  loading: boolean;
  viewMode: "grid" | "list";
  hasMore: boolean;
  loadMore: () => void;
  loadingMore: boolean;
  emptyStateMessage?: string;
  onCreateAssertion?: () => void;
  instanceId?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  Pending: "bg-blue-50 text-blue-700 ring-blue-500/30 ring-1",
  Disputed: "bg-rose-50 text-rose-700 ring-rose-500/30 ring-1",
  Resolved: "bg-emerald-50 text-emerald-700 ring-emerald-500/30 ring-1",
  default: "bg-gray-50 text-gray-700 ring-gray-500/30 ring-1",
};

function getStatusColor(status: OracleStatus) {
  return STATUS_COLORS[status] || STATUS_COLORS.default;
}

// Grid Components for Virtuoso
const GridList = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
  ({ style, children, ...props }, ref) => (
    <div
      ref={ref}
      {...props}
      style={style}
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-4"
    >
      {children}
    </div>
  ),
);
GridList.displayName = "GridList";

const GridItem = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
  ({ children, ...props }, ref) => (
    <div ref={ref} {...props} className="h-full">
      {children}
    </div>
  ),
);
GridItem.displayName = "GridItem";

// List Components for Virtuoso
const ListContainer = forwardRef<
  HTMLDivElement,
  ComponentPropsWithoutRef<"div">
>(({ style, children, ...props }, ref) => (
  <div ref={ref} {...props} style={style} className="space-y-6 pb-4">
    {children}
  </div>
));
ListContainer.displayName = "ListContainer";

export const AssertionList = memo(function AssertionList({
  items,
  loading,
  viewMode,
  hasMore,
  loadMore,
  loadingMore,
  emptyStateMessage,
  onCreateAssertion,
  instanceId,
}: AssertionListProps) {
  const { t, lang } = useI18n();
  const locale = langToLocale[lang];
  const { isWatched, toggleWatchlist } = useWatchlist();

  if (loading && items.length === 0) {
    return <SkeletonList viewMode={viewMode} />;
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center bg-white/50 backdrop-blur-sm rounded-3xl border border-white/60 shadow-sm">
        <div className="rounded-full bg-gray-100 p-6 mb-4">
          <FileQuestion className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-bold text-gray-900">
          {t("common.noData")}
        </h3>
        <p className="mt-2 text-gray-500 max-w-sm px-4">
          {emptyStateMessage || t("oracle.leaderboard.noData")}
        </p>
        {onCreateAssertion && (
          <button
            onClick={onCreateAssertion}
            className="mt-6 rounded-lg bg-purple-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-purple-500/20 transition-all hover:bg-purple-700 hover:shadow-purple-500/30 hover:-translate-y-0.5 active:translate-y-0"
          >
            {t("oracle.newAssertion")}
          </button>
        )}
      </div>
    );
  }

  const statusLabel = (status: OracleStatus) => {
    if (status === "Pending") return t("common.pending");
    if (status === "Disputed") return t("common.disputed");
    return t("common.resolved");
  };

  const shortAddress = (value: string) => {
    if (!value) return "—";
    if (value.length <= 12) return value;
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  };

  const Footer = () => {
    if (loadingMore) {
      return (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-bold text-purple-600 shadow-lg shadow-purple-500/10 ring-1 ring-purple-100">
            <RotateCw size={18} className="animate-spin" />
            <span>{t("common.loading")}</span>
          </div>
        </div>
      );
    }

    if (!hasMore && items.length > 0) {
      return (
        <div className="flex justify-center py-8">
          <div className="text-sm font-medium text-gray-400 flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{t("common.allLoaded")}</span>
          </div>
        </div>
      );
    }

    // If hasMore but not loadingMore, user scrolling triggers loadMore automatically via endReached.
    // However, we can also keep a manual button if we prefer, but Virtuoso is best with auto-load.
    // We'll return a spacer or the manual button if we want hybrid.
    // Usually infinite scroll hides the button.
    // Let's keep it simple: just a spacer to ensure bottom visibility.
    return <div className="h-8" />;
  };

  const renderCard = (item: Assertion) => {
    const href = instanceId
      ? `/oracle/${item.id}?instanceId=${encodeURIComponent(instanceId)}`
      : `/oracle/${item.id}`;
    return (
      <Link href={href as Route} className="block h-full">
        <div
          className={cn(
            "glass-card rounded-2xl p-5 relative group border border-white/60 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 hover:border-purple-200/50",
            viewMode === "grid"
              ? "h-full"
              : "flex flex-col md:flex-row md:items-center gap-6",
          )}
        >
          {/* Header: Icon, ID, Protocol */}
          <div
            className={cn(
              "flex items-start justify-between",
              viewMode === "list" && "md:w-1/4 shrink-0",
            )}
          >
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-xl shadow-sm ring-1 ring-black/5 text-sm font-bold transition-transform group-hover:scale-110 duration-300",
                  item.chain === "Polygon" &&
                    "bg-gradient-to-br from-violet-50 to-violet-100 text-violet-600",
                  item.chain === "Arbitrum" &&
                    "bg-gradient-to-br from-blue-50 to-blue-100 text-blue-600",
                  item.chain === "Optimism" &&
                    "bg-gradient-to-br from-red-50 to-red-100 text-red-600",
                  item.chain === "Local" &&
                    "bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600",
                )}
              >
                {item.chain[0]}
              </div>
              <div>
                <div className="text-xs font-medium text-gray-400 mb-0.5">
                  {item.protocol}
                </div>
                <div className="text-sm font-bold text-gray-900 font-mono tracking-tight">
                  {item.id}
                </div>
              </div>
              <CopyButton
                text={item.id}
                className="ml-1 h-6 w-6"
                iconSize={12}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleWatchlist(item.id);
                }}
                className={cn(
                  "p-1.5 rounded-lg transition-all duration-200",
                  isWatched(item.id)
                    ? "text-yellow-400 hover:text-yellow-500 hover:bg-yellow-50"
                    : "text-gray-300 hover:text-yellow-400 hover:bg-gray-50",
                )}
                title={
                  isWatched(item.id)
                    ? t("common.removeFromWatchlist")
                    : t("common.addToWatchlist")
                }
              >
                <Star
                  size={18}
                  fill={isWatched(item.id) ? "currentColor" : "none"}
                  strokeWidth={isWatched(item.id) ? 0 : 2}
                />
              </button>

              {/* Status badge for Grid view */}
              {viewMode === "grid" && (
                <span
                  className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-semibold",
                    getStatusColor(item.status),
                  )}
                >
                  {statusLabel(item.status)}
                </span>
              )}
            </div>
          </div>

          {/* Question */}
          <div
            className={cn(viewMode === "grid" ? "mb-6 mt-4" : "flex-1 min-w-0")}
          >
            {viewMode === "grid" && (
              <h4 className="mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {t("oracle.card.marketQuestion")}
              </h4>
            )}
            <p
              className={cn(
                "font-medium text-gray-800 leading-relaxed group-hover:text-purple-900 transition-colors",
                viewMode === "grid"
                  ? "line-clamp-3 text-base"
                  : "line-clamp-2 text-sm md:text-base",
              )}
            >
              {item.market}
            </p>
            {viewMode === "list" && (
              <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1.5">
                  <Clock size={14} />
                  {formatTime(item.assertedAt, locale)}
                </span>
                <span
                  className={cn(
                    "px-2 py-0.5 rounded-full font-medium",
                    getStatusColor(item.status),
                  )}
                >
                  {statusLabel(item.status)}
                </span>
              </div>
            )}
          </div>

          {/* Stats */}
          <div
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-2 gap-3 mb-5"
                : "flex items-center gap-6 md:w-auto shrink-0 mt-4 md:mt-0",
            )}
          >
            <div
              className={cn(
                viewMode === "grid"
                  ? "p-3 rounded-xl bg-gray-50/50"
                  : "text-right",
              )}
            >
              <div className="text-xs text-gray-500 mb-1">
                {t("oracle.card.asserter")}
              </div>
              <div className="font-mono text-xs font-medium text-gray-700">
                {(() => {
                  const explorerUrl = getExplorerUrl(
                    item.chain,
                    item.asserter,
                    "address",
                  );
                  if (!explorerUrl) {
                    return shortAddress(item.asserter);
                  }
                  return (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        window.open(
                          explorerUrl,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }}
                      className="hover:text-purple-600 hover:underline transition-colors"
                    >
                      {shortAddress(item.asserter)}
                    </button>
                  );
                })()}
              </div>
            </div>
            <div
              className={cn(
                viewMode === "grid"
                  ? "p-3 rounded-xl bg-gray-50/50"
                  : "text-right",
              )}
            >
              <div className="text-xs text-gray-500 mb-1">
                {t("oracle.card.bond")}
              </div>
              <div className="font-medium text-gray-900">
                {formatUsd(item.bondUsd, locale)}
              </div>
            </div>
          </div>

          {/* Liveness Progress (Pending only) */}
          {item.status === "Pending" && (
            <div
              className={cn(
                viewMode === "grid"
                  ? "mb-5"
                  : "mt-4 md:mt-0 md:w-40 shrink-0 hidden md:block",
              )}
            >
              <LivenessProgressBar
                startDate={item.assertedAt}
                endDate={item.livenessEndsAt}
                status={item.status}
                label={t("tooltips.liveness")}
                className="w-full"
              />
            </div>
          )}

          {/* Footer for Grid View */}
          {viewMode === "grid" && (
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
                <Clock size={14} />
                <span>{formatTime(item.assertedAt, locale)}</span>
              </div>
              <span className="flex items-center gap-1 text-xs font-bold text-purple-600 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all transform translate-x-0 md:translate-x-[-10px] md:group-hover:translate-x-0">
                {t("common.viewDetails")}
                <ArrowUpRight size={12} />
              </span>
            </div>
          )}

          {/* View Details arrow for List View */}
          {viewMode === "list" && (
            <div className="flex items-center text-purple-600 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all transform translate-x-0 md:translate-x-[-10px] md:group-hover:translate-x-0 pl-0 md:pl-4 border-t md:border-t-0 md:border-l border-gray-100 w-full md:w-auto pt-4 md:pt-0 justify-end md:justify-start">
              <span className="md:hidden text-xs font-bold mr-2">
                {t("common.viewDetails")}
              </span>
              <ArrowUpRight size={20} />
            </div>
          )}
        </div>
      </Link>
    );
  };

  if (viewMode === "grid") {
    return (
      <VirtuosoGrid
        useWindowScroll
        data={items}
        endReached={loadMore}
        overscan={200}
        components={{
          List: GridList,
          Item: GridItem,
          Footer: Footer,
        }}
        itemContent={(_index, item) => renderCard(item)}
      />
    );
  }

  return (
    <Virtuoso
      useWindowScroll
      data={items}
      endReached={loadMore}
      overscan={200}
      components={{
        List: ListContainer,
        Footer: Footer,
      }}
      itemContent={(_index, item) => (
        <div className="mb-6">{renderCard(item)}</div>
      )}
    />
  );
});
