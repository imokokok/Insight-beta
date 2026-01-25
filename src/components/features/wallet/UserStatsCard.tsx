import { Trophy, ShieldAlert, Coins, Activity } from "lucide-react";
import { formatUsdCompact } from "@/lib/utils";
import { useI18n } from "@/i18n/LanguageProvider";
import { langToLocale } from "@/i18n/translations";
import type { UserStats } from "@/lib/types/oracleTypes";

interface UserStatsCardProps {
  stats: UserStats | null;
  loading: boolean;
}

export function UserStatsCard({ stats, loading }: UserStatsCardProps) {
  const { t, lang } = useI18n();
  const locale = langToLocale[lang];

  if (loading || !stats) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="glass-card p-4 rounded-2xl flex items-center gap-4 animate-pulse"
          >
            <div className="h-12 w-12 rounded-xl bg-gray-200/50" />
            <div className="space-y-2">
              <div className="h-3 w-20 bg-gray-200/50 rounded" />
              <div className="h-6 w-16 bg-gray-200/50 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const items = [
    {
      label: t("oracle.stats.totalAssertions"),
      value: stats.totalAssertions,
      icon: Activity,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: t("oracle.stats.totalDisputes"),
      value: stats.totalDisputes,
      icon: ShieldAlert,
      color: "text-rose-600",
      bg: "bg-rose-50",
    },
    {
      label: t("oracle.stats.totalBonded"),
      value: formatUsdCompact(stats.totalBondedUsd, locale),
      icon: Coins,
      color: "text-amber-600",
      bg: "bg-amber-50",
    },
    {
      label: t("oracle.stats.winRate"),
      value: `${stats.winRate}%`,
      icon: Trophy,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, i) => (
        <div
          key={i}
          className="glass-card p-4 rounded-2xl flex items-center gap-4 transition-all hover:scale-105"
        >
          <div className={`p-3 rounded-xl ${item.bg} ${item.color}`}>
            <item.icon size={20} />
          </div>
          <div>
            <div className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-0.5">
              {item.label}
            </div>
            <div className="text-xl font-bold text-gray-900">{item.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
