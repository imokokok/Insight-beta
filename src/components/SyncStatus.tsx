"use client";

import useSWR from "swr";
import { Activity, AlertCircle } from "lucide-react";
import { fetchApiData, cn, formatTime } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";
import { langToLocale } from "@/i18n/translations";

interface SyncResponse {
  chain: string;
  contractAddress: string;
  lastProcessedBlock: string;
  assertions: number;
  disputes: number;
  sync: {
    lastSyncedAt: string;
    lastAttemptAt: string;
    durationMs: number;
    error: string | null;
  };
}

export function SyncStatus() {
  const { lang, t } = useI18n();
  const locale = langToLocale[lang];

  const { data } = useSWR<SyncResponse>(
    "/api/oracle/sync",
    fetchApiData,
    { refreshInterval: 10000 }
  );

  if (!data) return null;

  const lastSynced = new Date(data.sync.lastSyncedAt).getTime();
  const now = Date.now();
  const diff = Number.isFinite(lastSynced) ? now - lastSynced : Number.POSITIVE_INFINITY;
  
  // Status logic
  let status: "ok" | "lagging" | "error" = "ok";
  if (data.sync.error) status = "error";
  else if (diff > 5 * 60 * 1000) status = "error"; // > 5 min
  else if (diff > 60 * 1000) status = "lagging"; // > 1 min

  return (
    <div className="group relative flex items-center gap-2 rounded-full bg-white/50 px-3 py-1.5 shadow-sm ring-1 ring-gray-200 backdrop-blur-sm transition-all hover:bg-white hover:shadow-md">
      <div className={cn(
        "relative flex h-2.5 w-2.5 items-center justify-center rounded-full",
        status === "ok" ? "bg-emerald-500" :
        status === "lagging" ? "bg-yellow-500" : "bg-red-500"
      )}>
        {status === "ok" && <div className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />}
      </div>
      
      <span className="text-xs font-medium text-gray-600">
        {status === "ok"
          ? t("oracle.sync.synced")
          : status === "lagging"
            ? t("oracle.sync.lagging")
            : t("oracle.sync.error")}
      </span>

      {/* Hover Card */}
      <div className="absolute right-0 top-full mt-2 hidden w-64 flex-col gap-2 rounded-xl bg-white p-4 shadow-xl ring-1 ring-gray-100 group-hover:flex z-50">
        <div className="flex items-center justify-between border-b border-gray-100 pb-2">
          <span className="font-semibold text-gray-900 text-sm">{t("oracle.sync.status")}</span>
          <Activity size={14} className="text-purple-500" />
        </div>
        
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>{t("oracle.sync.block")}</span>
            <span className="font-mono font-medium">{data.lastProcessedBlock}</span>
          </div>
          <div className="flex justify-between">
             <span>{t("oracle.sync.lastUpdate")}</span>
             <span>{formatTime(data.sync.lastSyncedAt, locale)}</span>
          </div>
          {data.sync.error && (
            <div className="mt-2 rounded bg-red-50 p-2 text-red-600 flex gap-1 items-start">
              <AlertCircle size={12} className="mt-0.5 shrink-0" />
              <span>{data.sync.error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
