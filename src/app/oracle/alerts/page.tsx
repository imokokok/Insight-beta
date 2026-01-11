"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  Bell,
  Save,
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { cn, fetchApiData, getErrorCode } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";
import type { AlertRule, AlertSeverity } from "@/lib/oracleTypes";

export default function AlertsPage() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [adminToken, setAdminToken] = useState("");
  const [localRules, setLocalRules] = useState<AlertRule[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const saved = window.sessionStorage.getItem("insight_admin_token");
    if (saved) setAdminToken(saved);
  }, []);

  const { data, error, isLoading, mutate } = useSWR<{ rules: AlertRule[] }>(
    "/api/oracle/alert-rules",
    fetchApiData
  );

  useEffect(() => {
    if (data?.rules) {
      setLocalRules(data.rules);
      setHasChanges(false);
    }
  }, [data]);

  const handleToggle = (id: string, enabled: boolean) => {
    setLocalRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled } : r))
    );
    setHasChanges(true);
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const headers: Record<string, string> = {
        "content-type": "application/json",
      };
      const trimmed = adminToken.trim();
      if (trimmed) headers["x-admin-token"] = trimmed;

      await fetchApiData("/api/oracle/alert-rules", {
        method: "PUT",
        headers,
        body: JSON.stringify({ rules: localRules }),
      });

      await mutate(); // Refresh SWR
      toast({
        title: t("oracle.alerts.success"),
        type: "success",
      });
      setHasChanges(false);
    } catch (e) {
      const code = getErrorCode(e);
      toast({
        title: t("oracle.alerts.error"),
        message:
          code === "forbidden" ? t("errors.forbidden") : t("errors.apiError"),
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const getSeverityIcon = (severity: AlertSeverity) => {
    switch (severity) {
      case "critical":
        return <ShieldAlert className="text-rose-500" size={18} />;
      case "warning":
        return <AlertTriangle className="text-amber-500" size={18} />;
      default:
        return <Info className="text-blue-500" size={18} />;
    }
  };

  const getSeverityLabel = (severity: AlertSeverity) => {
    switch (severity) {
      case "critical":
        return t("oracle.alerts.severities.critical");
      case "warning":
        return t("oracle.alerts.severities.warning");
      default:
        return t("oracle.alerts.severities.info");
    }
  };

  const getSeverityBg = (severity: AlertSeverity) => {
    switch (severity) {
      case "critical":
        return "bg-rose-50 text-rose-700 ring-rose-500/20";
      case "warning":
        return "bg-amber-50 text-amber-700 ring-amber-500/20";
      default:
        return "bg-blue-50 text-blue-700 ring-blue-500/20";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-20">
      <PageHeader
        title={t("oracle.alerts.title")}
        description={t("oracle.alerts.description")}
      />

      <main className="container mx-auto px-4 -mt-8 relative z-10 max-w-5xl">
        <div className="glass-card rounded-2xl p-6 md:p-8 border border-white/60 shadow-xl shadow-purple-500/5">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {t("oracle.alerts.title")}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {t("oracle.alerts.description")}
              </p>
            </div>

            <button
              onClick={saveConfig}
              disabled={!hasChanges || saving}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg",
                hasChanges && !saving
                  ? "bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:shadow-purple-500/25 hover:-translate-y-0.5"
                  : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
              )}
            >
              {saving ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <Save size={18} />
              )}
              <span>
                {saving ? t("oracle.alerts.saving") : t("oracle.alerts.save")}
              </span>
            </button>
          </div>

          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-24 bg-gray-50 animate-pulse rounded-xl"
                />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl border border-red-100">
              <AlertTriangle className="mx-auto mb-2" size={32} />
              <p>{t("errors.apiError")}</p>
            </div>
          ) : localRules.length === 0 ? (
            <div className="p-12 text-center text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              <Bell className="mx-auto mb-3 opacity-20" size={48} />
              <p>{t("oracle.alerts.noRules")}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {localRules.map((rule) => (
                <div
                  key={rule.id}
                  className={cn(
                    "group flex items-center justify-between p-5 rounded-xl border transition-all duration-300",
                    rule.enabled
                      ? "bg-white border-purple-100 shadow-sm hover:border-purple-200 hover:shadow-md hover:shadow-purple-500/5"
                      : "bg-gray-50/50 border-transparent opacity-75 grayscale-[0.5] hover:opacity-100"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "p-3 rounded-lg ring-1 ring-inset",
                        getSeverityBg(rule.severity)
                      )}
                    >
                      {getSeverityIcon(rule.severity)}
                    </div>

                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-bold text-gray-900">{rule.name}</h3>
                        <span
                          className={cn(
                            "text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ring-1 ring-inset",
                            getSeverityBg(rule.severity)
                          )}
                        >
                          {getSeverityLabel(rule.severity)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 font-mono">
                        ID: {rule.id} • Event: {rule.event}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right mr-2 hidden md:block">
                      <div
                        className={cn(
                          "text-xs font-bold mb-0.5",
                          rule.enabled ? "text-emerald-600" : "text-gray-400"
                        )}
                      >
                        {rule.enabled
                          ? t("oracle.alerts.enabled")
                          : t("oracle.alerts.disabled")}
                      </div>
                    </div>

                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked) =>
                        handleToggle(rule.id, checked)
                      }
                      className={cn(
                        "data-[state=checked]:bg-purple-600",
                        "h-7 w-12"
                      )}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!adminToken && (
            <div className="mt-8 p-4 bg-amber-50 text-amber-800 rounded-xl text-sm flex items-start gap-3">
              <Info className="shrink-0 mt-0.5" size={16} />
              <div>
                <p className="font-bold">{t("errors.forbidden")}</p>
                <p className="mt-1 opacity-80">{t("audit.adminTokenHint")}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
