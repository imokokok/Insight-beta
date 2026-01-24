"use client";

import { Input } from "@/components/ui/input";
import type { AlertRule } from "@/lib/oracleTypes";

interface RecipientInputProps {
  rule: AlertRule;
  onPatchRule: (id: string, patch: Partial<AlertRule>) => void;
  t: (key: string) => string;
}

export function RecipientInput({ rule, onPatchRule, t }: RecipientInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value.length > 200) return;
    onPatchRule(rule.id, { recipient: value });
  };

  return (
    <div className="md:col-span-12">
      <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
        {t("oracle.alerts.recipient")}
      </div>
      <Input
        value={rule.recipient ?? ""}
        onChange={handleChange}
        placeholder={t("oracle.alerts.recipientPlaceholder")}
        maxLength={200}
        className="h-10 rounded-xl bg-white/70 ring-1 ring-black/5 border-transparent focus-visible:ring-2 focus-visible:ring-purple-500/20"
      />
    </div>
  );
}
