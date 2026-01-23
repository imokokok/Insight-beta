"use client";

import { Input } from "@/components/ui/input";
import { AlertRule } from "@/lib/oracleTypes";

interface RecipientInputProps {
  rule: AlertRule;
  onPatchRule: (id: string, patch: Partial<AlertRule>) => void;
  t: (key: string) => string;
}

export function RecipientInput({ rule, onPatchRule, t }: RecipientInputProps) {
  return (
    <div className="md:col-span-12">
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
        {t("oracle.alerts.recipient")}
      </div>
      <Input
        value={rule.recipient ?? ""}
        onChange={(e) => onPatchRule(rule.id, { recipient: e.target.value })}
        placeholder={t("oracle.alerts.recipientPlaceholder")}
        className="h-10 rounded-xl bg-white/70 ring-1 ring-black/5 border-transparent focus-visible:ring-2 focus-visible:ring-purple-500/20"
      />
    </div>
  );
}
