import type { ComponentPropsWithoutRef } from "react";
import { memo, forwardRef } from "react";
import Link from "next/link";
import type { Route } from "next";
import { Virtuoso, VirtuosoGrid } from "react-virtuoso";
import { SkeletonList } from "./SkeletonList";
import {
  CheckCircle2,
  Clock,
  ArrowUpRight,
  RotateCw,
  AlertTriangle,
  Gavel,
  Star,
} from "lucide-react";
import { cn, formatTime, getExplorerUrl } from "@/lib/utils";
import { useWatchlist } from "@/hooks/useWatchlist";
import { useI18n } from "@/i18n/LanguageProvider";
import { langToLocale, type TranslationKey } from "@/i18n/translations";
import type { Dispute, DisputeStatus } from "@/lib/oracleTypes";

interface DisputeListProps {
  items: Dispute[];
  loading: boolean;
  viewMode: "grid" | "list";
  hasMore: boolean;
  loadMore: () => void;
  loadingMore: boolean;
  emptyStateMessage?: string;
  onExplore?: () => void;
  instanceId?: string | null;
}

const STATUS_COLORS: Record<string, string> = {
  Voting: "bg-amber-50 text-amber-700 ring-amber-500/30 ring-1",
  "Pending Execution": "bg-blue-50 text-blue-700 ring-blue-500/30 ring-1",
  Executed: "bg-purple-50 text-purple-700 ring-purple-500/30 ring-1",
  default: "bg-gray-50 text-gray-700 ring-gray-500/30 ring-1",
};

function getStatusColor(status: DisputeStatus) {
  return STATUS_COLORS[status] || STATUS_COLORS.default;
}

type Translate = (key: TranslationKey) => string;

type EmptyStateProps = {
  emptyStateMessage?: string;
  onExplore?: () => void;
  t: Translate;
};

function EmptyState({ emptyStateMessage, onExplore, t }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center bg-white/50 backdrop-blur-sm rounded-3xl border border-white/60 shadow-sm">
      <div className="rounded-full bg-rose-100 p-6 mb-4">
        <Gavel className="h-12 w-12 text-rose-400" />
      </div>
      <h3 className="text-lg font-bold text-gray-900">{t("common.noData")}</h3>
      <p className="mt-2 text-gray-500 max-w-sm px-4">
        {emptyStateMessage || t("oracle.leaderboard.noData")}
      </p>
      {onExplore && (
        <button
          onClick={onExplore}
          className="mt-6 rounded-lg bg-rose-600 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-rose-500/20 transition-all hover:bg-rose-700 hover:shadow-rose-500/30 hover:-translate-y-0.5 active:translate-y-0"
        >
          {t("oracle.detail.back")}
        </button>
      )}
    </div>
  );
}

type ListFooterProps = {
  loadingMore: boolean;
  hasMore: boolean;
  itemsLength: number;
  t: Translate;
};

function ListFooter({ loadingMore, hasMore, itemsLength, t }: ListFooterProps) {
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

  if (!hasMore && itemsLength > 0) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-sm font-medium text-gray-400 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{t("common.allLoaded")}</span>
        </div>
      </div>
    );
  }

  return <div className="h-8" />;
}

function statusLabel(status: DisputeStatus, t: Translate) {
  if (status === "Voting") return t("status.voting");
  if (status === "Pending Execution") return t("status.pendingExecution");
  return t("status.executed");
}

function shortAddress(value: string) {
  if (!value) return "—";
  if (value.length <= 12) return value;
  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

type DisputeCardProps = {
  item: Dispute;
  viewMode: "grid" | "list";
  instanceId?: string | null;
  locale: string;
  t: Translate;
  mounted: boolean;
  isWatched: (assertionId: string) => boolean;
  toggleWatchlist: (assertionId: string) => void;
};

function DisputeCard({
  item,
  viewMode,
  instanceId,
  locale,
  t,
  mounted,
  isWatched,
  toggleWatchlist,
}: DisputeCardProps) {
  const href = instanceId
    ? `/oracle/${item.assertionId}?instanceId=${encodeURIComponent(instanceId)}`
    : `/oracle/${item.assertionId}`;
  return (
    <Link href={href as Route} className="block h-full">
      <div
        className={cn(
          "glass-card rounded-xl p-3 sm:p-5 relative group border border-white/60 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 hover:-translate-y-1 hover:border-purple-200/50",
          viewMode === "grid"
            ? "h-full"
            : "flex flex-col md:flex-row md:items-center gap-4 sm:gap-6",
        )}
      >
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
                {t("disputes.card.dispute")}
              </div>
              <div className="text-sm font-bold text-gray-900 font-mono tracking-tight">
                {item.id.slice(0, 8)}...
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleWatchlist(item.assertionId);
              }}
              className={cn(
                "p-1.5 rounded-lg transition-all z-10",
                mounted && isWatched(item.assertionId)
                  ? "bg-amber-100 text-amber-500 hover:bg-amber-200"
                  : "bg-gray-100/50 text-gray-400 hover:bg-gray-200 hover:text-gray-600",
              )}
              title={
                mounted && isWatched(item.assertionId)
                  ? t("common.removeFromWatchlist")
                  : t("common.addToWatchlist")
              }
            >
              <Star
                size={16}
                className={cn(
                  "transition-all",
                  mounted && isWatched(item.assertionId) && "fill-current",
                )}
              />
            </button>
            {viewMode === "grid" && (
              <span
                className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-semibold",
                  getStatusColor(item.status),
                )}
              >
                {statusLabel(item.status, t)}
              </span>
            )}
          </div>
        </div>

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

          <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-rose-50 text-rose-700 text-xs">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span className="line-clamp-2">{item.disputeReason}</span>
          </div>

          {viewMode === "list" && (
            <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1.5">
                <Clock size={14} />
                {formatTime(item.disputedAt, locale)}
              </span>
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full font-medium",
                  getStatusColor(item.status),
                )}
              >
                {statusLabel(item.status, t)}
              </span>
            </div>
          )}
        </div>

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
              {t("disputes.card.disputer")}
            </div>
            <div className="font-mono text-xs font-medium text-gray-700 flex items-center gap-1 justify-end">
              {shortAddress(item.disputer)}
              {getExplorerUrl(item.chain, item.disputer) && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    window.open(
                      getExplorerUrl(item.chain, item.disputer)!,
                      "_blank",
                      "noopener noreferrer",
                    );
                  }}
                  className="text-gray-400 hover:text-purple-600 transition-colors p-1 rounded hover:bg-gray-100"
                  title={t("common.viewOnExplorer")}
                  aria-label={t("common.viewOnExplorer")}
                >
                  <ArrowUpRight size={10} />
                </button>
              )}
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
              {t("disputes.card.votes")}
            </div>
            <div className="font-medium text-gray-900">{item.totalVotes}</div>
          </div>
        </div>

        {viewMode === "grid" && (
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
              <Clock size={14} />
              <span>{formatTime(item.disputedAt, locale)}</span>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold text-purple-600 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all transform translate-x-0 md:translate-x-[-10px] md:group-hover:translate-x-0">
              {t("common.viewDetails")}
              <ArrowUpRight size={12} />
            </span>
          </div>
        )}

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
}

// Grid Components for Virtuoso
const GridList = forwardRef<HTMLDivElement, ComponentPropsWithoutRef<"div">>(
  ({ style, children, ...props }, ref) => (
    <div
      ref={ref}
      {...props}
      style={style}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pb-4"
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

export const DisputeList = memo(function DisputeList({
  items,
  loading,
  viewMode,
  hasMore,
  loadMore,
  loadingMore,
  emptyStateMessage,
  onExplore,
  instanceId,
}: DisputeListProps) {
  const { t, lang } = useI18n();
  const locale = langToLocale[lang];
  const { isWatched, toggleWatchlist, mounted } = useWatchlist();

  if (loading && items.length === 0) {
    return <SkeletonList viewMode={viewMode} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        emptyStateMessage={emptyStateMessage}
        onExplore={onExplore}
        t={t}
      />
    );
  }

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
          Footer: () => (
            <ListFooter
              loadingMore={loadingMore}
              hasMore={hasMore}
              itemsLength={items.length}
              t={t}
            />
          ),
        }}
        itemContent={(_index, item) => (
          <DisputeCard
            item={item}
            viewMode={viewMode}
            instanceId={instanceId}
            locale={locale}
            t={t}
            mounted={mounted}
            isWatched={isWatched}
            toggleWatchlist={toggleWatchlist}
          />
        )}
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
        Footer: () => (
          <ListFooter
            loadingMore={loadingMore}
            hasMore={hasMore}
            itemsLength={items.length}
            t={t}
          />
        ),
      }}
      itemContent={(_index, item) => (
        <div className="mb-6">
          <DisputeCard
            item={item}
            viewMode={viewMode}
            instanceId={instanceId}
            locale={locale}
            t={t}
            mounted={mounted}
            isWatched={isWatched}
            toggleWatchlist={toggleWatchlist}
          />
        </div>
      )}
    />
  );
});
