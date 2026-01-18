"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ExternalLink,
  MessageSquare,
  ThumbsUp,
  ThumbsDown,
  Clock,
  ShieldAlert,
  Gavel,
  Search,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { calculatePercentage, cn, fetchApiData, formatTime } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";
import { getUiErrorMessage, langToLocale } from "@/i18n/translations";
import type { Dispute, DisputeStatus, OracleChain } from "@/lib/oracleTypes";

export default function DisputesPage() {
  const { t, lang } = useI18n();
  const locale = langToLocale[lang];
  const [items, setItems] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // const [refreshKey, setRefreshKey] = useState(0); // Removed unused state
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<DisputeStatus | "All">(
    "All",
  );
  const [filterChain, setFilterChain] = useState<OracleChain | "All">("All");
  const [query, setQuery] = useState("");

  const statusLabel = (status: DisputeStatus) => {
    if (status === "Voting") return t("status.voting");
    if (status === "Pending Execution") return t("status.pendingExecution");
    return t("status.executed");
  };

  const shortAddress = (value: string) => {
    if (!value) return "—";
    if (value.length <= 12) return value;
    return `${value.slice(0, 6)}...${value.slice(-4)}`;
  };

  const umaAssertionUrl = (dispute: Dispute) => {
    const id =
      dispute.assertionId ||
      (dispute.id.startsWith("D:") ? dispute.id.slice(2) : dispute.id);
    if (!id || !id.startsWith("0x")) return "https://oracle.uma.xyz/";
    return `https://oracle.uma.xyz/#/assertion/${id}`;
  };

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (filterStatus !== "All") params.set("status", filterStatus);
        if (filterChain !== "All") params.set("chain", filterChain);
        if (query.trim()) params.set("q", query.trim());
        params.set("limit", "30");
        const data = await fetchApiData<{
          items: Dispute[];
          total: number;
          nextCursor: number | null;
        }>(`/api/oracle/disputes?${params.toString()}`, {
          signal: controller.signal,
        });
        if (cancelled) return;
        setItems(data.items ?? []);
        setNextCursor(data.nextCursor ?? null);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "unknown_error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const timeout = window.setTimeout(load, 250);
    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [filterStatus, filterChain, query]);

  const loadMore = async () => {
    if (nextCursor === null) return;
    setLoadingMore(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "All") params.set("status", filterStatus);
      if (filterChain !== "All") params.set("chain", filterChain);
      if (query.trim()) params.set("q", query.trim());
      params.set("limit", "30");
      params.set("cursor", String(nextCursor));
      const data = await fetchApiData<{
        items: Dispute[];
        total: number;
        nextCursor: number | null;
      }>(`/api/oracle/disputes?${params.toString()}`);
      setItems((prev) => prev.concat(data.items ?? []));
      setNextCursor(data.nextCursor ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "unknown_error");
    } finally {
      setLoadingMore(false);
    }
  };

  const hasItems = useMemo(() => items.length > 0, [items.length]);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("disputes.title")}
        description={t("disputes.description")}
      >
        <div className="flex items-center gap-2 text-sm text-purple-700/60 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
          <Gavel size={16} />
          <span>{t("disputes.umaDvmActive")}</span>
        </div>
      </PageHeader>

      <div className="grid gap-6">
        {error && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50/50 p-4 text-sm text-rose-700 shadow-sm">
            {getUiErrorMessage(error, t)}
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0">
            {(["All", "Voting", "Pending Execution", "Executed"] as const).map(
              (status) => (
                <button
                  key={status}
                  onClick={() =>
                    setFilterStatus(status as DisputeStatus | "All")
                  }
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-sm font-medium transition-colors whitespace-nowrap",
                    filterStatus === status
                      ? "bg-purple-100 text-purple-900 ring-1 ring-purple-200"
                      : "text-purple-600/70 hover:bg-white/50 hover:text-purple-900",
                  )}
                >
                  {status === "All"
                    ? t("common.all")
                    : statusLabel(status as DisputeStatus)}
                </button>
              ),
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterChain}
              onChange={(e) =>
                setFilterChain(e.target.value as OracleChain | "All")
              }
              className="h-9 rounded-lg border-none bg-white/50 px-3 text-sm text-purple-900 shadow-sm focus:ring-2 focus:ring-purple-500/20"
            >
              <option value="All">{t("common.all")}</option>
              <option value="Local">{t("chain.local")}</option>
              <option value="Polygon">{t("chain.polygon")}</option>
              <option value="PolygonAmoy">{t("chain.polygon")} (Amoy)</option>
              <option value="Arbitrum">{t("chain.arbitrum")}</option>
              <option value="Optimism">{t("chain.optimism")}</option>
            </select>

            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-purple-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("oracle.searchPlaceholder")}
                className="h-9 w-full rounded-lg border-none bg-white/50 pl-9 pr-4 text-sm text-purple-900 shadow-sm placeholder:text-purple-300 focus:ring-2 focus:ring-purple-500/20 md:w-64"
              />
            </div>
          </div>
        </div>

        {loading && (
          <div className="rounded-2xl border border-purple-100 bg-white/50 p-6 text-sm text-purple-700/70 shadow-sm">
            {t("common.loading")}
          </div>
        )}

        {!loading &&
          items.map((dispute) => (
            <Card
              key={dispute.id}
              className="border-purple-100/60 bg-white/60 shadow-sm hover:shadow-md transition-all"
            >
              <CardHeader className="pb-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex gap-4">
                    <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600 shadow-sm">
                      <ShieldAlert size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-purple-950">
                          {dispute.id}
                        </h3>
                        <span
                          className={cn(
                            "px-2.5 py-0.5 rounded-full text-xs font-medium border",
                            dispute.status === "Voting"
                              ? "bg-amber-100 text-amber-700 border-amber-200"
                              : dispute.status === "Pending Execution"
                                ? "bg-purple-100 text-purple-700 border-purple-200"
                                : "bg-gray-100 text-gray-700 border-gray-200",
                          )}
                        >
                          {statusLabel(dispute.status)}
                        </span>
                        <span className="text-xs text-gray-400 font-medium px-2 py-0.5 bg-gray-50 rounded-md border border-gray-100">
                          {dispute.chain}
                        </span>
                      </div>
                      <p className="mt-1 text-base font-medium text-purple-900">
                        {dispute.market}
                      </p>
                    </div>
                  </div>

                  <a
                    href={umaAssertionUrl(dispute)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-medium text-purple-600 shadow-sm ring-1 ring-purple-100 transition-colors hover:bg-purple-50 hover:text-purple-700"
                  >
                    {t("disputes.viewOnUma")}
                    <ExternalLink size={14} />
                  </a>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-4 rounded-xl bg-purple-50/30 p-4 border border-purple-100/50">
                    <div>
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-purple-900/80 mb-2">
                        <MessageSquare size={16} className="text-purple-400" />
                        {t("disputes.reason")}
                      </h4>
                      <p className="text-sm text-purple-800/80 leading-relaxed">
                        {dispute.disputeReason}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-purple-100/50 pt-3 text-sm">
                      <div className="flex flex-col">
                        <span className="text-xs text-purple-400">
                          {t("disputes.disputer")}
                        </span>
                        <span className="font-mono text-purple-600">
                          {shortAddress(dispute.disputer)}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-xs text-purple-400">
                          {t("disputes.disputedAt")}
                        </span>
                        <span className="text-purple-700">
                          {formatTime(dispute.disputedAt, locale)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-purple-900/80">
                        <Gavel size={16} className="text-purple-400" />
                        {t("disputes.votingProgress")}
                      </h4>
                      <div className="flex items-center gap-1.5 text-xs text-purple-500 bg-purple-50 px-2 py-1 rounded-md">
                        <Clock size={12} />
                        {t("disputes.endsAt")}:{" "}
                        {formatTime(dispute.votingEndsAt, locale)}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="flex items-center gap-1 font-medium text-emerald-700">
                            <ThumbsUp size={12} /> {t("disputes.support")}
                          </span>
                          <span className="text-emerald-700 font-bold">
                            {calculatePercentage(
                              dispute.currentVotesFor,
                              dispute.totalVotes,
                            )}
                            %
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-emerald-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{
                              width: `${calculatePercentage(dispute.currentVotesFor, dispute.totalVotes)}%`,
                            }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1.5">
                          <span className="flex items-center gap-1 font-medium text-rose-700">
                            <ThumbsDown size={12} /> {t("disputes.reject")}
                          </span>
                          <span className="text-rose-700 font-bold">
                            {calculatePercentage(
                              dispute.currentVotesAgainst,
                              dispute.totalVotes,
                            )}
                            %
                          </span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-rose-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-rose-500 transition-all duration-500"
                            style={{
                              width: `${calculatePercentage(dispute.currentVotesAgainst, dispute.totalVotes)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-xs text-center text-purple-400 pt-2">
                      {t("disputes.totalVotesCast")}:{" "}
                      {new Intl.NumberFormat(locale).format(
                        dispute.currentVotesFor + dispute.currentVotesAgainst,
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

        {!loading && !hasItems && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="rounded-full bg-purple-50 p-4 mb-4">
              <AlertTriangle className="h-8 w-8 text-purple-300" />
            </div>
            <h3 className="text-lg font-medium text-purple-900">
              {t("disputes.emptyTitle")}
            </h3>
            <p className="text-sm text-purple-400 mt-1 max-w-sm">
              {t("disputes.emptyDesc")}
            </p>
          </div>
        )}

        {!loading && nextCursor !== null && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className={cn(
                "rounded-lg px-4 py-2 text-sm font-medium shadow-sm ring-1 ring-purple-100 transition-colors",
                loadingMore
                  ? "bg-white/50 text-purple-400"
                  : "bg-white text-purple-600 hover:bg-purple-50 hover:text-purple-700",
              )}
            >
              {loadingMore ? t("common.loading") : t("common.loadMore")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
