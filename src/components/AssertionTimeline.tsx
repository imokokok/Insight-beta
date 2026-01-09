"use client";

import { CheckCircle2, Clock, ShieldAlert, PlayCircle, Gavel } from "lucide-react";
import { formatTime, cn } from "@/lib/utils";
import type { Assertion, Dispute } from "@/lib/oracleTypes";
import { useI18n } from "@/i18n/LanguageProvider";
import { langToLocale } from "@/i18n/translations";
import { useMemo } from "react";

export function AssertionTimeline({ assertion, dispute }: { assertion: Assertion; dispute: Dispute | null }) {
  const { lang, t } = useI18n();
  const locale = langToLocale[lang];

  const steps = useMemo(() => {
    const stepsList = [
      {
        id: "asserted",
        label: t("oracle.timeline.asserted"),
        date: assertion.assertedAt,
        icon: PlayCircle,
        active: true,
        color: "text-blue-600",
        bg: "bg-blue-100",
        ring: "ring-blue-500/20"
      }
    ];

    if (assertion.status === "Disputed" || dispute) {
      stepsList.push({
        id: "disputed",
        label: t("oracle.timeline.disputed"),
        date: dispute?.disputedAt || new Date().toISOString(),
        icon: ShieldAlert,
        active: true,
        color: "text-rose-600",
        bg: "bg-rose-100",
        ring: "ring-rose-500/20"
      });
      
      if (assertion.status === "Resolved") {
         stepsList.push({
          id: "resolved",
          label: t("oracle.timeline.resolved"),
          date: dispute?.votingEndsAt || new Date().toISOString(),
          icon: Gavel,
          active: true,
          color: "text-emerald-600",
          bg: "bg-emerald-100",
          ring: "ring-emerald-500/20"
        });
      } else {
        // Voting in progress
        stepsList.push({
          id: "voting",
          label: t("oracle.timeline.votingEnds"),
          date: dispute?.votingEndsAt || assertion.livenessEndsAt,
          icon: Clock,
          active: false,
          color: "text-gray-400",
          bg: "bg-gray-100",
          ring: "ring-gray-200"
        });
      }

    } else if (assertion.status === "Resolved") {
      stepsList.push({
        id: "resolved",
        label: t("oracle.timeline.resolved"),
        date: assertion.resolvedAt || assertion.livenessEndsAt,
        icon: CheckCircle2,
        active: true,
        color: "text-emerald-600",
        bg: "bg-emerald-100",
        ring: "ring-emerald-500/20"
      });
    } else {
      // Pending
       stepsList.push({
        id: "liveness",
        label: t("oracle.timeline.livenessEnds"),
        date: assertion.livenessEndsAt,
        icon: Clock,
        active: false,
        color: "text-gray-400",
        bg: "bg-gray-100",
        ring: "ring-gray-200"
      });
    }
    return stepsList;
  }, [assertion, dispute, t]);

  return (
    <div className="relative pl-4">
      <div className="absolute left-10 top-10 bottom-10 w-0.5 bg-gradient-to-b from-purple-200/50 via-indigo-200/50 to-transparent" />
      <div className="space-y-8">
        {steps.map((step, index) => {
        const Icon = step.icon;
        
        return (
            <div 
              key={step.id} 
              className="relative flex items-start gap-6 group"
              style={{ animationDelay: `${index * 150}ms` }}
            >
              <div 
                className={cn(
                  "relative z-10 flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg ring-4 ring-white transition-all duration-300 group-hover:scale-110 group-hover:shadow-xl",
                  step.active 
                    ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-indigo-500/30" 
                    : "bg-white text-gray-400 shadow-gray-200/50"
                )}
              >
                <Icon size={20} strokeWidth={2.5} />
              </div>

              <div className="flex-1 pt-1">
                <div 
                  className={cn(
                    "glass-panel flex flex-col gap-1 rounded-2xl p-4 transition-all duration-300 hover:translate-x-1 hover:shadow-md",
                    step.active ? "border-purple-200/50 bg-white/60" : "bg-white/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className={cn(
                      "font-bold text-sm",
                      step.active ? "text-gray-800" : "text-gray-500"
                    )}>
                      {step.label}
                    </p>
                    {step.active && (
                      <span className="flex items-center gap-1 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-700">
                         <div className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse" />
                         {t("oracle.timeline.active")}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-gray-500 flex items-center gap-1.5">
                    <Clock size={12} className="opacity-70" />
                    {formatTime(step.date, locale)}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
