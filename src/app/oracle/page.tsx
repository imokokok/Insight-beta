"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpRight,
  Search,
  Settings2,
  ChevronDown,
  LayoutGrid,
  List,
  LayoutDashboard,
  Trophy,
  Wrench,
  RotateCw,
  User,
  Gavel,
} from "lucide-react";
import { OracleStatsBanner } from "@/components/features/oracle/OracleStatsBanner";
import { HowItWorks } from "@/components/features/common/HowItWorks";
import { PageHeader } from "@/components/features/common/PageHeader";
import {
  cn,
  fetchApiData,
  formatDurationMinutes,
  formatTime,
  formatUsdCompact,
  getErrorCode,
  getErrorDetails,
} from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";
import {
  getUiErrorMessage,
  langToLocale,
  type TranslationKey,
} from "@/i18n/translations";
import { useOracleData } from "@/hooks/oracle/useOracleData";
import { useDisputes } from "@/hooks/dispute/useDisputes";
import { useWallet } from "@/contexts/WalletContext";
import { ConnectWallet } from "@/components/features/wallet/ConnectWallet";
import { AssertionList } from "@/components/features/assertion/AssertionList";
import { DisputeList } from "@/components/features/dispute/DisputeList";
import { useToast } from "@/components/ui/toast";
import type {
  OracleConfig,
  OracleStatus,
  OracleStatusSnapshot,
  OracleInstance,
} from "@/lib/types/oracleTypes";

const CreateAssertionModal = dynamic(
  () =>
    import("@/components/features/assertion/CreateAssertionModal").then(
      (mod) => mod.CreateAssertionModal,
    ),
  { ssr: false },
);
const OracleCharts = dynamic(
  () =>
    import("@/components/features/oracle/OracleCharts").then(
      (mod) => mod.OracleCharts,
    ),
  {
    loading: () => (
      <div className="h-[400px] w-full bg-white/5 animate-pulse rounded-2xl" />
    ),
    ssr: false,
  },
);

const Leaderboard = dynamic(() =>
  import("@/components/features/oracle/Leaderboard").then(
    (mod) => mod.Leaderboard,
  ),
);

const PnLCalculator = dynamic(() =>
  import("@/components/features/common/PnLCalculator").then(
    (mod) => mod.PnLCalculator,
  ),
);

function parseOptionalNumber(value: string | null | undefined) {
  if (value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function minutesSince(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return null;
  const diffMs = Date.now() - d.getTime();
  if (!Number.isFinite(diffMs) || diffMs < 0) return null;
  return Math.floor(diffMs / 60_000);
}

type HealthState = {
  isLoading: boolean;
  score: number | null;
  labelText: string;
  accent: string;
  ring: string;
  lagBlocks: number | null;
  activeDisputes: number | null;
  lastSuccessMinutes: number | null;
  lastError: string | null;
  topRisks: Array<{ key: string; severity: "warning" | "critical" }>;
};

type OracleHealthPanelProps = {
  health: HealthState;
  lastProcessedBlock: number | null;
  lastSuccessAtText: string;
  lastSuccessAgoText: string | null;
  locale: string;
  t: (key: TranslationKey) => string;
};

function OracleHealthPanel({
  health,
  lastProcessedBlock,
  lastSuccessAtText,
  lastSuccessAgoText,
  locale,
  t,
}: OracleHealthPanelProps) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-75">
      <div className="glass-panel rounded-3xl border border-white/60 shadow-2xl shadow-purple-500/5 overflow-hidden">
        <div className="relative p-6 md:p-8">
          <div className="absolute inset-0 pointer-events-none opacity-40">
            <div
              className={cn(
                "absolute -right-[15%] -top-[40%] h-[200%] w-[50%] bg-gradient-to-br blur-3xl rounded-full",
                health.accent,
              )}
            />
            <div className="absolute left-0 bottom-0 h-[80%] w-[30%] bg-gradient-to-tl from-indigo-200/30 via-purple-100/20 to-transparent blur-3xl rounded-full" />
          </div>

          <div className="relative z-10 grid gap-6 lg:grid-cols-12">
            <div className="lg:col-span-5 flex items-center gap-6">
              <div
                className={cn(
                  "relative h-24 w-24 md:h-28 md:w-28 rounded-2xl bg-white/70 ring-1 shadow-sm flex items-center justify-center",
                  health.ring,
                )}
              >
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-black text-gray-900 tabular-nums">
                    {health.score ?? "—"}
                  </div>
                  <div className="text-[11px] font-bold uppercase tracking-wider text-gray-500">
                    {t("oracle.charts.syncHealth")}
                  </div>
                </div>
              </div>

              <div className="min-w-0">
                <div className="text-sm font-semibold text-gray-500">
                  {t("oracle.charts.syncHealth")}
                </div>
                <div className="text-2xl md:text-3xl font-black text-gray-900 leading-tight">
                  {health.labelText}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                  <div className="rounded-lg bg-white/60 px-3 py-1.5 ring-1 ring-black/5">
                    {t("oracle.sync.block")}:{" "}
                    <span className="font-mono font-semibold">
                      {typeof lastProcessedBlock === "number"
                        ? lastProcessedBlock.toLocaleString(locale)
                        : "—"}
                    </span>
                  </div>
                  <div className="rounded-lg bg-white/60 px-3 py-1.5 ring-1 ring-black/5">
                    {t("oracle.charts.syncLagBlocks")}:{" "}
                    <span className="font-mono font-semibold">
                      {typeof health.lagBlocks === "number"
                        ? health.lagBlocks.toLocaleString(locale)
                        : "—"}
                    </span>
                  </div>
                  <div className="rounded-lg bg-white/60 px-3 py-1.5 ring-1 ring-black/5">
                    {t("oracle.stats.activeDisputes")}:{" "}
                    <span className="font-mono font-semibold">
                      {typeof health.activeDisputes === "number"
                        ? health.activeDisputes
                        : "—"}
                    </span>
                  </div>
                  <div className="rounded-lg bg-white/60 px-3 py-1.5 ring-1 ring-black/5">
                    {t("oracle.sync.lastUpdate")}:{" "}
                    <span className="font-mono font-semibold">
                      {lastSuccessAtText}
                      {lastSuccessAgoText ? (
                        <span className="ml-1 text-gray-400">
                          ({lastSuccessAgoText})
                        </span>
                      ) : null}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-2xl bg-white/60 ring-1 ring-black/5 p-5 md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-bold text-gray-900">
                    {t("oracle.charts.syncHealth")}
                  </div>
                  <div className="text-xs text-gray-500">
                    {t("oracle.sync.lastUpdate")}: {lastSuccessAtText}
                  </div>
                </div>

                <div className="mt-4 grid gap-2">
                  {health.topRisks.length === 0 ? (
                    <div className="text-sm text-emerald-700 bg-emerald-50/60 border border-emerald-100 rounded-xl px-4 py-3">
                      {health.isLoading
                        ? t("common.loading")
                        : t("oracle.sync.synced")}
                    </div>
                  ) : (
                    health.topRisks.map((r, idx) => (
                      <div
                        key={`${r.key}-${idx}`}
                        className={cn(
                          "flex items-center justify-between gap-3 rounded-xl px-4 py-3 border",
                          r.severity === "critical"
                            ? "bg-rose-50/60 border-rose-100 text-rose-800"
                            : "bg-amber-50/60 border-amber-100 text-amber-800",
                        )}
                      >
                        <div className="min-w-0 text-sm font-semibold truncate">
                          {r.key}
                        </div>
                        <div
                          className={cn(
                            "shrink-0 text-[11px] font-black uppercase tracking-wider rounded-lg px-2 py-1",
                            r.severity === "critical"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700",
                          )}
                        >
                          {t(
                            r.severity === "critical"
                              ? "oracle.alerts.severities.critical"
                              : "oracle.alerts.severities.warning",
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  {health.lastError ? (
                    <div className="mt-2 text-xs text-gray-500">
                      {t("oracle.sync.error")}:{" "}
                      <span className="font-mono">{health.lastError}</span>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type OracleTabsProps = {
  activeTab: "overview" | "leaderboard" | "tools";
  onChange: (nextTab: "overview" | "leaderboard" | "tools") => void;
  t: (key: TranslationKey) => string;
};

function OracleTabs({ activeTab, onChange, t }: OracleTabsProps) {
  return (
    <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-200">
      <div className="glass-panel p-1.5 rounded-2xl flex items-center gap-1 shadow-lg shadow-purple-500/5 bg-white/40 backdrop-blur-xl border-white/60">
        <button
          onClick={() => onChange("overview")}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
            activeTab === "overview"
              ? "bg-white text-purple-700 shadow-md shadow-purple-500/10 ring-1 ring-black/5 scale-[1.02]"
              : "text-gray-500 hover:text-gray-900 hover:bg-white/40",
          )}
        >
          <LayoutDashboard
            size={18}
            className={cn(
              "transition-transform duration-300",
              activeTab === "overview"
                ? "scale-110 text-purple-600"
                : "text-gray-400",
            )}
          />
          {t("oracle.tabs.overview")}
        </button>
        <button
          onClick={() => onChange("leaderboard")}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
            activeTab === "leaderboard"
              ? "bg-white text-purple-700 shadow-md shadow-purple-500/10 ring-1 ring-black/5 scale-[1.02]"
              : "text-gray-500 hover:text-gray-900 hover:bg-white/40",
          )}
        >
          <Trophy
            size={18}
            className={cn(
              "transition-transform duration-300",
              activeTab === "leaderboard"
                ? "scale-110 text-amber-500"
                : "text-gray-400",
            )}
          />
          {t("oracle.tabs.leaderboard")}
        </button>
        <button
          onClick={() => onChange("tools")}
          className={cn(
            "flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300",
            activeTab === "tools"
              ? "bg-white text-purple-700 shadow-md shadow-purple-500/10 ring-1 ring-black/5 scale-[1.02]"
              : "text-gray-500 hover:text-gray-900 hover:bg-white/40",
          )}
        >
          <Wrench
            size={18}
            className={cn(
              "transition-transform duration-300",
              activeTab === "tools"
                ? "scale-110 text-slate-600"
                : "text-gray-400",
            )}
          />
          {t("oracle.tabs.tools")}
        </button>
      </div>
    </div>
  );
}

type OracleFiltersToolbarProps = {
  filterStatus: OracleStatus | "All";
  onFilterStatusChange: (status: OracleStatus | "All") => void;
  statusLabel: (status: OracleStatus | "All") => string;
  address: string | null | undefined;
  myActivity: boolean;
  myDisputes: boolean;
  onToggleMyActivity: () => void;
  onToggleMyDisputes: () => void;
  viewMode: "grid" | "list";
  onViewModeChange: (mode: "grid" | "list") => void;
  instances: OracleInstance[] | null;
  instanceId: string;
  onInstanceIdChange: (value: string) => void;
  filterChain: OracleConfig["chain"] | "All";
  onFilterChainChange: (value: OracleConfig["chain"] | "All") => void;
  query: string;
  onQueryChange: (value: string) => void;
  onClearFilters: () => void;
  t: (key: TranslationKey) => string;
};

function OracleFiltersToolbar({
  filterStatus,
  onFilterStatusChange,
  statusLabel,
  address,
  myActivity,
  myDisputes,
  onToggleMyActivity,
  onToggleMyDisputes,
  viewMode,
  onViewModeChange,
  instances,
  instanceId,
  onInstanceIdChange,
  filterChain,
  onFilterChainChange,
  query,
  onQueryChange,
  onClearFilters,
  t,
}: OracleFiltersToolbarProps) {
  const showClear =
    filterStatus !== "All" ||
    filterChain !== "All" ||
    query.trim() ||
    myActivity ||
    myDisputes;

  return (
    <div className="glass-panel sticky top-4 z-20 rounded-2xl p-3 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between shadow-xl shadow-purple-900/5 backdrop-blur-xl border-white/60">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1 sm:p-0 no-scrollbar">
          {["All", "Pending", "Disputed", "Resolved"].map((status) => (
            <button
              key={status}
              onClick={() =>
                onFilterStatusChange(status as OracleStatus | "All")
              }
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-bold transition-all whitespace-nowrap flex items-center gap-2",
                filterStatus === status
                  ? "bg-white shadow-md shadow-purple-500/10 ring-1 ring-black/5 scale-105"
                  : "text-gray-500 hover:bg-white/40 hover:text-gray-900",
                filterStatus === status &&
                  status === "Pending" &&
                  "text-blue-600 ring-blue-100",
                filterStatus === status &&
                  status === "Disputed" &&
                  "text-rose-600 ring-rose-100",
                filterStatus === status &&
                  status === "Resolved" &&
                  "text-emerald-600 ring-emerald-100",
                filterStatus === status &&
                  status === "All" &&
                  "text-purple-700 ring-purple-100",
              )}
            >
              {status === "Pending" && (
                <div
                  className={cn(
                    "w-2 h-2 rounded-full bg-blue-500",
                    filterStatus !== status && "opacity-50",
                  )}
                />
              )}
              {status === "Disputed" && (
                <div
                  className={cn(
                    "w-2 h-2 rounded-full bg-rose-500",
                    filterStatus !== status && "opacity-50",
                  )}
                />
              )}
              {status === "Resolved" && (
                <div
                  className={cn(
                    "w-2 h-2 rounded-full bg-emerald-500",
                    filterStatus !== status && "opacity-50",
                  )}
                />
              )}
              {status === "All" && (
                <div
                  className={cn(
                    "w-2 h-2 rounded-full bg-purple-500",
                    filterStatus !== status && "opacity-50",
                  )}
                />
              )}
              {statusLabel(status as OracleStatus | "All")}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 md:gap-3">
          {address && (
            <div className="flex w-full gap-2 md:hidden">
              <button
                onClick={onToggleMyActivity}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all border",
                  myActivity
                    ? "bg-purple-100 text-purple-700 border-purple-200 shadow-inner"
                    : "bg-white/50 text-gray-500 border-transparent hover:bg-white hover:text-gray-900",
                )}
              >
                <User size={14} />
                {t("oracle.myActivity")}
              </button>
              <button
                onClick={onToggleMyDisputes}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition-all border",
                  myDisputes
                    ? "bg-rose-100 text-rose-700 border-rose-200 shadow-inner"
                    : "bg-white/50 text-gray-500 border-transparent hover:bg-white hover:text-gray-900",
                )}
              >
                <Gavel size={14} />
                {t("oracle.myDisputesFilter")}
              </button>
            </div>
          )}

          {address && (
            <>
              <button
                onClick={onToggleMyActivity}
                className={cn(
                  "hidden md:flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all border",
                  myActivity
                    ? "bg-purple-100 text-purple-700 border-purple-200 shadow-inner"
                    : "bg-white/50 text-gray-500 border-transparent hover:bg-white hover:text-gray-900",
                )}
                title={t("oracle.myActivityTooltip")}
              >
                <User size={16} />
                {t("oracle.myActivity")}
              </button>
              <button
                onClick={onToggleMyDisputes}
                className={cn(
                  "hidden md:flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all border",
                  myDisputes
                    ? "bg-rose-100 text-rose-700 border-rose-200 shadow-inner"
                    : "bg-white/50 text-gray-500 border-transparent hover:bg-white hover:text-gray-900",
                )}
                title={t("oracle.myDisputesTooltip")}
              >
                <Gavel size={16} />
                {t("oracle.myDisputesFilter")}
              </button>
            </>
          )}

          <div className="flex bg-gray-100/50 p-1 rounded-xl md:hidden">
            <button
              onClick={() => onViewModeChange("grid")}
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
              onClick={() => onViewModeChange("list")}
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

          <div className="hidden md:flex bg-gray-100/50 p-1 rounded-xl">
            <button
              onClick={() => onViewModeChange("grid")}
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
              onClick={() => onViewModeChange("list")}
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

          {instances && instances.length > 0 ? (
            <div className="relative w-full md:hidden">
              <select
                value={instanceId}
                onChange={(e) => onInstanceIdChange(e.target.value)}
                className="glass-input h-9 w-full rounded-xl border-none pl-3 pr-8 text-sm font-medium text-gray-600 hover:bg-white/80 focus:ring-2 focus:ring-purple-500/20 cursor-pointer appearance-none"
              >
                {instances.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                size={14}
              />
            </div>
          ) : null}

          <div className="relative w-full md:hidden">
            <select
              value={filterChain}
              onChange={(e) =>
                onFilterChainChange(
                  e.target.value as OracleConfig["chain"] | "All",
                )
              }
              className="glass-input h-9 w-full rounded-xl border-none pl-3 pr-8 text-sm font-medium text-gray-600 hover:bg-white/80 focus:ring-2 focus:ring-purple-500/20 cursor-pointer appearance-none"
            >
              <option value="All">{t("common.all")}</option>
              <option value="Local">{t("chain.local")}</option>
              <option value="Polygon">{t("chain.polygon")}</option>
              <option value="PolygonAmoy">{t("chain.polygon")} (Amoy)</option>
              <option value="Arbitrum">{t("chain.arbitrum")}</option>
              <option value="Optimism">{t("chain.optimism")}</option>
            </select>
            <ChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={14}
            />
          </div>

          {instances && instances.length > 0 ? (
            <>
              <div className="relative hidden md:block">
                <select
                  value={instanceId}
                  onChange={(e) => onInstanceIdChange(e.target.value)}
                  className="glass-input h-9 rounded-xl border-none pl-3 pr-8 text-sm font-medium text-gray-600 hover:bg-white/80 focus:ring-2 focus:ring-purple-500/20 cursor-pointer appearance-none"
                >
                  {instances.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  size={14}
                />
              </div>

              <div className="h-4 w-px bg-gray-200 hidden md:block"></div>
            </>
          ) : null}

          <div className="relative hidden md:block">
            <select
              value={filterChain}
              onChange={(e) =>
                onFilterChainChange(
                  e.target.value as OracleConfig["chain"] | "All",
                )
              }
              className="glass-input h-9 rounded-xl border-none pl-3 pr-8 text-sm font-medium text-gray-600 hover:bg-white/80 focus:ring-2 focus:ring-purple-500/20 cursor-pointer appearance-none"
            >
              <option value="All">{t("common.all")}</option>
              <option value="Local">{t("chain.local")}</option>
              <option value="Polygon">{t("chain.polygon")}</option>
              <option value="PolygonAmoy">{t("chain.polygon")} (Amoy)</option>
              <option value="Arbitrum">{t("chain.arbitrum")}</option>
              <option value="Optimism">{t("chain.optimism")}</option>
            </select>
            <ChevronDown
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
              size={14}
            />
          </div>

          <div className="h-4 w-px bg-gray-200 hidden md:block"></div>

          <div className="relative w-full md:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t("oracle.searchPlaceholder")}
              value={query}
              onChange={(e) => onQueryChange(e.target.value)}
              className="glass-input h-9 w-full rounded-xl pl-9 pr-4 text-sm text-gray-900 placeholder:text-gray-400 focus:ring-2 focus:ring-purple-500/20 md:w-64"
            />
          </div>

          {showClear && (
            <button
              type="button"
              onClick={onClearFilters}
              className="h-9 rounded-xl bg-white px-3 text-sm font-semibold text-purple-700 shadow-sm ring-1 ring-purple-100 hover:bg-purple-50"
            >
              {t("audit.clear")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function OraclePage() {
  const { toast } = useToast();
  const { address } = useWallet();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentSearch = searchParams?.toString() ?? "";
  const instanceIdFromUrl = searchParams?.get("instanceId")?.trim() || "";

  const [filterStatus, setFilterStatus] = useState<OracleStatus | "All">(() => {
    try {
      if (typeof window === "undefined") return "All";
      const saved = window.localStorage.getItem("oracleFilters");
      if (!saved) return "All";
      const parsed = JSON.parse(saved) as { status?: unknown } | null;
      const status =
        parsed && typeof parsed === "object" ? parsed.status : null;
      if (
        status === "Pending" ||
        status === "Disputed" ||
        status === "Resolved" ||
        status === "All"
      )
        return status;
    } catch {
      return "All";
    }
    return "All";
  });

  const [filterChain, setFilterChain] = useState<OracleConfig["chain"] | "All">(
    () => {
      try {
        if (typeof window === "undefined") return "All";
        const saved = window.localStorage.getItem("oracleFilters");
        if (!saved) return "All";
        const parsed = JSON.parse(saved) as { chain?: unknown } | null;
        const chain =
          parsed && typeof parsed === "object" ? parsed.chain : null;
        if (
          chain === "Polygon" ||
          chain === "PolygonAmoy" ||
          chain === "Arbitrum" ||
          chain === "Optimism" ||
          chain === "Local" ||
          chain === "All"
        )
          return chain;
      } catch {
        return "All";
      }
      return "All";
    },
  );
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
  const [instances, setInstances] = useState<OracleInstance[] | null>(null);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showConfig, setShowConfig] = useState(false);
  const [myActivity, setMyActivity] = useState(false);
  const [myDisputes, setMyDisputes] = useState(false);
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
    let cancelled = false;
    const controller = new AbortController();
    fetchApiData<{ instances: OracleInstance[] }>("/api/oracle/instances", {
      signal: controller.signal,
    })
      .then((r) => {
        if (!cancelled) setInstances(r.instances);
      })
      .catch(() => {
        if (!cancelled) setInstances(null);
      });
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  // 保存筛选偏好到 localStorage
  useEffect(() => {
    try {
      // 使用 try-catch 处理 localStorage 访问
      localStorage.setItem(
        "oracleFilters",
        JSON.stringify({
          status: filterStatus,
          chain: filterChain,
          instanceId,
          viewMode,
        }),
      );
    } catch {
      // 如果 localStorage 不可用，忽略错误
    }
  }, [filterStatus, filterChain, instanceId, viewMode]);

  const {
    items,
    stats,
    loading,
    loadingMore,
    error,
    loadMore,
    hasMore,
    refresh,
  } = useOracleData(
    filterStatus,
    filterChain,
    debouncedQuery,
    myActivity ? address : undefined,
    instanceId,
  );

  const {
    items: disputeItems,
    loading: disputesLoading,
    loadingMore: disputesLoadingMore,
    hasMore: disputesHasMore,
    loadMore: disputesLoadMore,
  } = useDisputes(
    "All",
    filterChain,
    debouncedQuery,
    myDisputes ? address : undefined,
    instanceId,
  );

  const [status, setStatus] = useState<{
    config: OracleConfig;
    state: OracleStatusSnapshot;
  } | null>(null);
  const [config, setConfig] = useState<OracleConfig>({
    rpcUrl: "",
    contractAddress: "",
    chain: "Local",
    startBlock: 0,
    maxBlockRange: 10000,
    votingPeriodHours: 72,
  });
  const [adminToken, setAdminToken] = useState("");
  const [adminActor, setAdminActor] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [configFieldErrors, setConfigFieldErrors] = useState<
    Partial<Record<keyof OracleConfig, string>>
  >({});
  const [activeTab, setActiveTab] = useState<
    "overview" | "leaderboard" | "tools"
  >("overview");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const { t, lang } = useI18n();
  const locale = langToLocale[lang];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.sessionStorage.getItem("insight_admin_token");
    if (saved) setAdminToken(saved);
    const savedActor = window.sessionStorage.getItem("insight_admin_actor");
    if (savedActor) setAdminActor(savedActor);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const trimmed = adminToken.trim();
    if (trimmed) window.sessionStorage.setItem("insight_admin_token", trimmed);
    else window.sessionStorage.removeItem("insight_admin_token");
  }, [adminToken]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const trimmed = adminActor.trim();
    if (trimmed) window.sessionStorage.setItem("insight_admin_actor", trimmed);
    else window.sessionStorage.removeItem("insight_admin_actor");
  }, [adminActor]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadStatus = async () => {
      try {
        const headers: Record<string, string> = {};
        const trimmed = adminToken.trim();
        if (trimmed) headers["x-admin-token"] = trimmed;
        const actor = adminActor.trim();
        if (actor) headers["x-admin-actor"] = actor;
        const normalizedInstanceId = instanceId.trim();
        const statusUrl = normalizedInstanceId
          ? `/api/oracle/status?instanceId=${encodeURIComponent(normalizedInstanceId)}`
          : "/api/oracle/status";
        const data = await fetchApiData<{
          config: OracleConfig;
          state: OracleStatusSnapshot;
        }>(statusUrl, {
          headers,
          signal: controller.signal,
        });
        if (cancelled) return;
        setStatus(data);
        setConfig(data.config);
      } catch {
        if (!cancelled) setStatus(null);
      }
    };

    loadStatus();

    let id: number | undefined;
    if (showConfig) {
      id = window.setInterval(loadStatus, 15_000);
    }

    return () => {
      cancelled = true;
      controller.abort();
      if (id !== undefined) {
        window.clearInterval(id);
      }
    };
  }, [adminToken, adminActor, instanceId, showConfig]);

  const saveConfig = async () => {
    setSaving(true);
    setConfigError(null);
    setConfigFieldErrors({});
    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      const trimmed = adminToken.trim();
      if (trimmed) headers["x-admin-token"] = trimmed;
      const actor = adminActor.trim();
      if (actor) headers["x-admin-actor"] = actor;
      const normalizedInstanceId = instanceId.trim();
      const configUrl = normalizedInstanceId
        ? `/api/oracle/config?instanceId=${encodeURIComponent(normalizedInstanceId)}`
        : "/api/oracle/config";
      const data = await fetchApiData<OracleConfig>(configUrl, {
        method: "PUT",
        headers,
        body: JSON.stringify(config),
      });
      setConfig(data);
      setStatus((prev) => (prev ? { ...prev, config: data } : prev));
      setShowConfig(false);
      toast({
        title: t("common.success"),
        message: "Configuration saved successfully",
        type: "success",
      });
    } catch (e) {
      const code = getErrorCode(e);
      setConfigError(code);
      const details = getErrorDetails(e);
      const field =
        details && typeof details === "object" && "field" in details
          ? (details as { field?: unknown }).field
          : undefined;
      if (typeof field === "string") {
        setConfigFieldErrors({ [field as keyof OracleConfig]: code });
      }
    } finally {
      setSaving(false);
    }
  };

  const syncNow = async () => {
    setSyncing(true);
    setConfigError(null);
    try {
      const headers: Record<string, string> = {};
      const trimmed = adminToken.trim();
      if (trimmed) headers["x-admin-token"] = trimmed;
      const actor = adminActor.trim();
      if (actor) headers["x-admin-actor"] = actor;
      const normalizedInstanceId = instanceId.trim();
      const syncUrl = normalizedInstanceId
        ? `/api/oracle/sync?instanceId=${encodeURIComponent(normalizedInstanceId)}`
        : "/api/oracle/sync";
      await fetchApiData<
        { updated: boolean } | { updated: boolean; chain: unknown }
      >(syncUrl, {
        method: "POST",
        headers,
      });
      refresh();
      const statusUrl = normalizedInstanceId
        ? `/api/oracle/status?instanceId=${encodeURIComponent(normalizedInstanceId)}`
        : "/api/oracle/status";
      const data = await fetchApiData<{
        config: OracleConfig;
        state: OracleStatusSnapshot;
      }>(statusUrl);
      setStatus(data);
    } catch (e) {
      const code = getErrorCode(e);
      setConfigError(code);
    } finally {
      setSyncing(false);
    }
  };

  const shortAddress = (value: string) => {
    if (!value) return "—";
    if (value.length <= 12) return value;
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  };

  const ownerTypeLabel = (value: boolean | null | undefined) => {
    if (value === true) return t("oracle.config.ownerTypeContract");
    if (value === false) return t("oracle.config.ownerTypeEoa");
    return t("oracle.config.ownerTypeUnknown");
  };

  const statusLabel = (status: OracleStatus | "All") => {
    if (status === "All") return t("common.all");
    if (status === "Pending") return t("common.pending");
    if (status === "Disputed") return t("common.disputed");
    return t("common.resolved");
  };

  const formattedStats = useMemo(() => {
    if (!stats) return null;
    return {
      tvs: formatUsdCompact(stats.tvsUsd, locale),
      activeDisputes: String(stats.activeDisputes),
      resolved24h: String(stats.resolved24h),
      avgResolution: formatDurationMinutes(stats.avgResolutionMinutes),
    };
  }, [locale, stats]);

  const health = useMemo(() => {
    const isLoadingHealth = loading && !status;
    if (isLoadingHealth) {
      return {
        isLoading: true,
        score: null as number | null,
        labelText: t("common.loading"),
        accent: "from-purple-500 to-indigo-500",
        ring: "ring-purple-200",
        lagBlocks: null as number | null,
        activeDisputes: null as number | null,
        lastSuccessMinutes: null as number | null,
        lastError: null as string | null,
        topRisks: [] as { key: string; severity: "warning" | "critical" }[],
      };
    }

    const snapshot = status?.state ?? null;
    const activeDisputes = stats?.activeDisputes ?? null;

    const lagBlocks = parseOptionalNumber(snapshot?.lagBlocks);
    const consecutiveFailures = snapshot?.consecutiveFailures ?? null;
    const lastSuccessMinutes = minutesSince(
      snapshot?.sync?.lastSuccessAt ?? null,
    );
    const lastError = snapshot?.sync?.lastError ?? null;
    const hasContract = Boolean(snapshot?.contractAddress);

    let score = 100;

    if (!hasContract) score -= 25;
    if (lastError) score -= 30;
    if (typeof consecutiveFailures === "number" && consecutiveFailures >= 3)
      score -= 20;

    if (typeof activeDisputes === "number" && activeDisputes > 0) {
      score -= Math.min(30, activeDisputes * 5);
    }

    if (typeof lagBlocks === "number") {
      if (lagBlocks >= 1000) score -= 30;
      else if (lagBlocks >= 200) score -= 15;
      else if (lagBlocks >= 50) score -= 5;
    }

    if (typeof lastSuccessMinutes === "number") {
      if (lastSuccessMinutes >= 120) score -= 30;
      else if (lastSuccessMinutes >= 30) score -= 15;
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    const label = score >= 85 ? "good" : score >= 65 ? "watch" : "risk";
    const labelText =
      label === "good"
        ? t("oracle.sync.synced")
        : label === "watch"
          ? t("oracle.sync.lagging")
          : t("oracle.sync.error");
    const accent =
      label === "good"
        ? "from-emerald-500 to-teal-500"
        : label === "watch"
          ? "from-amber-500 to-orange-500"
          : "from-rose-500 to-red-500";
    const ring =
      label === "good"
        ? "ring-emerald-200"
        : label === "watch"
          ? "ring-amber-200"
          : "ring-rose-200";

    const risks: { key: string; severity: "warning" | "critical" }[] = [];
    if (!hasContract)
      risks.push({ key: t("errors.missingConfig"), severity: "critical" });
    if (lastError)
      risks.push({ key: t("errors.syncFailed"), severity: "critical" });
    if (typeof consecutiveFailures === "number" && consecutiveFailures >= 3)
      risks.push({
        key: `${t("oracle.config.rpcActive")}: ${t("oracle.sync.error")}`,
        severity: "warning",
      });
    if (typeof lagBlocks === "number" && lagBlocks >= 200)
      risks.push({
        key: `${t("oracle.charts.syncLagBlocks")}: ${lagBlocks.toLocaleString()}`,
        severity: lagBlocks >= 1000 ? "critical" : "warning",
      });
    if (typeof activeDisputes === "number" && activeDisputes > 0)
      risks.push({
        key: `${t("oracle.stats.activeDisputes")}: ${activeDisputes}`,
        severity: activeDisputes >= 3 ? "critical" : "warning",
      });
    if (typeof lastSuccessMinutes === "number" && lastSuccessMinutes >= 30)
      risks.push({
        key: `${t("oracle.sync.lastUpdate")}: ${lastSuccessMinutes}m`,
        severity: lastSuccessMinutes >= 120 ? "critical" : "warning",
      });

    const topRisks = risks.slice(0, 4);

    return {
      isLoading: false,
      score,
      labelText,
      accent,
      ring,
      lagBlocks,
      activeDisputes,
      lastSuccessMinutes,
      lastError,
      topRisks,
    };
  }, [loading, stats, status, t]);

  const lastSuccessAt = status?.state?.sync?.lastSuccessAt ?? null;
  const lastSuccessAtText = lastSuccessAt
    ? formatTime(lastSuccessAt, locale)
    : "—";
  const lastSuccessAgoText =
    typeof health.lastSuccessMinutes === "number"
      ? `${health.lastSuccessMinutes}m`
      : null;
  const lastProcessedBlock = parseOptionalNumber(
    status?.state?.lastProcessedBlock,
  );

  const handleToggleMyActivity = () => {
    setMyActivity(!myActivity);
    if (!myActivity) setMyDisputes(false);
  };

  const handleToggleMyDisputes = () => {
    setMyDisputes(!myDisputes);
    if (!myDisputes) setMyActivity(false);
  };

  const handleClearFilters = () => {
    setFilterStatus("All");
    setFilterChain("All");
    setQuery("");
    setMyActivity(false);
    setMyDisputes(false);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <PageHeader
        title={t("oracle.title")}
        description={t("oracle.description")}
      >
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <ConnectWallet />
          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-all"
          >
            <ArrowUpRight size={18} />
            {t("oracle.newAssertion")}
          </button>
        </div>
      </PageHeader>

      <OracleHealthPanel
        health={health}
        lastProcessedBlock={lastProcessedBlock}
        lastSuccessAtText={lastSuccessAtText}
        lastSuccessAgoText={lastSuccessAgoText}
        locale={locale}
        t={t}
      />

      <div className="animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
        <OracleStatsBanner stats={formattedStats} loading={loading} />
      </div>

      <OracleTabs activeTab={activeTab} onChange={setActiveTab} t={t} />

      {activeTab === "overview" ? (
        <div className="space-y-8">
          <HowItWorks />
          <OracleCharts instanceId={instanceId} />

          <div className="flex flex-col gap-6">
            {/* Configuration Toggle */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowConfig(!showConfig)}
                className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-purple-600 transition-colors"
              >
                <Settings2 size={16} />
                {t("oracle.config.title")}
                <ChevronDown
                  size={14}
                  className={cn(
                    "transition-transform",
                    showConfig && "rotate-180",
                  )}
                />
              </button>
            </div>

            {/* Config Panel */}
            {showConfig && (
              <div className="glass-panel rounded-2xl p-6 animate-in slide-in-from-top-4 fade-in duration-300">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {t("oracle.config.title")}
                  </h3>
                  <button
                    onClick={syncNow}
                    disabled={syncing}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                      syncing
                        ? "bg-gray-100 text-gray-400"
                        : "bg-purple-50 text-purple-600 hover:bg-purple-100",
                    )}
                  >
                    <RotateCw
                      size={14}
                      className={syncing ? "animate-spin" : ""}
                    />
                    {t("oracle.config.syncNow")}
                  </button>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t("oracle.config.rpcUrl")}
                    </label>
                    <input
                      value={config.rpcUrl}
                      onChange={(e) => {
                        setConfigError(null);
                        setConfigFieldErrors((prev) => ({
                          ...prev,
                          rpcUrl: undefined,
                        }));
                        setConfig((c) => ({ ...c, rpcUrl: e.target.value }));
                      }}
                      placeholder="https://…"
                      className={cn(
                        "glass-input h-10 w-full rounded-xl px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20",
                        configFieldErrors.rpcUrl &&
                          "ring-2 ring-rose-500/20 focus:ring-rose-500/20",
                      )}
                    />
                    {configFieldErrors.rpcUrl && (
                      <div className="text-xs text-rose-600">
                        {getUiErrorMessage(configFieldErrors.rpcUrl, t)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t("oracle.config.contractAddress")}
                    </label>
                    <input
                      value={config.contractAddress}
                      onChange={(e) => {
                        setConfigError(null);
                        setConfigFieldErrors((prev) => ({
                          ...prev,
                          contractAddress: undefined,
                        }));
                        setConfig((c) => ({
                          ...c,
                          contractAddress: e.target.value,
                        }));
                      }}
                      placeholder="0x…"
                      className={cn(
                        "glass-input h-10 w-full rounded-xl px-4 font-mono text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20",
                        configFieldErrors.contractAddress &&
                          "ring-2 ring-rose-500/20 focus:ring-rose-500/20",
                      )}
                    />
                    {configFieldErrors.contractAddress && (
                      <div className="text-xs text-rose-600">
                        {getUiErrorMessage(
                          configFieldErrors.contractAddress,
                          t,
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t("oracle.config.chain")}
                    </label>
                    <div className="relative">
                      <select
                        value={config.chain}
                        onChange={(e) => {
                          setConfigError(null);
                          setConfigFieldErrors((prev) => ({
                            ...prev,
                            chain: undefined,
                          }));
                          setConfig((c) => ({
                            ...c,
                            chain: e.target.value as OracleConfig["chain"],
                          }));
                        }}
                        className={cn(
                          "glass-input h-10 w-full appearance-none rounded-xl px-4 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20",
                          configFieldErrors.chain &&
                            "ring-2 ring-rose-500/20 focus:ring-rose-500/20",
                        )}
                      >
                        <option value="Local">{t("chain.local")}</option>
                        <option value="Polygon">{t("chain.polygon")}</option>
                        <option value="PolygonAmoy">
                          {t("chain.polygon")} (Amoy)
                        </option>
                        <option value="Arbitrum">{t("chain.arbitrum")}</option>
                        <option value="Optimism">{t("chain.optimism")}</option>
                      </select>
                      <ChevronDown
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                        size={16}
                      />
                    </div>
                    {configFieldErrors.chain && (
                      <div className="text-xs text-rose-600">
                        {getUiErrorMessage(configFieldErrors.chain, t)}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-3">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t("oracle.config.startBlock")}
                    </label>
                    <input
                      value={config.startBlock ?? 0}
                      onChange={(e) => {
                        setConfigError(null);
                        setConfigFieldErrors((prev) => ({
                          ...prev,
                          startBlock: undefined,
                        }));
                        setConfig((c) => ({
                          ...c,
                          startBlock: Number(e.target.value),
                        }));
                      }}
                      placeholder="0"
                      type="number"
                      min={0}
                      step={1}
                      className={cn(
                        "glass-input h-10 w-full rounded-xl px-4 font-mono text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20",
                        configFieldErrors.startBlock &&
                          "ring-2 ring-rose-500/20 focus:ring-rose-500/20",
                      )}
                    />
                    {configFieldErrors.startBlock && (
                      <div className="text-xs text-rose-600">
                        {getUiErrorMessage(configFieldErrors.startBlock, t)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t("oracle.config.maxBlockRange")}
                    </label>
                    <input
                      value={config.maxBlockRange ?? 10000}
                      onChange={(e) => {
                        setConfigError(null);
                        setConfigFieldErrors((prev) => ({
                          ...prev,
                          maxBlockRange: undefined,
                        }));
                        setConfig((c) => ({
                          ...c,
                          maxBlockRange: Number(e.target.value),
                        }));
                      }}
                      placeholder="10000"
                      type="number"
                      min={100}
                      step={100}
                      className={cn(
                        "glass-input h-10 w-full rounded-xl px-4 font-mono text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20",
                        configFieldErrors.maxBlockRange &&
                          "ring-2 ring-rose-500/20 focus:ring-rose-500/20",
                      )}
                    />
                    {configFieldErrors.maxBlockRange && (
                      <div className="text-xs text-rose-600">
                        {getUiErrorMessage(configFieldErrors.maxBlockRange, t)}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t("oracle.config.votingPeriodHours")}
                    </label>
                    <input
                      value={config.votingPeriodHours ?? 72}
                      onChange={(e) => {
                        setConfigError(null);
                        setConfigFieldErrors((prev) => ({
                          ...prev,
                          votingPeriodHours: undefined,
                        }));
                        setConfig((c) => ({
                          ...c,
                          votingPeriodHours: Number(e.target.value),
                        }));
                      }}
                      placeholder="72"
                      type="number"
                      min={1}
                      step={1}
                      className={cn(
                        "glass-input h-10 w-full rounded-xl px-4 font-mono text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20",
                        configFieldErrors.votingPeriodHours &&
                          "ring-2 ring-rose-500/20 focus:ring-rose-500/20",
                      )}
                    />
                    {configFieldErrors.votingPeriodHours && (
                      <div className="text-xs text-rose-600">
                        {getUiErrorMessage(
                          configFieldErrors.votingPeriodHours,
                          t,
                        )}
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      {t("oracle.config.confirmationBlocks")}
                    </label>
                    <input
                      value={config.confirmationBlocks ?? 12}
                      onChange={(e) => {
                        setConfigError(null);
                        setConfigFieldErrors((prev) => ({
                          ...prev,
                          confirmationBlocks: undefined,
                        }));
                        setConfig((c) => ({
                          ...c,
                          confirmationBlocks: Number(e.target.value),
                        }));
                      }}
                      placeholder="12"
                      type="number"
                      min={0}
                      step={1}
                      className={cn(
                        "glass-input h-10 w-full rounded-xl px-4 font-mono text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20",
                        configFieldErrors.confirmationBlocks &&
                          "ring-2 ring-rose-500/20 focus:ring-rose-500/20",
                      )}
                    />
                    {configFieldErrors.confirmationBlocks && (
                      <div className="text-xs text-rose-600">
                        {getUiErrorMessage(
                          configFieldErrors.confirmationBlocks,
                          t,
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-6 space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t("oracle.config.adminToken")}
                  </label>
                  <input
                    value={adminToken}
                    onChange={(e) => setAdminToken(e.target.value)}
                    placeholder="Bearer …"
                    type="password"
                    autoComplete="off"
                    className="glass-input h-10 w-full rounded-xl px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div className="mt-4 space-y-2">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {t("oracle.config.adminActor")}
                  </label>
                  <input
                    value={adminActor}
                    onChange={(e) => setAdminActor(e.target.value)}
                    placeholder={t("oracle.config.adminActorPlaceholder")}
                    className="glass-input h-10 w-full rounded-xl px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                  />
                </div>

                <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-t border-gray-100 pt-6">
                  <div className="flex flex-wrap items-center gap-3 text-xs">
                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span>
                      {t("oracle.config.lastBlock")}:{" "}
                      <span className="font-mono font-medium">
                        {status ? status.state.lastProcessedBlock : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                      {t("oracle.config.latestBlock")}:{" "}
                      <span className="font-mono font-medium">
                        {status?.state.latestBlock ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                      {t("oracle.config.safeBlock")}:{" "}
                      <span className="font-mono font-medium">
                        {status?.state.safeBlock ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-gray-600">
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          status?.state.lagBlocks &&
                            Number(status.state.lagBlocks) > 0
                            ? "bg-amber-500"
                            : "bg-emerald-500",
                        )}
                      ></span>
                      {t("oracle.config.lagBlocks")}:{" "}
                      <span className="font-mono font-medium">
                        {status?.state.lagBlocks ?? "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-gray-600">
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          (status?.state.consecutiveFailures ?? 0) > 0
                            ? "bg-rose-500"
                            : "bg-emerald-500",
                        )}
                      ></span>
                      {t("oracle.config.consecutiveFailures")}:{" "}
                      <span className="font-mono font-medium">
                        {String(status?.state.consecutiveFailures ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                      {t("oracle.config.rpcActive")}:{" "}
                      <span className="font-mono font-medium">
                        {status?.state.rpcActiveUrl
                          ? shortAddress(status.state.rpcActiveUrl)
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-gray-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                      {t("oracle.config.owner")}:{" "}
                      <span className="font-mono font-medium">
                        {status?.state.owner
                          ? shortAddress(status.state.owner)
                          : "—"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-gray-600">
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          status?.state.ownerIsContract === true
                            ? "bg-emerald-500"
                            : status?.state.ownerIsContract === false
                              ? "bg-slate-400"
                              : "bg-gray-300",
                        )}
                      ></span>
                      {t("oracle.config.ownerType")}:{" "}
                      <span className="font-mono font-medium">
                        {ownerTypeLabel(status?.state.ownerIsContract)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 px-3 py-1.5 text-gray-600">
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          status?.state.syncing
                            ? "bg-blue-500 animate-pulse"
                            : "bg-emerald-500",
                        )}
                      ></span>
                      {status?.state.syncing
                        ? t("oracle.config.syncing")
                        : status?.state.sync?.lastSuccessAt
                          ? formatTime(status.state.sync.lastSuccessAt, locale)
                          : "—"}
                    </div>
                  </div>

                  <button
                    onClick={saveConfig}
                    disabled={saving}
                    className={cn(
                      "rounded-xl px-6 py-2 text-sm font-medium transition-all shadow-sm",
                      saving
                        ? "bg-gray-100 text-gray-400"
                        : "bg-purple-600 text-white hover:bg-purple-700 hover:shadow-purple-500/25",
                    )}
                  >
                    {t("oracle.config.save")}
                  </button>
                </div>

                {configError && (
                  <div className="mt-4 p-3 rounded-xl bg-rose-50 text-xs text-rose-600 border border-rose-100">
                    {getUiErrorMessage(configError, t)}
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="glass-panel rounded-2xl border-l-4 border-l-rose-500 p-4 text-sm text-rose-700">
                {getUiErrorMessage(error, t)}
              </div>
            )}

            <OracleFiltersToolbar
              filterStatus={filterStatus}
              onFilterStatusChange={setFilterStatus}
              statusLabel={statusLabel}
              address={address}
              myActivity={myActivity}
              myDisputes={myDisputes}
              onToggleMyActivity={handleToggleMyActivity}
              onToggleMyDisputes={handleToggleMyDisputes}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              instances={instances}
              instanceId={instanceId}
              onInstanceIdChange={setInstanceId}
              filterChain={filterChain}
              onFilterChainChange={setFilterChain}
              query={query}
              onQueryChange={setQuery}
              onClearFilters={handleClearFilters}
              t={t}
            />

            {/* Assertion / Dispute List */}
            {myDisputes ? (
              <DisputeList
                items={disputeItems}
                loading={disputesLoading}
                viewMode={viewMode}
                hasMore={disputesHasMore}
                loadMore={disputesLoadMore}
                loadingMore={disputesLoadingMore}
                emptyStateMessage={t("oracle.myDisputesEmpty")}
                onExplore={() => setMyDisputes(false)}
                instanceId={instanceId}
              />
            ) : (
              <AssertionList
                items={items}
                loading={loading}
                viewMode={viewMode}
                hasMore={hasMore}
                loadMore={loadMore}
                loadingMore={loadingMore}
                emptyStateMessage={
                  myActivity
                    ? t("oracle.myActivityEmpty")
                    : loading
                      ? undefined
                      : t("oracle.leaderboard.noData")
                }
                onCreateAssertion={
                  myActivity ? () => setIsCreateModalOpen(true) : undefined
                }
                instanceId={instanceId}
              />
            )}
          </div>
        </div>
      ) : activeTab === "leaderboard" ? (
        <Leaderboard instanceId={instanceId} />
      ) : (
        <div className="mt-8 max-w-2xl mx-auto">
          <PnLCalculator />
        </div>
      )}

      <CreateAssertionModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        contractAddress={config.contractAddress}
        chain={config.chain}
        instanceId={instanceId}
        onSuccess={refresh}
      />
    </div>
  );
}
