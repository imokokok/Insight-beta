"use client";

import { Input } from "@/components/ui/input";
import type { AlertRule, AlertSeverity } from "@/lib/oracleTypes";

interface AlertRuleBasicFieldsProps {
  rule: AlertRule;
  onPatchRule: (id: string, patch: Partial<AlertRule>) => void;
  t: (key: string) => string;
}

export function AlertRuleBasicFields({
  rule,
  onPatchRule,
  t,
}: AlertRuleBasicFieldsProps) {
  return (
    <>
      <div className="md:col-span-4">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          {t("oracle.alerts.severity")}
        </div>
        <select
          value={rule.severity}
          onChange={(e) =>
            onPatchRule(rule.id, { severity: e.target.value as AlertSeverity })
          }
          className="h-10 w-full rounded-xl px-3 text-sm bg-white/70 ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
        >
          <option value="info">{t("oracle.alerts.severities.info")}</option>
          <option value="warning">
            {t("oracle.alerts.severities.warning")}
          </option>
          <option value="critical">
            {t("oracle.alerts.severities.critical")}
          </option>
        </select>
      </div>

      <div className="md:col-span-4">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          {t("oracle.alerts.owner")}
        </div>
        <Input
          value={rule.owner ?? ""}
          onChange={(e) =>
            onPatchRule(rule.id, { owner: e.target.value.slice(0, 80) })
          }
          placeholder={t("oracle.alerts.ownerPlaceholder")}
          maxLength={80}
          className="h-10 rounded-xl bg-white/70 ring-1 ring-black/5 border-transparent focus-visible:ring-2 focus-visible:ring-purple-500/20"
        />
      </div>

      <div className="md:col-span-4">
        <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          {t("oracle.alerts.runbook")}
        </div>
        <Input
          value={rule.runbook ?? ""}
          onChange={(e) =>
            onPatchRule(rule.id, { runbook: e.target.value.slice(0, 500) })
          }
          placeholder={t("oracle.alerts.runbookPlaceholder")}
          maxLength={500}
          className="h-10 rounded-xl bg-white/70 ring-1 ring-black/5 border-transparent focus-visible:ring-2 focus-visible:ring-purple-500/20"
        />
      </div>
    </>
  );
}
