"use client";

import { CheckCircle2, Clock, ShieldAlert, PlayCircle, Gavel } from "lucide-react";
import { formatTime } from "@/lib/utils";
import type { Assertion, Dispute } from "@/lib/oracleTypes";
import { useI18n } from "@/i18n/LanguageProvider";
import { langToLocale } from "@/i18n/translations";

export function AssertionTimeline({ assertion, dispute }: { assertion: Assertion; dispute: Dispute | null }) {
  const { lang, t } = useI18n();
  const locale = langToLocale[lang];

  const steps = [
    {
      id: "asserted",
      label: t("oracle.timeline.asserted"),
      date: assertion.assertedAt,
      icon: PlayCircle,
      active: true,
      color: "text-blue-600",
      bg: "bg-blue-100"
    }
  ];

  if (assertion.status === "Disputed" || dispute) {
    steps.push({
      id: "disputed",
      label: t("oracle.timeline.disputed"),
      date: dispute?.disputedAt || new Date().toISOString(), // Fallback if dispute object missing but status updated
      icon: ShieldAlert,
      active: true,
      color: "text-rose-600",
      bg: "bg-rose-100"
    });
    
    if (assertion.status === "Resolved") {
       steps.push({
        id: "resolved",
        label: t("oracle.timeline.resolved"),
        date: dispute?.votingEndsAt || new Date().toISOString(),
        icon: Gavel,
        active: true,
        color: "text-emerald-600",
        bg: "bg-emerald-100"
      });
    } else {
      // Voting in progress
      steps.push({
        id: "voting",
        label: t("oracle.timeline.votingEnds"),
        date: dispute?.votingEndsAt || assertion.livenessEndsAt,
        icon: Clock,
        active: false,
        color: "text-gray-400",
        bg: "bg-gray-100"
      });
    }

  } else if (assertion.status === "Resolved") {
    steps.push({
      id: "resolved",
      label: t("oracle.timeline.resolved"),
      date: assertion.livenessEndsAt, // If not disputed, resolved at liveness expiration
      icon: CheckCircle2,
      active: true,
      color: "text-emerald-600",
      bg: "bg-emerald-100"
    });
  } else {
    // Pending
     steps.push({
      id: "liveness",
      label: t("oracle.timeline.livenessEnds"),
      date: assertion.livenessEndsAt,
      icon: Clock,
      active: false,
      color: "text-gray-400",
      bg: "bg-gray-100"
    });
  }

  return (
    <div className="relative">
      <div className="absolute left-6 top-6 h-full w-0.5 -translate-x-1/2 bg-gray-200" />
      <div className="space-y-8">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="relative flex items-start gap-4">
              <div className={`relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4 border-white ${step.bg} ${step.color} shadow-sm`}>
                <Icon size={20} />
              </div>
              <div className="pt-2">
                <h4 className={`font-semibold ${step.active ? 'text-gray-900' : 'text-gray-500'}`}>{step.label}</h4>
                <p className="text-sm text-gray-500">{formatTime(step.date, locale)}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
