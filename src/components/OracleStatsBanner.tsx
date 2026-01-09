"use client";

import { DollarSign, AlertCircle, CheckCircle2, Clock, ArrowUpRight } from "lucide-react";
import { useI18n } from "@/i18n/LanguageProvider";

interface OracleStatsBannerProps {
  stats: {
    tvs: string;
    activeDisputes: string;
    resolved24h: string;
    avgResolution: string;
  } | null;
  loading?: boolean;
}

export function OracleStatsBanner({ stats, loading }: OracleStatsBannerProps) {
  const { t } = useI18n();

  if (loading) {
    return (
      <div className="w-full h-32 rounded-3xl bg-white/40 animate-pulse" />
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-3xl glass-panel border border-white/60 p-1 shadow-2xl shadow-purple-500/5 group">
      {/* Artistic Background Mesh */}
      <div className="absolute inset-0 pointer-events-none opacity-40 transition-opacity duration-700 group-hover:opacity-50">
        <div className="absolute -left-[10%] -top-[50%] h-[200%] w-[50%] bg-gradient-to-br from-purple-200/40 via-fuchsia-100/20 to-transparent blur-3xl rounded-full animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute right-0 bottom-0 h-[80%] w-[30%] bg-gradient-to-tl from-indigo-200/40 via-purple-100/20 to-transparent blur-3xl rounded-full animate-pulse" style={{ animationDuration: '10s' }} />
      </div>

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 lg:p-8">
        
        {/* Primary Stat: TVS */}
        <div className="lg:col-span-5 flex flex-col justify-center border-b lg:border-b-0 lg:border-r border-gray-100/50 pb-6 lg:pb-0 lg:pr-8">
            <div className="flex items-center gap-3 mb-3">
                <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 shadow-sm ring-1 ring-purple-100 group-hover:scale-110 transition-transform duration-300">
                    <DollarSign size={24} />
                </div>
                <span className="text-sm font-bold text-gray-500 uppercase tracking-wider">
                    {t("oracle.stats.tvs")}
                </span>
            </div>
            <div className="flex items-baseline gap-2">
                <h2 className="text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-800 drop-shadow-sm filter">
                    {stats?.tvs ?? "—"}
                </h2>
                <span className="text-sm font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100/50">
                    +2.4%
                </span>
            </div>
            <p className="mt-3 text-sm text-gray-400 font-medium flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          {t("oracle.stats.liveCap")}
        </p>
        </div>

        {/* Secondary Stats Grid */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3 gap-6 lg:pl-2">
            
            {/* Active Disputes */}
            <div className="relative group/card p-5 rounded-2xl bg-white/40 border border-white/50 hover:bg-white/80 transition-all duration-300 hover:shadow-lg hover:shadow-rose-500/10 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2 rounded-lg bg-rose-50 text-rose-600 ring-1 ring-rose-100/50 group-hover/card:scale-110 transition-transform">
                        <AlertCircle size={20} />
                    </div>
                    {stats && stats.activeDisputes !== "0" && (
                         <span className="flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                    )}
                </div>
                <div className="space-y-1.5">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t("oracle.stats.activeDisputes")}</span>
                    <div className="text-3xl font-black text-gray-800 group-hover/card:text-rose-600 transition-colors">
                        {stats?.activeDisputes ?? "—"}
                    </div>
                </div>
            </div>

            {/* Resolved 24h */}
            <div className="relative group/card p-5 rounded-2xl bg-white/40 border border-white/50 hover:bg-white/80 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100/50 group-hover/card:scale-110 transition-transform">
                        <CheckCircle2 size={20} />
                    </div>
                    <ArrowUpRight size={16} className="text-emerald-500 opacity-50 group-hover/card:opacity-100 transition-opacity" />
                </div>
                <div className="space-y-1.5">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t("oracle.stats.resolved24h")}</span>
                    <div className="text-3xl font-black text-gray-800 group-hover/card:text-emerald-600 transition-colors">
                        {stats?.resolved24h ?? "—"}
                    </div>
                </div>
            </div>

            {/* Avg Resolution */}
            <div className="relative group/card p-5 rounded-2xl bg-white/40 border border-white/50 hover:bg-white/80 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/10 hover:-translate-y-1">
                <div className="flex items-center justify-between mb-4">
                    <div className="p-2 rounded-lg bg-blue-50 text-blue-600 ring-1 ring-blue-100/50 group-hover/card:scale-110 transition-transform">
                        <Clock size={20} />
                    </div>
                </div>
                <div className="space-y-1.5">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{t("oracle.stats.avgResolution")}</span>
                    <div className="text-3xl font-black text-gray-800 group-hover/card:text-blue-600 transition-colors">
                        {stats?.avgResolution ?? "—"}
                    </div>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
}
