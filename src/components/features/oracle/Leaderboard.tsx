"use client";

import { useI18n } from "@/i18n/LanguageProvider";
import {
  Award,
  TrendingUp,
  User,
  Trophy,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { cn, fetchApiData } from "@/lib/utils";
import { useEffect, useState, memo } from "react";
import type { LeaderboardStats } from "@/lib/types/oracleTypes";
import { logger } from "@/lib/logger";
import Link from "next/link";

interface RankItemProps {
  rank: number;
  address: string;
  count: number;
  type: "asserter" | "disputer";
  value?: number;
  instanceId?: string | null;
}

const RankItem = memo(function RankItem({
  rank,
  address,
  count,
  type,
  value,
  instanceId,
}: RankItemProps) {
  const { t } = useI18n();

  return (
    <Link
      href={
        instanceId
          ? `/oracle/address/${address}?instanceId=${encodeURIComponent(instanceId)}`
          : `/oracle/address/${address}`
      }
      className="block mb-2"
    >
      <div className="group flex items-center justify-between rounded-xl glass-panel p-3 transition-all hover:bg-white/60 hover:shadow-md hover:-translate-y-0.5 border border-white/40">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold shadow-sm transition-transform group-hover:scale-110",
              rank === 1 &&
                "bg-gradient-to-br from-yellow-300 to-amber-500 text-white shadow-amber-500/30",
              rank === 2 &&
                "bg-gradient-to-br from-slate-300 to-slate-500 text-white shadow-slate-500/30",
              rank === 3 &&
                "bg-gradient-to-br from-orange-300 to-orange-500 text-white shadow-orange-500/30",
              rank > 3 && "bg-white/80 text-gray-500 ring-1 ring-gray-200",
            )}
          >
            {rank <= 3 ? <Trophy size={14} /> : rank}
          </div>
          <div className="flex flex-col">
            <span className="font-mono text-sm font-bold text-gray-700 group-hover:text-purple-700 transition-colors">
              {address.slice(0, 6)}...{address.slice(-4)}
            </span>
            <span className="text-[10px] uppercase tracking-wider font-semibold text-gray-400">
              {type === "asserter"
                ? t("oracle.card.asserter")
                : t("oracle.card.disputer")}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1.5 rounded-lg bg-white/50 px-2 py-1 text-sm font-bold text-gray-800 shadow-sm ring-1 ring-gray-900/5">
            {count}
            <span className="text-[10px] font-normal text-gray-500 uppercase">
              {type === "asserter"
                ? t("oracle.leaderboard.assertions")
                : t("oracle.leaderboard.disputes")}
            </span>
          </div>
          {value !== undefined && (
            <div className="mt-1 text-[10px] font-medium text-gray-400">
              ${value.toLocaleString()} {t("oracle.leaderboard.bonded")}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
});

export function Leaderboard({ instanceId }: { instanceId?: string | null }) {
  const { t } = useI18n();
  const [data, setData] = useState<LeaderboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"asserters" | "disputers">(
    "asserters",
  );

  useEffect(() => {
    setLoading(true);
    const normalizedInstanceId = (instanceId ?? "").trim();
    const url = normalizedInstanceId
      ? `/api/oracle/leaderboard?instanceId=${encodeURIComponent(normalizedInstanceId)}`
      : "/api/oracle/leaderboard";
    fetchApiData<LeaderboardStats>(url)
      .then(setData)
      .catch((e) => logger.error("leaderboard_fetch_failed", { error: e }))
      .finally(() => setLoading(false));
  }, [instanceId]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="animate-spin text-purple-500" size={32} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div
        className={cn(
          "glass-card rounded-2xl p-6 relative overflow-hidden transition-all duration-500",
          activeTab === "asserters"
            ? "border-purple-100/20"
            : "border-rose-100/20",
        )}
      >
        {/* Artistic Background Mesh - Dynamic based on tab */}
        <div
          className={cn(
            "absolute inset-0 pointer-events-none transition-opacity duration-700",
            activeTab === "asserters" ? "opacity-20" : "opacity-0",
          )}
        >
          <div className="absolute -right-[10%] -top-[10%] h-[150%] w-[50%] bg-gradient-to-bl from-purple-200/30 via-indigo-100/10 to-transparent blur-3xl rounded-full" />
          <div className="absolute left-0 bottom-0 h-[60%] w-[40%] bg-gradient-to-tr from-blue-100/20 via-transparent to-transparent blur-2xl rounded-full" />
        </div>
        <div
          className={cn(
            "absolute inset-0 pointer-events-none transition-opacity duration-700",
            activeTab === "disputers" ? "opacity-20" : "opacity-0",
          )}
        >
          <div className="absolute -left-[10%] -top-[10%] h-[150%] w-[50%] bg-gradient-to-br from-rose-200/30 via-orange-100/10 to-transparent blur-3xl rounded-full" />
          <div className="absolute right-0 bottom-0 h-[60%] w-[40%] bg-gradient-to-tl from-amber-100/20 via-transparent to-transparent blur-2xl rounded-full" />
        </div>

        {/* Header & Tabs */}
        <div className="relative z-10 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "rounded-xl p-3 shadow-inner ring-1 backdrop-blur-md transition-colors duration-500",
                activeTab === "asserters"
                  ? "bg-gradient-to-br from-purple-500/10 to-indigo-500/10 text-purple-600 ring-purple-500/20"
                  : "bg-gradient-to-br from-rose-500/10 to-orange-500/10 text-rose-600 ring-rose-500/20",
              )}
            >
              {activeTab === "asserters" ? (
                <Award className="h-6 w-6" />
              ) : (
                <TrendingUp className="h-6 w-6" />
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">
                {activeTab === "asserters"
                  ? t("oracle.leaderboard.topAsserters")
                  : t("oracle.leaderboard.topDisputers")}
              </h3>
              <p className="text-sm text-gray-500">
                {activeTab === "asserters"
                  ? t("oracle.leaderboard.topAssertersDesc")
                  : t("oracle.leaderboard.topDisputersDesc")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100/50 backdrop-blur-sm border border-gray-200/50">
            <button
              onClick={() => setActiveTab("asserters")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                activeTab === "asserters"
                  ? "bg-white text-purple-700 shadow-sm ring-1 ring-black/5"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white/50",
              )}
            >
              <Award size={14} />
              {t("oracle.leaderboard.topAsserters")}
            </button>
            <button
              onClick={() => setActiveTab("disputers")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                activeTab === "disputers"
                  ? "bg-white text-rose-700 shadow-sm ring-1 ring-black/5"
                  : "text-gray-500 hover:text-gray-700 hover:bg-white/50",
              )}
            >
              <ShieldCheck size={14} />
              {t("oracle.leaderboard.topDisputers")}
            </button>
          </div>
        </div>

        {/* Content Area */}
        <div className="relative z-10 min-h-[400px]">
          {activeTab === "asserters" ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {data?.topAsserters.map((item) => (
                <RankItem
                  key={item.address}
                  rank={item.rank}
                  address={item.address}
                  count={item.count}
                  value={item.value}
                  type="asserter"
                  instanceId={instanceId}
                />
              ))}
              {(!data?.topAsserters || data.topAsserters.length === 0) && (
                <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
                  <User className="mb-2 h-12 w-12 opacity-20" />
                  <p className="text-sm">{t("oracle.leaderboard.noData")}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
              {data?.topDisputers.map((item) => (
                <RankItem
                  key={item.address}
                  rank={item.rank}
                  address={item.address}
                  count={item.count}
                  type="disputer"
                  instanceId={instanceId}
                />
              ))}
              {(!data?.topDisputers || data.topDisputers.length === 0) && (
                <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
                  <User className="mb-2 h-12 w-12 opacity-20" />
                  <p className="text-sm">{t("oracle.leaderboard.noData")}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
