"use client";

import { cn } from "@/lib/utils";
import type { AlertRule } from "@/lib/types/oracleTypes";
import type { Channel } from "./AlertRulesManager";
import { AlertRuleHeader } from "./AlertRuleHeader";
import { AlertRuleBasicFields } from "./AlertRuleBasicFields";
import { ChannelSwitches } from "./ChannelSwitches";
import { RecipientInput } from "@/components/features/common/RecipientInput";
import { EventParamsInputs } from "@/components/features/assertion/EventParamsInputs";
import { CommonParamsInputs } from "@/components/features/assertion/CommonParamsInputs";

interface AlertRuleCardProps {
  rule: AlertRule;
  channels: Channel[];
  ruleError: string | null;
  isTesting: boolean;
  canAdmin: boolean;
  onToggle: (id: string, enabled: boolean) => void;
  onPatchRule: (id: string, patch: Partial<AlertRule>) => Promise<void>;
  onPatchRuleParams: (id: string, patch: Record<string, unknown>) => void;
  onToggleChannel: (id: string, channel: Channel, enabled: boolean) => void;
  onTest: (ruleId: string) => void;
  t: (key: string) => string;
}

export function AlertRuleCard({
  rule,
  channels,
  ruleError,
  isTesting,
  canAdmin,
  onToggle,
  onPatchRule,
  onPatchRuleParams,
  onToggleChannel,
  onTest,
  t,
}: AlertRuleCardProps) {
  return (
    <div
      className={cn(
        "group p-5 rounded-xl border transition-all duration-300",
        rule.enabled
          ? "bg-white border-purple-100 shadow-sm hover:border-purple-200 hover:shadow-md hover:shadow-purple-500/5"
          : "bg-gray-50/50 border-transparent opacity-75 grayscale-[0.5] hover:opacity-100",
      )}
    >
      <AlertRuleHeader
        rule={rule}
        isTesting={isTesting}
        canAdmin={canAdmin}
        ruleError={ruleError}
        onToggle={onToggle}
        onTest={onTest}
        t={t}
      />

      <div className="mt-5 grid gap-4 md:grid-cols-12">
        {rule.enabled && ruleError ? (
          <div className="md:col-span-12 text-sm text-rose-600 font-semibold">
            {ruleError}
          </div>
        ) : null}

        <AlertRuleBasicFields rule={rule} onPatchRule={onPatchRule} t={t} />

        <ChannelSwitches
          ruleId={rule.id}
          channels={channels}
          onToggleChannel={onToggleChannel}
          t={t}
        />

        {channels.includes("email") && (
          <RecipientInput rule={rule} onPatchRule={onPatchRule} t={t} />
        )}

        <EventParamsInputs
          rule={rule}
          onPatchRuleParams={onPatchRuleParams}
          t={t}
        />

        <CommonParamsInputs
          rule={rule}
          onPatchRuleParams={onPatchRuleParams}
          t={t}
        />
      </div>
    </div>
  );
}
