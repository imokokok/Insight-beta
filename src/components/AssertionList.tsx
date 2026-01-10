import { memo } from "react";
import Link from "next/link";
import { 
  CheckCircle2,
  Clock,
  ArrowUpRight,
  RotateCw
} from "lucide-react";
import { cn, formatTime, formatUsd } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";
import { langToLocale } from "@/i18n/translations";
import type { Assertion, OracleStatus } from "@/lib/oracleTypes";
import { SkeletonList } from "./SkeletonList";

interface AssertionListProps {
  items: Assertion[];
  loading: boolean;
  viewMode: "grid" | "list";
  hasMore: boolean;
  loadMore: () => void;
  loadingMore: boolean;
}

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

export const AssertionList = memo(function AssertionList({ items, loading, viewMode, hasMore, loadMore, loadingMore }: AssertionListProps) {
  const { t, lang } = useI18n();
  const locale = langToLocale[lang];

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

  if (loading) {
    return <SkeletonList count={6} viewMode={viewMode} />;
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20">
        <div className="inline-block p-6 rounded-2xl bg-gray-50 border border-gray-100">
           <p className="text-gray-500 font-medium">{t("common.noData")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className={cn(
        "grid gap-6",
        viewMode === "grid" ? "md:grid-cols-2 xl:grid-cols-3" : "grid-cols-1"
      )}>
        {items.map((item) => (
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
                <span className="flex items-center gap-1 text-xs font-bold text-purple-600 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all transform translate-x-0 md:translate-x-[-10px] md:group-hover:translate-x-0">
                  {t("common.viewDetails")}
                  <ArrowUpRight size={12} />
                </span>
              </div>
            )}
            
            {/* View Details arrow for List View */}
            {viewMode === "list" && (
               <div className="flex items-center text-purple-600 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all transform translate-x-0 md:translate-x-[-10px] md:group-hover:translate-x-0 pl-0 md:pl-4 border-t md:border-t-0 md:border-l border-gray-100 w-full md:w-auto pt-4 md:pt-0 justify-end md:justify-start">
                  <span className="md:hidden text-xs font-bold mr-2">{t("common.viewDetails")}</span>
                  <ArrowUpRight size={20} />
               </div>
            )}
          </div>
          </Link>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-8">
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
        </div>
      )}

      {!hasMore && items.length > 0 && (
        <div className="flex justify-center pt-8">
          <div className="text-sm font-medium text-gray-400 flex items-center gap-2 py-4">
            <CheckCircle2 size={16} />
            <span>{t("common.allLoaded")}</span>
          </div>
        </div>
      )}
    </div>
  );
});
