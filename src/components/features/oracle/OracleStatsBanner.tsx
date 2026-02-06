'use client';

import { DollarSign, AlertCircle, CheckCircle2, Clock, ArrowUpRight } from 'lucide-react';

import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/i18n/LanguageProvider';

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
      <div className="relative w-full overflow-hidden rounded-3xl border border-white/60 bg-white/40 p-1 shadow-2xl shadow-purple-500/5">
        <div className="grid grid-cols-1 gap-6 p-6 lg:grid-cols-12 lg:p-8">
          {/* TVS Skeleton */}
          <div className="flex flex-col justify-center space-y-6 border-b border-gray-100/50 pb-6 lg:col-span-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-5 w-32 rounded-md" />
            </div>
            <div className="flex items-baseline gap-4">
              <Skeleton className="h-16 w-48 rounded-2xl" />
              <Skeleton className="h-8 w-16 rounded-lg" />
            </div>
            <Skeleton className="h-4 w-40 rounded-md" />
          </div>

          {/* Secondary Stats Skeleton */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:col-span-7 lg:pl-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="space-y-4 rounded-2xl border border-white/30 bg-white/20 p-5">
                <div className="flex items-start justify-between">
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <Skeleton className="h-3 w-3 rounded-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24 rounded-md" />
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel group relative w-full overflow-hidden rounded-3xl border border-white/60 p-1 shadow-2xl shadow-purple-500/5">
      {/* Artistic Background Mesh */}
      <div className="pointer-events-none absolute inset-0 opacity-40 transition-opacity duration-700 group-hover:opacity-50">
        <div
          className="absolute -left-[10%] -top-[50%] h-[200%] w-[50%] animate-pulse rounded-full bg-gradient-to-br from-purple-200/40 via-fuchsia-100/20 to-transparent blur-3xl"
          style={{ animationDuration: '8s' }}
        />
        <div
          className="absolute bottom-0 right-0 h-[80%] w-[30%] animate-pulse rounded-full bg-gradient-to-tl from-indigo-200/40 via-purple-100/20 to-transparent blur-3xl"
          style={{ animationDuration: '10s' }}
        />
      </div>

      <div className="relative z-10 grid grid-cols-1 gap-6 p-6 lg:grid-cols-12 lg:p-8">
        {/* Primary Stat: TVS */}
        <div className="flex flex-col justify-center border-b border-gray-100/50 pb-6 lg:col-span-5 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-xl bg-purple-50 p-2.5 text-purple-600 shadow-sm ring-1 ring-purple-100 transition-transform duration-300 group-hover:scale-110">
              <DollarSign size={24} />
            </div>
            <span className="text-sm font-bold uppercase tracking-wider text-gray-500">
              {t('oracle.stats.tvs')}
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <h2 className="bg-gradient-to-br from-purple-900 via-purple-700 to-indigo-800 bg-clip-text text-6xl font-black tracking-tight text-transparent drop-shadow-sm filter">
              {stats?.tvs ?? '—'}
            </h2>
            <span className="rounded-lg border border-emerald-100/50 bg-emerald-50 px-2.5 py-1 text-sm font-bold text-emerald-600">
              +2.4%
            </span>
          </div>
          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-gray-400">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
            </span>
            {t('oracle.stats.liveCap')}
          </p>
        </div>

        {/* Secondary Stats Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 lg:col-span-7 lg:pl-2">
          {/* Active Disputes */}
          <div className="group/card relative rounded-2xl border border-white/50 bg-white/40 p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/80 hover:shadow-lg hover:shadow-rose-500/10">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-lg bg-rose-50 p-2 text-rose-600 ring-1 ring-rose-100/50 transition-transform group-hover/card:scale-110">
                <AlertCircle size={20} />
              </div>
              {stats && stats.activeDisputes !== '0' && (
                <span className="flex h-2.5 w-2.5 animate-pulse rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
              )}
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                {t('oracle.stats.activeDisputes')}
              </span>
              <div className="text-3xl font-black text-gray-800 transition-colors group-hover/card:text-rose-600">
                {stats?.activeDisputes ?? '—'}
              </div>
            </div>
          </div>

          {/* Resolved 24h */}
          <div className="group/card relative rounded-2xl border border-white/50 bg-white/40 p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/80 hover:shadow-lg hover:shadow-emerald-500/10">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 ring-1 ring-emerald-100/50 transition-transform group-hover/card:scale-110">
                <CheckCircle2 size={20} />
              </div>
              <ArrowUpRight
                size={16}
                className="text-emerald-500 opacity-50 transition-opacity group-hover/card:opacity-100"
              />
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                {t('oracle.stats.resolved24h')}
              </span>
              <div className="text-3xl font-black text-gray-800 transition-colors group-hover/card:text-emerald-600">
                {stats?.resolved24h ?? '—'}
              </div>
            </div>
          </div>

          {/* Avg Resolution */}
          <div className="group/card relative rounded-2xl border border-white/50 bg-white/40 p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/80 hover:shadow-lg hover:shadow-blue-500/10">
            <div className="mb-4 flex items-center justify-between">
              <div className="rounded-lg bg-blue-50 p-2 text-blue-600 ring-1 ring-blue-100/50 transition-transform group-hover/card:scale-110">
                <Clock size={20} />
              </div>
            </div>
            <div className="space-y-1.5">
              <span className="text-xs font-bold uppercase tracking-wide text-gray-400">
                {t('oracle.stats.avgResolution')}
              </span>
              <div className="text-3xl font-black text-gray-800 transition-colors group-hover/card:text-blue-600">
                {stats?.avgResolution ?? '—'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
