"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn, fetchApiData, formatTime, getErrorCode } from "@/lib/utils";
import type { AuditLogEntry } from "@/lib/oracleTypes";
import { useI18n } from "@/i18n/LanguageProvider";
import { langToLocale } from "@/i18n/translations";
import { ScrollText, RotateCw } from "lucide-react";

type AuditListResponse = {
  items: AuditLogEntry[];
  total: number;
  nextCursor: number | null;
};

export function AuditLogViewer({
  adminToken,
  setAdminToken
}: {
  adminToken: string;
  setAdminToken: (value: string) => void;
}) {
  const { t, lang } = useI18n();
  const locale = langToLocale[lang];

  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [nextCursor, setNextCursor] = useState<number | null>(0);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canLoadMore = nextCursor !== null;

  const headers = useMemo(() => {
    const h: Record<string, string> = {};
    const trimmed = adminToken.trim();
    if (trimmed) h["x-admin-token"] = trimmed;
    return h;
  }, [adminToken]);

  const load = useMemo(() => {
    return async (cursor: number, replace: boolean) => {
      const isFirst = replace;
      if (isFirst) setLoading(true);
      else setLoadingMore(true);
      setError(null);
      try {
        const data = await fetchApiData<AuditListResponse>(`/api/oracle/audit?limit=50&cursor=${cursor}`, {
          headers
        });
        setTotal(data.total);
        setNextCursor(data.nextCursor);
        setItems((prev) => (replace ? data.items : [...prev, ...data.items]));
      } catch (e) {
        setError(getErrorCode(e));
      } finally {
        if (isFirst) setLoading(false);
        else setLoadingMore(false);
      }
    };
  }, [headers]);

  useEffect(() => {
    setItems([]);
    setTotal(0);
    setNextCursor(0);
    setError(null);
    if (!adminToken.trim()) return;
    void load(0, true);
  }, [adminToken, load]);

  return (
    <Card className="overflow-hidden border-none shadow-xl bg-white/80 backdrop-blur-md">
      <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-900 text-white p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-white/15 rounded-lg backdrop-blur-sm">
            <ScrollText className="h-6 w-6 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">{t("audit.title")}</CardTitle>
            <CardDescription className="text-slate-200">{t("audit.description")}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {t("audit.adminToken")}
          </label>
          <input
            value={adminToken}
            onChange={(e) => setAdminToken(e.target.value)}
            placeholder={t("audit.adminTokenPlaceholder")}
            type="password"
            autoComplete="off"
            className="glass-input h-10 w-full rounded-xl px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-slate-500/20"
          />
          <div className="text-xs text-slate-500">{t("audit.adminTokenHint")}</div>
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-slate-700">
            {t("audit.total")}: <span className="font-mono">{total}</span>
          </div>
          <button
            type="button"
            onClick={() => load(0, true)}
            disabled={loading || !adminToken.trim()}
            className={cn(
              "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all shadow-sm",
              loading || !adminToken.trim()
                ? "bg-gray-100 text-gray-400"
                : "bg-slate-900 text-white hover:bg-slate-800"
            )}
          >
            <RotateCw size={16} className={loading ? "animate-spin" : ""} />
            {t("audit.refresh")}
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 text-xs text-rose-600 border border-rose-100">
            {t("audit.error")}: <span className="font-mono">{error}</span>
          </div>
        )}

        {!error && !loading && items.length === 0 && adminToken.trim() && (
          <div className="text-sm text-slate-500">{t("audit.empty")}</div>
        )}

        <div className="space-y-3">
          {items.map((entry) => (
            <div
              key={entry.id}
              className="rounded-2xl border border-white/60 bg-white/60 backdrop-blur-sm shadow-sm p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      {entry.action}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">#{entry.id}</span>
                  </div>
                  <div className="mt-1 text-sm font-medium text-slate-800">
                    {(entry.entityType || "—") + ":"}{" "}
                    <span className="font-mono break-all">{entry.entityId || "—"}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {t("audit.actor")}:{" "}
                    <span className="font-mono">{entry.actor || "—"}</span>
                  </div>
                </div>
                <div className="text-xs text-slate-500 font-mono">
                  {formatTime(entry.createdAt, locale)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {adminToken.trim() && (
          <div className="flex justify-center pt-2">
            {canLoadMore ? (
              <button
                type="button"
                onClick={() => load(nextCursor ?? 0, false)}
                disabled={loadingMore}
                className="group flex items-center gap-2 rounded-full bg-white px-8 py-3 text-sm font-bold text-slate-800 shadow-lg shadow-slate-500/10 ring-1 ring-slate-100 transition-all hover:bg-slate-50 hover:shadow-xl hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
              >
                <RotateCw size={18} className={loadingMore ? "animate-spin" : "opacity-60"} />
                <span>{loadingMore ? t("common.loading") : t("common.loadMore")}</span>
              </button>
            ) : (
              <div className="text-sm font-medium text-slate-400 py-4">{t("common.allLoaded")}</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
